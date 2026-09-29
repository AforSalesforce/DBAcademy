import { describe, it, expect } from 'vitest';
import { CURRICULUM } from '@/features/learn/curriculum/curriculum';
import { SQLiteEngine } from '@/db-engines/sqlite';
import { PostgresEngine } from '@/db-engines/postgres';
import { NoSQLEngine } from '@/db-engines/nosql';
import type { DatabaseEngine } from '@/db-engines/types';

/**
 * Every built-in lesson must work on a brand-new database: its sample query
 * runs without error, and if it ends in a read it returns rows. This is the
 * check that would have caught lessons shipping against empty tables.
 */

function makeEngine(engine: string): DatabaseEngine {
  if (engine === 'sqlite') return new SQLiteEngine();
  if (engine === 'postgres') return new PostgresEngine();
  if (engine === 'nosql') return new NoSQLEngine();
  throw new Error(`No test engine for ${engine}`);
}

/** Final statement of a SQL script, ignoring comments and blank trailing `;`. */
function lastStatement(sql: string): string {
  const statements = sql
    .replace(/--.*$/gm, '')
    .split(';')
    .map(s => s.trim())
    .filter(Boolean);
  return statements[statements.length - 1] ?? '';
}

function expectsRows(engine: string, query: string): boolean {
  if (engine === 'nosql') return true; // reads return docs, writes return an ack
  return /^(SELECT|WITH)\b/i.test(lastStatement(query));
}

const lessons = CURRICULUM.flatMap(m => m.lessons.map(l => ({ module: m, lesson: l })));

describe('curriculum content', () => {
  it.each(lessons.map(x => [`${x.module.id} / ${x.lesson.title}`, x] as const))(
    '%s: sample query runs on a fresh database',
    async (_name, { module, lesson }) => {
      expect(lesson.defaultQuery, 'every lesson needs a sample query').toBeTruthy();
      const engine = makeEngine(module.engine);
      await engine.init();
      const res = await engine.execute(lesson.defaultQuery!);
      if (expectsRows(module.engine, lesson.defaultQuery!)) {
        expect(res.rows.length, `"${lesson.title}" returned no rows`).toBeGreaterThan(0);
      }
    },
    60_000,
  );

  it.each(lessons.map(x => [`${x.module.id} / ${x.lesson.title}`, x] as const))(
    '%s: has no empty Practice section',
    (_name, { lesson }) => {
      expect(lesson.content).not.toMatch(/##\s*Practice\s*$/);
    },
  );
});

describe('SQL City murder mystery', () => {
  it('can be solved from the clues, with exactly one suspect left', async () => {
    const db = new SQLiteEngine();
    await db.init();

    const report = await db.execute(
      "SELECT description FROM crime_scene_report WHERE city = 'SQL City' AND date = 20180115 AND type = 'murder'"
    );
    expect(report.rows).toHaveLength(1);
    expect(report.rows[0].description).toMatch(/Northwestern Dr.*Annabel.*Franklin Ave/);

    const firstWitness = await db.execute(
      "SELECT name FROM person WHERE address_street_name = 'Northwestern Dr' ORDER BY address_number DESC LIMIT 1"
    );
    const secondWitness = await db.execute(
      "SELECT name FROM person WHERE name LIKE 'Annabel%' AND address_street_name = 'Franklin Ave'"
    );
    expect(firstWitness.rows).toEqual([{ name: 'Morris Kettle' }]);
    expect(secondWitness.rows).toEqual([{ name: 'Annabel Voss' }]);

    const suspects = await db.execute(`
      SELECT p.name FROM get_fit_now_member g
      JOIN person p ON p.id = g.person_id
      JOIN drivers_license d ON d.id = p.license_id
      WHERE g.membership_status = 'gold' AND g.id LIKE 'G7%'
        AND d.gender = 'male' AND d.plate_number LIKE '%K9%'`);
    expect(suspects.rows).toEqual([{ name: 'Victor Hale' }]);
  });

  it('confirms the right accusation and rejects a wrong one', async () => {
    const db = new SQLiteEngine();
    await db.init();
    const right = await db.execute("SELECT verdict FROM solution WHERE code = hex(upper('Victor Hale'))");
    expect(right.rows[0].verdict).toMatch(/Case closed/);
    const wrong = await db.execute("SELECT verdict FROM solution WHERE code = hex(upper('Carla Mendes'))");
    expect(wrong.rows).toHaveLength(0);
  });
});

describe('saved databases from before the sample data existed', () => {
  it('SQLite: fills empty tables on restore and replaces the old placeholder rows', async () => {
    // Build a snapshot shaped like the old seed: empty tables, 3 stub reports.
    const initSqlJs = (await import('sql.js')).default;
    const SQL = await initSqlJs();
    const legacy = new SQL.Database();
    legacy.run(`
      CREATE TABLE person (id integer PRIMARY KEY, name text, license_id integer, address_number integer, address_street_name text, ssn text);
      CREATE TABLE crime_scene_report (date integer, type text, description text, city text);
      INSERT INTO crime_scene_report VALUES (20180115, 'murder', 'Security footage shows a man walking oddly.', 'SQL City');
      INSERT INTO crime_scene_report VALUES (20180115, 'theft', 'A donut was stolen.', 'SQL City');
      INSERT INTO crime_scene_report VALUES (20180215, 'murder', 'Another one.', 'New York');
      CREATE TABLE my_table (x integer);
      INSERT INTO my_table VALUES (42);
    `);

    const db = new SQLiteEngine();
    await db.restore(legacy.export());

    const people = await db.execute('SELECT count(*) AS n FROM person');
    expect(people.rows[0].n).toBeGreaterThan(10);
    const stub = await db.execute("SELECT count(*) AS n FROM crime_scene_report WHERE description = 'Another one.'");
    expect(stub.rows[0].n).toBe(0);
    const mine = await db.execute('SELECT x FROM my_table');
    expect(mine.rows).toEqual([{ x: 42 }]);
  });

  it("SQLite: leaves a learner's own rows in a sample table alone", async () => {
    const db = new SQLiteEngine();
    await db.init();
    await db.execute('DELETE FROM person; INSERT INTO person (id, name) VALUES (1, \'Only Me\');');
    const restored = new SQLiteEngine();
    await restored.restore(await db.serialize());
    const res = await restored.execute('SELECT name FROM person');
    expect(res.rows).toEqual([{ name: 'Only Me' }]);
  });

  it('NoSQL: upgrades the old three-user seed but keeps added documents', async () => {
    const legacy = {
      users: [
        { name: 'Alice', age: 30, role: 'admin', skills: ['js'], _id: 'a' },
        { name: 'Bob', age: 25, role: 'user', skills: ['go'], _id: 'b' },
        { name: 'Charlie', age: 35, role: 'manager', skills: ['sql'], _id: 'c' },
        { name: 'Mine', email: 'me@example.com', _id: 'm' },
      ],
      logs: [{ level: 'info', msg: 'Server started', timestamp: 'x', _id: 'l' }],
    };
    const db = new NoSQLEngine();
    await db.restore(new TextEncoder().encode(JSON.stringify(legacy)));
    const active = await db.execute('db.users.find({ isActive: true })');
    expect(active.rows.length).toBeGreaterThan(0);
    const mine = await db.execute('db.users.find({ name: "Mine" })');
    expect(mine.rows).toHaveLength(1);
    const oldAlice = await db.execute('db.users.find({ name: "Alice" })');
    expect(oldAlice.rows).toHaveLength(0);
  });
});

describe('NoSQL scripts', () => {
  it('runs every statement and shows the last result', async () => {
    const db = new NoSQLEngine();
    await db.init();
    const res = await db.execute(`
      db.pets.insertOne({ name: "Rex" });
      db.pets.insertOne({ name: "Tom" });
      db.pets.find({})`);
    expect(res.rows.map(r => r.name)).toEqual(['Rex', 'Tom']);
  });

  it('returns the query result when the script starts with a comment', async () => {
    const db = new NoSQLEngine();
    await db.init();
    const res = await db.execute('// Find admins\ndb.users.find({ role: "admin" })');
    expect(res.rows.length).toBeGreaterThan(0);
  });

  it('insertMany inserts every document', async () => {
    const db = new NoSQLEngine();
    await db.init();
    const ack = await db.execute('db.tags.insertMany([{ t: "a" }, { t: "b" }, { t: "c" }])');
    expect(ack.rows[0].insertedIds).toHaveLength(3);
    const count = await db.execute('db.tags.count({})');
    expect(count.rows[0].value).toBe(3);
  });
});

describe('SQLite results', () => {
  it('keeps the columns of a SELECT that matches nothing', async () => {
    const db = new SQLiteEngine();
    await db.init();
    const res = await db.execute("SELECT name FROM person WHERE name = 'Nobody'");
    expect(res.columns).toEqual(['name']);
    expect(res.rows).toEqual([]);
  });

  it('reports no columns for a statement that returns none', async () => {
    const db = new SQLiteEngine();
    await db.init();
    const res = await db.execute('CREATE TABLE t (x integer)');
    expect(res.columns).toEqual([]);
  });

  it('surfaces SQL errors with their message', async () => {
    const db = new SQLiteEngine();
    await db.init();
    await expect(db.execute('SELECT nme FROM person')).rejects.toThrow(/no such column: nme/);
  });
});
