import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';

/**
 * Runs every file in supabase/migrations/ against a real (in-process)
 * Postgres, with a minimal stand-in for the pieces of Supabase the migrations
 * depend on: the `auth` schema, `auth.uid()`, and the anon/authenticated roles.
 *
 * `auth.uid()` reads `request.jwt.claim.sub`, exactly like Supabase does, so
 * `actAs()` below simulates a signed-in request.
 */
const MIGRATIONS_DIR = path.resolve(__dirname, '../../../supabase/migrations');

const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  grant usage on schema auth to anon, authenticated;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb not null default '{}'::jsonb
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant execute on function auth.uid() to anon, authenticated;
  grant usage on schema public to anon, authenticated;
`;

let db: PGlite;

async function signUp(email: string, meta: Record<string, unknown>): Promise<string> {
  const res = await db.query<{ id: string }>(
    'insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id',
    [email, JSON.stringify(meta)]
  );
  return res.rows[0].id;
}

/** Run `fn` as a signed-in user under the `authenticated` role, then reset. */
async function actAs<T>(userId: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set request.jwt.claim.sub = '${userId ?? ''}'`);
  await db.exec(`set role ${userId ? 'authenticated' : 'anon'}`);
  try {
    return await fn();
  } finally {
    await db.exec('reset role; reset request.jwt.claim.sub');
  }
}

const consume = async () =>
  (await db.query<{ r: string }>('select public.consume_code_execution() as r')).rows[0].r;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUB);
  const files = readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    await db.exec(readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'));
  }
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe('handle_new_user (signup trigger)', () => {
  it('ignores a client-supplied paid plan and admin role', async () => {
    const id = await signUp('attacker@example.com', { name: 'Mallory', plan: 'institution', role: 'admin' });
    const { rows } = await db.query('select name, plan, role from public.profiles where id = $1', [id]);
    expect(rows[0]).toEqual({ name: 'Mallory', plan: 'free', role: 'student' });
  });

  it('still records the self-declared teacher label', async () => {
    const id = await signUp('teacher@example.com', { name: 'T', role: 'teacher' });
    const { rows } = await db.query<{ role: string }>('select role from public.profiles where id = $1', [id]);
    expect(rows[0].role).toBe('teacher');
  });

  it('users still cannot raise their own plan directly', async () => {
    const id = await signUp('sneaky@example.com', {});
    await expect(
      actAs(id, () => db.query(`update public.profiles set plan = 'pro' where id = $1`, [id]))
    ).rejects.toThrow(/permission denied/);
  });
});

describe('consume_code_execution (Judge0 quota)', () => {
  it('rejects anonymous callers at the grant level', async () => {
    await expect(actAs(null, consume)).rejects.toThrow(/permission denied/);
  });

  it('allows 20 runs per minute, then refuses', async () => {
    const id = await signUp('runner@example.com', {});
    const results = await actAs(id, async () => {
      const out: string[] = [];
      for (let i = 0; i < 21; i++) out.push(await consume());
      return out;
    });
    expect(results.slice(0, 20).every(r => r === 'ok')).toBe(true);
    expect(results[20]).toBe('minute_limit');
  });

  it('limits are per user', async () => {
    const other = await signUp('other-runner@example.com', {});
    expect(await actAs(other, consume)).toBe('ok');
  });

  it('enforces a daily cap of 100 on the free plan and 1000 on paid plans', async () => {
    const free = await signUp('daily-free@example.com', {});
    const pro = await signUp('daily-pro@example.com', {});
    await db.query(`update public.profiles set plan = 'pro' where id = $1`, [pro]);
    for (const id of [free, pro]) {
      await db.query(
        `insert into public.code_executions (user_id, created_at)
         select $1, now() - interval '2 hours' from generate_series(1, 100)`,
        [id]
      );
    }
    expect(await actAs(free, consume)).toBe('daily_limit');
    expect(await actAs(pro, consume)).toBe('ok');
  });

  it('prunes rows older than the daily window', async () => {
    const id = await signUp('old-runs@example.com', {});
    await db.query(
      `insert into public.code_executions (user_id, created_at)
       select $1, now() - interval '2 days' from generate_series(1, 500)`,
      [id]
    );
    expect(await actAs(id, consume)).toBe('ok');
    const { rows } = await db.query<{ n: number }>(
      'select count(*)::int as n from public.code_executions where user_id = $1',
      [id]
    );
    expect(rows[0].n).toBe(1);
  });

  it('clients cannot read or tamper with the usage log directly', async () => {
    const id = await signUp('peek@example.com', {});
    await expect(actAs(id, () => db.query('select * from public.code_executions'))).rejects.toThrow(/permission denied/);
    await expect(
      actAs(id, () => db.query('delete from public.code_executions where user_id = $1', [id]))
    ).rejects.toThrow(/permission denied/);
  });
});
