import type { QueryResult } from '@/db-engines/types';
import { SQLiteEngine } from '@/db-engines/sqlite';
import { PostgresEngine, ScriptStepError } from '@/db-engines/postgres';
import { NoSQLEngine } from '@/db-engines/nosql';

/**
 * Throwaway databases for grading. Every run starts from the untouched
 * sample data, whatever the learner has done to their own playground.
 */

export type GradedEngine = 'sqlite' | 'postgres' | 'nosql';

/** Transaction control would escape the Postgres sandbox's rollback. */
const TRANSACTION_CONTROL = /\b(BEGIN|COMMIT|ROLLBACK|START\s+TRANSACTION|SAVEPOINT)\b/i;

export class SandboxRejected extends Error {}

/**
 * The attempt ran, but the follow-up check query failed on what it left
 * behind (e.g. a column the task asks for doesn't exist yet).
 */
export class CheckFailed extends Error {}

let sqliteSeed: Promise<Uint8Array> | null = null;
let postgres: Promise<PostgresEngine> | null = null;
/** One Postgres transaction at a time on the shared sandbox. */
let postgresQueue: Promise<unknown> = Promise.resolve();

async function freshSqlite(): Promise<SQLiteEngine> {
  sqliteSeed ??= (async () => {
    const seedEngine = new SQLiteEngine();
    await seedEngine.init();
    return seedEngine.serialize();
  })();
  const engine = new SQLiteEngine();
  await engine.restore(await sqliteSeed);
  return engine;
}

function postgresSandbox(): Promise<PostgresEngine> {
  postgres ??= (async () => {
    const engine = new PostgresEngine(); // in-memory, never persisted
    await engine.init();
    return engine;
  })();
  return postgres;
}

/** Run `script` (then `check`) on clean sample data and return the last result. */
export async function runInSandbox(engine: GradedEngine, script: string, check?: string): Promise<QueryResult> {
  if (engine === 'postgres') return runInPostgres(script, check);

  const db = engine === 'sqlite' ? await freshSqlite() : new NoSQLEngine();
  if (engine === 'nosql') await db.init();
  const result = await db.execute(script);
  if (!check) return result;
  try {
    return await db.execute(check);
  } catch (e) {
    throw new CheckFailed(e instanceof Error ? e.message : String(e));
  }
}

function runInPostgres(script: string, check?: string): Promise<QueryResult> {
  if (TRANSACTION_CONTROL.test(script)) {
    return Promise.reject(new SandboxRejected('Remove BEGIN, COMMIT or ROLLBACK from your query to check it. The checker runs it inside its own transaction.'));
  }
  const run = postgresQueue.then(async () => {
    const sandbox = await postgresSandbox();
    try {
      const results = await sandbox.executeInRollback(check ? [script, check] : [script]);
      return results[results.length - 1];
    } catch (e) {
      if (e instanceof ScriptStepError && e.step === 1) throw new CheckFailed(e.message);
      throw e;
    }
  });
  postgresQueue = run.catch(() => undefined);
  return run;
}
