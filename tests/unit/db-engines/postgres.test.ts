import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PostgresEngine } from '@/db-engines/postgres';

// PGlite persists to a directory in Node the same way it persists to
// IndexedDB in the browser, so this exercises the real reload path.
describe('PostgresEngine persistence', () => {
  let dir: string | null = null;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = null;
  });

  const close = (engine: PostgresEngine) =>
    (engine as unknown as { db: { close(): Promise<void> } }).db.close();

  it('seeds a fresh database', async () => {
    const engine = new PostgresEngine();
    await engine.init();
    const reports = await engine.execute('SELECT count(*)::int AS n FROM crime_scene_report');
    expect(reports.rows[0]).toEqual({ n: 12 });
    const users = await engine.execute('SELECT count(*)::int AS n FROM users');
    expect(users.rows[0]).toEqual({ n: 30 });
    await close(engine);
  });

  it('runs several statements and returns the last result set', async () => {
    const engine = new PostgresEngine();
    await engine.init();
    const res = await engine.execute(`
      CREATE TABLE t (x int);
      INSERT INTO t VALUES (1), (2);
      SELECT x FROM t ORDER BY x;`);
    expect(res.columns).toEqual(['x']);
    expect(res.rows).toEqual([{ x: 1 }, { x: 2 }]);
    await close(engine);
  });

  it('keeps its seed bookkeeping out of the schema listing', async () => {
    const engine = new PostgresEngine();
    await engine.init();
    const names = (await engine.getSchema()).map(t => t.name);
    expect(names).toContain('person');
    expect(names).not.toContain('meta');
    await close(engine);
  });

  it('reset() really wipes a persisted database and re-seeds it', async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'pglite-'));
    const engine = new PostgresEngine({ idbPath: dir });
    await engine.init();
    await engine.execute('CREATE TABLE scratch (x int); DELETE FROM interview;');
    await engine.reset();
    const names = (await engine.getSchema()).map(t => t.name);
    expect(names).not.toContain('scratch');
    const interviews = await engine.execute('SELECT count(*)::int AS n FROM interview');
    expect(interviews.rows[0].n).toBeGreaterThan(0);
    await close(engine);
  }, 60_000);

  it('fills in the empty tables of a database saved before the sample data existed', async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'pglite-'));
    const { PGlite } = await import('@electric-sql/pglite');
    const legacy = new PGlite(dir);
    await legacy.exec(`
      CREATE TABLE crime_scene_report (date integer, type text, description text, city text);
      INSERT INTO crime_scene_report VALUES (20180115, 'murder', 'Security footage shows a man walking oddly.', 'SQL City');
      INSERT INTO crime_scene_report VALUES (20180115, 'theft', 'A donut was stolen.', 'SQL City');
      INSERT INTO crime_scene_report VALUES (20180215, 'murder', 'Another one.', 'New York');
      CREATE TABLE person (id integer PRIMARY KEY, name text, license_id integer, address_number integer, address_street_name text, ssn text);
    `);
    await legacy.close();

    const engine = new PostgresEngine({ idbPath: dir });
    await engine.init();
    const reports = await engine.execute('SELECT count(*)::int AS n FROM crime_scene_report');
    expect(reports.rows[0]).toEqual({ n: 12 });
    const people = await engine.execute('SELECT count(*)::int AS n FROM person');
    expect(people.rows[0].n).toBeGreaterThan(10);
    await close(engine);
  }, 60_000);

  it("keeps the user's edits to seed tables across a reload", async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'pglite-'));

    const first = new PostgresEngine({ idbPath: dir });
    await first.init();
    await first.execute("DELETE FROM crime_scene_report WHERE city = 'New York'");
    await first.execute("INSERT INTO crime_scene_report VALUES (20240101, 'fraud', 'mine', 'Mine City')");
    await close(first);

    const reloaded = new PostgresEngine({ idbPath: dir });
    await reloaded.init();
    const res = await reloaded.execute('SELECT city FROM crime_scene_report');
    const cities = res.rows.map(r => (r as { city: string }).city);
    expect(cities).toContain('Mine City');
    expect(cities).not.toContain('New York');
    expect(cities).toHaveLength(12 - 2 + 1);
    await close(reloaded);
  }, 60_000);
});
