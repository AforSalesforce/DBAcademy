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
    const res = await engine.execute('SELECT count(*)::int AS n FROM crime_scene_report');
    expect(res.rows[0]).toEqual({ n: 3 });
    await close(engine);
  });

  it("keeps the user's edits to seed tables across a reload", async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'pglite-'));

    const first = new PostgresEngine({ idbPath: dir });
    await first.init();
    await first.execute("DELETE FROM crime_scene_report WHERE city = 'New York'");
    await first.execute("INSERT INTO crime_scene_report VALUES (20240101, 'fraud', 'mine', 'Mine City')");
    await close(first);

    const reloaded = new PostgresEngine({ idbPath: dir });
    await reloaded.init();
    const res = await reloaded.execute('SELECT city FROM crime_scene_report ORDER BY city');
    expect(res.rows.map(r => (r as { city: string }).city)).toEqual(['Mine City', 'SQL City', 'SQL City']);
    await close(reloaded);
  }, 60_000);
});
