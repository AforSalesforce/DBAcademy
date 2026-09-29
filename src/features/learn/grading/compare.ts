import type { QueryResult } from '@/db-engines/types';

/**
 * Compare a learner's query result with the expected one.
 *
 * Deliberately forgiving about things that don't change the answer:
 * column names (aliases), column order, and row order (unless the task is
 * about sorting). Strict about the data itself.
 */

export interface CompareOptions {
  /** Rows must come back in the same order. */
  orderMatters?: boolean;
  /** Learner may return any subset of the expected columns, matched by name. */
  allowColumnSubset?: boolean;
  /** Results are documents (NoSQL): compare whole documents, ignoring _id. */
  documents?: boolean;
}

export type Verdict =
  | { kind: 'match'; note?: 'column-order' }
  | { kind: 'no-columns' }
  | { kind: 'column-count'; expected: number; actual: number; expectedColumns: string[] }
  | { kind: 'unknown-column'; column: string; expectedColumns: string[] }
  | { kind: 'row-count'; expected: number; actual: number }
  | { kind: 'order' }
  | { kind: 'values'; columns: string[]; missing: string[][]; extra: string[][] };

type Cell = string | null;

interface Table {
  columns: string[];
  rows: Cell[][];
}

const MAX_SHOWN_ROWS = 3;
const MAX_PERMUTED_COLUMNS = 8;

/** One canonical text form per value, so 6, 6.0 and 6n all compare equal. */
export function normalizeValue(value: unknown): Cell {
  if (value === null || value === undefined) return null;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return String(value);
    return String(Number(value.toFixed(6)));
  }
  if (typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Uint8Array) return `<${value.length} bytes>`;
  if (typeof value === 'object') return stableJson(value);
  return String(value);
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const entries = Object.keys(value as Record<string, unknown>)
      .sort()
      .map(k => `${JSON.stringify(k)}:${stableJson((value as Record<string, unknown>)[k])}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(normalizeValue(value));
}

function toTable(result: QueryResult, documents: boolean): Table {
  if (documents) {
    // A whole document is one "cell"; _id is random for inserted docs.
    return {
      columns: ['document'],
      rows: result.rows.map(row => {
        if (row === null || typeof row !== 'object') return [normalizeValue(row)];
        const rest = Object.fromEntries(Object.entries(row as Record<string, unknown>).filter(([k]) => k !== '_id'));
        return [stableJson(rest)];
      }),
    };
  }
  const columns = result.columns.length > 0 ? result.columns : Object.keys(result.rows[0] ?? {});
  return {
    columns,
    rows: result.rows.map(row => columns.map(c => normalizeValue((row as Record<string, unknown>)[c]))),
  };
}

const rowKey = (row: Cell[]) => JSON.stringify(row);

/** Count of each distinct row. */
function tally(rows: Cell[][]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(rowKey(r), (counts.get(rowKey(r)) ?? 0) + 1);
  return counts;
}

function sameMultiset(a: Cell[][], b: Cell[][]): boolean {
  if (a.length !== b.length) return false;
  const ta = tally(a);
  const tb = tally(b);
  if (ta.size !== tb.size) return false;
  for (const [k, n] of ta) if (tb.get(k) !== n) return false;
  return true;
}

function sameSequence(a: Cell[][], b: Cell[][]): boolean {
  return a.length === b.length && a.every((r, i) => rowKey(r) === rowKey(b[i]));
}

/** Rows in `a` that `b` lacks (respecting duplicates). */
function difference(a: Cell[][], b: Cell[][]): Cell[][] {
  const remaining = tally(b);
  const out: Cell[][] = [];
  for (const r of a) {
    const k = rowKey(r);
    const n = remaining.get(k) ?? 0;
    if (n > 0) remaining.set(k, n - 1);
    else out.push(r);
  }
  return out;
}

const display = (row: Cell[]) => row.map(v => (v === null ? 'NULL' : v));

/**
 * Find a column order for `actual` that makes it equal `expected`.
 * Columns are only paired when they hold the same set of values, which
 * keeps the search tiny in practice.
 */
function findColumnOrder(expected: Table, actual: Table, orderMatters: boolean): number[] | null {
  const n = expected.columns.length;
  if (n > MAX_PERMUTED_COLUMNS) return null;
  const signature = (t: Table, c: number) => JSON.stringify(t.rows.map(r => r[c]).sort());
  const expSig = expected.columns.map((_, c) => signature(expected, c));
  const actSig = actual.columns.map((_, c) => signature(actual, c));
  const order: number[] = [];
  const used = new Set<number>();

  const search = (i: number): boolean => {
    if (i === n) {
      const reordered = actual.rows.map(r => order.map(c => r[c]));
      return orderMatters ? sameSequence(expected.rows, reordered) : sameMultiset(expected.rows, reordered);
    }
    for (let c = 0; c < n; c++) {
      if (used.has(c) || actSig[c] !== expSig[i]) continue;
      used.add(c); order.push(c);
      if (search(i + 1)) return true;
      used.delete(c); order.pop();
    }
    return false;
  };
  return search(0) ? order : null;
}

export function compareResults(expectedResult: QueryResult, actualResult: QueryResult, options: CompareOptions = {}): Verdict {
  const { orderMatters = false, allowColumnSubset = false, documents = false } = options;
  let expected = toTable(expectedResult, documents);
  const actual = toTable(actualResult, documents);

  if (actual.columns.length === 0 && expected.columns.length > 0) return { kind: 'no-columns' };

  if (allowColumnSubset && !documents) {
    // Keep only the expected columns the learner asked for, by name.
    const index = new Map(expected.columns.map((c, i) => [c.toLowerCase(), i]));
    const picked: number[] = [];
    for (const col of actual.columns) {
      const i = index.get(col.toLowerCase());
      if (i === undefined) return { kind: 'unknown-column', column: col, expectedColumns: expected.columns };
      picked.push(i);
    }
    expected = { columns: picked.map(i => expected.columns[i]), rows: expected.rows.map(r => picked.map(i => r[i])) };
  } else if (actual.columns.length !== expected.columns.length) {
    return { kind: 'column-count', expected: expected.columns.length, actual: actual.columns.length, expectedColumns: expected.columns };
  }

  if (actual.rows.length !== expected.rows.length) {
    return { kind: 'row-count', expected: expected.rows.length, actual: actual.rows.length };
  }

  const inOrder = sameSequence(expected.rows, actual.rows);
  if (inOrder) return { kind: 'match' };
  if (sameMultiset(expected.rows, actual.rows)) return orderMatters ? { kind: 'order' } : { kind: 'match' };

  if (!allowColumnSubset && findColumnOrder(expected, actual, orderMatters)) {
    return { kind: 'match', note: 'column-order' };
  }
  if (orderMatters && !allowColumnSubset && findColumnOrder(expected, actual, false)) {
    return { kind: 'order' };
  }

  return {
    kind: 'values',
    columns: expected.columns,
    missing: difference(expected.rows, actual.rows).slice(0, MAX_SHOWN_ROWS).map(display),
    extra: difference(actual.rows, expected.rows).slice(0, MAX_SHOWN_ROWS).map(display),
  };
}
