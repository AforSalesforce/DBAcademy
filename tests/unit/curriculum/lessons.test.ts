import { describe, it, expect } from 'vitest';
import { CURRICULUM } from '@/features/learn/curriculum/curriculum';
import { SQLiteEngine } from '@/db-engines/sqlite';
import { NoSQLEngine } from '@/db-engines/nosql';
import { gradeAttempt } from '@/features/learn/grading/grade';
import { runInSandbox } from '@/features/learn/grading/sandbox';

/**
 * Every built-in lesson must be solvable on a brand-new database: its
 * reference solution returns data and passes, and its starter doesn't
 * already pass. This is the check that would have caught lessons shipping
 * against empty tables.
 */

const lessons = CURRICULUM.flatMap(m => m.lessons.map(l => ({ module: m, lesson: l })));
const named = lessons.map(x => [`${x.module.id} / ${x.lesson.title}`, x] as const);
type Engine = 'sqlite' | 'postgres' | 'nosql';

describe('curriculum challenges', () => {
  it.each(named)('%s: has a complete challenge', (_name, { lesson }) => {
    const c = lesson.challenge;
    expect(c, 'every built-in lesson needs a challenge').toBeDefined();
    expect(c!.prompt.length).toBeGreaterThan(20);
    expect(c!.hints.length).toBeGreaterThanOrEqual(2);
    expect(c!.starter.trim()).not.toBe(c!.solution.trim());
    if (/CREATE TABLE/i.test(c!.solution)) {
      expect(c!.solution, 'table-creating tasks must be re-runnable').toMatch(/^DROP TABLE IF EXISTS/);
      expect(c!.starter).toMatch(/^DROP TABLE IF EXISTS/);
    }
  });

  it.each(named)('%s: the solution passes and returns data', async (_name, { module, lesson }) => {
    const c = lesson.challenge!;
    const expected = await runInSandbox(module.engine as Engine, c.solution, c.check);
    expect(expected.rows.length, 'expected result is empty').toBeGreaterThan(0);
    const grade = await gradeAttempt(module.engine as Engine, lesson.id, c, c.solution);
    expect(grade).toEqual({ status: 'pass' });
  }, 60_000);

  it.each(named)('%s: the starter runs but does not pass', async (_name, { module, lesson }) => {
    const c = lesson.challenge!;
    const grade = await gradeAttempt(module.engine as Engine, lesson.id, c, c.starter);
    expect(grade.status, JSON.stringify(grade)).toBe('fail');
  }, 60_000);

  it.each(named)('%s: has no empty Practice section', (_name, { lesson }) => {
    expect(lesson.content).not.toMatch(/##\s*Practice\s*$/);
  });
});

/** Other ways learners will write the answer — these must be accepted. */
const ACCEPTED: [lessonId: string, attempt: string][] = [
  ['1-1', "SELECT description FROM crime_scene_report WHERE date = 20180115 AND city = 'SQL City' AND type = 'murder'"],
  ['1-2', "SELECT name FROM person WHERE address_street_name = 'Northwestern Dr' ORDER BY address_number DESC LIMIT 1"],
  ['1-3', 'SELECT p.name, i.transcript FROM interview i JOIN person p ON p.id = i.person_id WHERE i.person_id IN (10, 20)'],
  ['1-3', "SELECT i.transcript, p.name FROM person p JOIN interview i ON p.id = i.person_id WHERE p.name = 'Morris Kettle' OR p.name = 'Annabel Voss'"],
  ['1-4', "SELECT p.name FROM get_fit_now_member g JOIN person p ON p.id = g.person_id JOIN drivers_license d ON d.id = p.license_id WHERE g.membership_status = 'gold' AND g.id LIKE 'G7%' AND d.gender = 'male' AND d.plate_number LIKE '%K9%'"],
  ['sql-fun-2', "SELECT * FROM crime_scene_report WHERE city = 'Boston' OR city = 'Chicago'"],
  ['sql-fun-4', 'SELECT COUNT(*) AS n, city FROM crime_scene_report GROUP BY city ORDER BY n DESC'],
  ['join-1', 'SELECT person.name, drivers_license.car_make FROM drivers_license JOIN person ON person.license_id = drivers_license.id'],
  ['join-2', 'SELECT name FROM person WHERE license_id IS NULL'],
  ['join-3', "SELECT p.name FROM person p JOIN get_fit_now_member g ON g.person_id = p.id WHERE g.membership_status = 'gold'"],
  ['schema-1', "DROP TABLE IF EXISTS pets; CREATE TABLE pets (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, species TEXT); INSERT INTO pets (name, species) VALUES ('Tom', 'Cat'); INSERT INTO pets (name, species) VALUES ('Rex', 'Dog');"],
  ['pg-1-3', 'SELECT LENGTH(name) AS len, UPPER(name) AS shout FROM users'],
  ['pg-2-1', 'SELECT name, RANK() OVER (ORDER BY created_at) AS join_order FROM users ORDER BY created_at DESC'],
  ['mongo-1-2', 'db.users.insertOne({ name: "Rosa Diaz", role: "moderator", age: 33, isActive: true, email: "rosa@example.com" })'],
  ['mongo-1-3', 'db.users.find({ isActive: true, age: { $gt: 29 } })'],
];

/** Plausible wrong answers — these must be rejected, with the right reason. */
const REJECTED: [lessonId: string, attempt: string, kind: string][] = [
  ['1-1', "SELECT * FROM crime_scene_report WHERE city = 'SQL City' AND date = 20180115", 'row-count'],
  ['1-2', "SELECT * FROM person WHERE address_street_name = 'Northwestern Dr' ORDER BY address_number ASC LIMIT 1", 'values'],
  ['1-4', "SELECT p.name, d.plate_number FROM get_fit_now_member g JOIN person p ON p.id = g.person_id JOIN drivers_license d ON d.id = p.license_id WHERE g.id LIKE 'G7%' AND d.plate_number LIKE '%K9%'", 'row-count'],
  ['sql-fun-3', 'SELECT * FROM crime_scene_report ORDER BY date ASC LIMIT 3', 'values'],
  ['pg-1-1', 'SELECT name, email FROM users ORDER BY id DESC LIMIT 5', 'values'],
  ['join-2', 'SELECT p.name, p.id FROM person p WHERE license_id IS NULL', 'column-count'],
  ['sql-fun-1', 'SELECT name, ssn FROM person', 'values'],
  ['1-1', 'SELECT nickname FROM crime_scene_report', 'error'],
];

const lessonById = new Map(lessons.map(x => [x.lesson.id, x]));

describe('grading accepts equivalent answers', () => {
  it.each(ACCEPTED)('%s: %s', async (id, attempt) => {
    const { module, lesson } = lessonById.get(id)!;
    const grade = await gradeAttempt(module.engine as Engine, id, lesson.challenge!, attempt);
    expect(grade.status, JSON.stringify(grade)).toBe('pass');
  }, 60_000);
});

describe('grading rejects wrong answers', () => {
  it.each(REJECTED)('%s: %s', async (id, attempt, kind) => {
    const { module, lesson } = lessonById.get(id)!;
    const grade = await gradeAttempt(module.engine as Engine, id, lesson.challenge!, attempt);
    if (kind === 'error') expect(grade.status).toBe('error');
    else expect(grade).toMatchObject({ status: 'fail', verdict: { kind } });
  }, 60_000);
});

describe('grading sandbox', () => {
  it('Postgres: an attempt\'s changes never leak into the next check', async () => {
    await runInSandbox('postgres', 'CREATE TABLE leak_test (x int); DELETE FROM users;');
    const users = await runInSandbox('postgres', 'SELECT count(*)::int AS n FROM users');
    expect(users.rows[0].n).toBe(30);
    await expect(runInSandbox('postgres', 'SELECT * FROM leak_test')).rejects.toThrow(/does not exist/);
  }, 60_000);

  it('Postgres: refuses scripts with their own transaction control', async () => {
    await expect(runInSandbox('postgres', 'BEGIN; DELETE FROM users; COMMIT;')).rejects.toThrow(/Remove BEGIN/);
  });

  it('SQLite: every check starts from the original data', async () => {
    await runInSandbox('sqlite', 'DELETE FROM person;');
    const people = await runInSandbox('sqlite', 'SELECT count(*) AS n FROM person');
    expect(people.rows[0].n).toBe(20);
  });
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

/** Realistic beginner slips and the tip each should get. */
const MISTAKES: [lessonId: string, attempt: string, tip: RegExp][] = [
  ['1-1', "SELECT * FROM crime_scene_report WHERE city = 'SQL City' AND date = '2018-01-15' AND type = 'murder'", /YYYYMMDD/],
  ['1-1', "SELECT * FROM crime_scene_report WHERE city = 'sql city' AND date = 20180115 AND type = 'murder'", /capital letters/],
  ['1-2', "SELECT * FROM person WHERE address_street_name = 'Northwestern Dr' ORDER BY address_number LIMIT 1", /DESC/],
  ['1-4', "SELECT p.name FROM get_fit_now_member g JOIN person p ON p.id = g.person_id JOIN drivers_license d ON d.id = p.license_id WHERE g.membership_status = 'gold' AND g.id LIKE 'G7%' AND d.gender = 'male' AND d.plate_number LIKE 'K9'", /% signs/],
  ['sql-fun-2', "SELECT * FROM crime_scene_report WHERE city = 'Chicago' AND city = 'Boston'", /two cities/],
  ['sql-fun-3', 'SELECT * FROM crime_scene_report ORDER BY date LIMIT 3', /DESC/],
  ['sql-fun-4', 'SELECT city, COUNT(*) FROM crime_scene_report', /GROUP BY/],
  ['join-2', 'SELECT p.name FROM person p LEFT JOIN drivers_license d ON p.license_id = d.id WHERE d.id = NULL', /IS NULL/],
  ['pg-1-1', 'SELECT name FROM users LIMIT 5', /ORDER BY id/],
];

describe('common-mistake tips', () => {
  it.each(MISTAKES)('%s: "%s" gets a targeted tip', async (id, attempt, tip) => {
    const { module, lesson } = lessonById.get(id)!;
    const grade = await gradeAttempt(module.engine as Engine, id, lesson.challenge!, attempt);
    expect(grade.status).not.toBe('pass');
    expect(grade.status !== 'pass' && grade.tip).toMatch(tip);
  }, 60_000);

  it.each(named)('%s: the reference solution triggers no mistake tip', (_name, { lesson }) => {
    const c = lesson.challenge!;
    expect(c.mistakes?.find(m => m.when(c.solution))?.tip).toBeUndefined();
  });
});
