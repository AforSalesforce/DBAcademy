import type { TableDefinition } from '@/db-engines/types';

/**
 * Turn a raw SQLite / PostgreSQL / NoSQL error into a hint a beginner can
 * act on. Returns null when there's nothing useful to add.
 */

/** Edit distance where swapping two adjacent letters ("nmae") counts as one edit. */
function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/** The closest known name, if it's plausibly a typo. */
export function closestName(name: string, candidates: string[]): string | null {
  const target = name.toLowerCase();
  let best: string | null = null;
  let bestDistance = Infinity;
  for (const c of new Set(candidates)) {
    const d = editDistance(target, c.toLowerCase());
    if (d < bestDistance) { best = c; bestDistance = d; }
  }
  const allowed = Math.max(1, Math.floor(target.length / 3));
  return best !== null && bestDistance > 0 && bestDistance <= allowed ? best : null;
}

const NOSQL_METHODS = ['find', 'findOne', 'insertOne', 'insertMany', 'count', 'remove', 'aggregate'];

export function explainError(message: string, context: { engine: string; tables?: TableDefinition[] }): string | null {
  const tables = context.tables ?? [];
  const tableNames = tables.map(t => t.name);
  const columnNames = tables.flatMap(t => t.columns.map(c => c.name));
  const tableList = tableNames.length ? ` Tables here: ${tableNames.join(', ')}.` : '';
  let m: RegExpMatchArray | null;

  // ── Unknown names ───────────────────────────────────────────────────────
  if ((m = message.match(/no such column: ([\w.]+)/i) ?? message.match(/column "([^"]+)" does not exist/i))) {
    const full = m[1];
    const bare = full.includes('.') ? full.split('.').pop()! : full;
    if (/\s/.test(full) || /^[A-Z]/.test(full)) {
      return `"${full}" was read as a column name. For text values, use single quotes: '${full}'.`;
    }
    const suggestion = closestName(bare, columnNames);
    if (suggestion) return `There's no column called "${bare}". Did you mean "${suggestion}"?`;
    return `There's no column called "${bare}" in the tables you're querying. Open the Tables panel to see each table's columns.`;
  }
  if ((m = message.match(/no such table: ([\w.]+)/i) ?? message.match(/relation "([^"]+)" does not exist/i))) {
    const suggestion = closestName(m[1], tableNames);
    if (suggestion) return `There's no table called "${m[1]}". Did you mean "${suggestion}"?`;
    return `There's no table called "${m[1]}".${tableList}`;
  }
  if ((m = message.match(/ambiguous column name: ([\w.]+)/i) ?? message.match(/column reference "([^"]+)" is ambiguous/i))) {
    return `"${m[1]}" exists in more than one of your joined tables. Put the table alias in front, e.g. p.${m[1]}.`;
  }

  // ── Grouping and aggregates ─────────────────────────────────────────────
  if (/misuse of aggregate|aggregate functions are not allowed in WHERE/i.test(message)) {
    return 'WHERE filters rows before they are grouped, so it can\'t use COUNT, SUM and friends. Filter groups with HAVING instead: … GROUP BY city HAVING COUNT(*) > 1.';
  }
  if ((m = message.match(/column "([^"]+)" must appear in the GROUP BY clause/i))) {
    return `With GROUP BY, every selected column must be grouped or aggregated. Add ${m[1]} to the GROUP BY list, or wrap it in an aggregate like MAX(${m[1]}).`;
  }

  // ── Syntax ──────────────────────────────────────────────────────────────
  if (/incomplete input|syntax error at end of input/i.test(message)) {
    return 'The query ended too early. Check for an unclosed bracket or quote, or a clause with nothing after it (like WHERE on its own).';
  }
  if (/unrecognized token: "'|unterminated quoted string/i.test(message)) {
    return "A text value is missing its closing quote. Every ' needs a partner.";
  }
  if ((m = message.match(/near "([^"]*)": syntax error/i) ?? message.match(/syntax error at or near "([^"]*)"/i))) {
    return `The database got confused just before "${m[1]}". Look for a missing comma between columns, a missing quote, or a misspelled keyword there.`;
  }

  // ── Constraints ─────────────────────────────────────────────────────────
  if ((m = message.match(/table "?(\w+)"? already exists/i) ?? message.match(/relation "(\w+)" already exists/i))) {
    return `A table called ${m[1]} already exists. Start your script with DROP TABLE IF EXISTS ${m[1]}; or use CREATE TABLE IF NOT EXISTS.`;
  }
  if ((m = message.match(/NOT NULL constraint failed: [\w]+\.(\w+)/i) ?? message.match(/null value in column "(\w+)"/i))) {
    return `The column ${m[1]} is required (NOT NULL), but the row you inserted left it empty.`;
  }
  if (/UNIQUE constraint failed|duplicate key value/i.test(message)) {
    return 'That value must be unique, and a row with it already exists. Use a different value, or leave out the id to have one chosen for you.';
  }
  if (/FOREIGN KEY constraint failed|violates foreign key constraint/i.test(message)) {
    return 'That row points at (or is pointed at by) a row in another table. A foreign key only allows ids that exist on the other side.';
  }
  if ((m = message.match(/(\d+) values for (\d+) columns/i))) {
    return `You gave ${m[1]} values but listed ${m[2]} columns. Each row in VALUES needs exactly one value per column.`;
  }

  // ── NoSQL ───────────────────────────────────────────────────────────────
  if (context.engine === 'nosql') {
    if ((m = message.match(/\.(\w+) is not a function/))) {
      const suggestion = closestName(m[1], NOSQL_METHODS);
      return suggestion
        ? `There's no method called ${m[1]}. Did you mean ${suggestion}?`
        : `There's no method called ${m[1]}. Collections support: ${NOSQL_METHODS.join(', ')}.`;
    }
    if ((m = message.match(/^(\w+) is not defined/))) {
      return `"${m[1]}" isn't defined. Queries start with db and a collection, like db.users.find({}).`;
    }
    if (/Syntax Error/i.test(message)) {
      return 'The script isn\'t valid JavaScript. Check that every { has a }, every ( has a ), and fields are separated by commas.';
    }
  }

  return null;
}
