import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

/** Records every query-builder call so tests can assert what reached Supabase. */
const calls: { table: string; op: string; args: unknown[] }[] = [];
let nextResult: { data?: unknown; error: { message: string } | null } = { data: [], error: null };

function builder(table: string) {
  const chain: Record<string, unknown> = {};
  for (const op of ['select', 'upsert', 'delete', 'eq']) {
    chain[op] = (...args: unknown[]) => {
      calls.push({ table, op, args });
      return chain;
    };
  }
  chain.then = (resolve: (v: unknown) => unknown) => resolve(nextResult);
  return chain;
}

let session: { supabase: unknown; user: { id: string } } | null = null;

vi.mock('@/lib/supabase/server', () => ({
  getSession: async () => session,
}));

import { GET, PUT, DELETE } from '@/app/api/sync/[table]/route';

// ── Helpers ──────────────────────────────────────────────────────────────────

const params = (table: string) => ({ params: Promise.resolve({ table }) });
const req = (method: string, path: string, body?: unknown) =>
  new NextRequest(`http://localhost${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });

// ── Tests ────────────────────────────────────────────────────────────────────

describe('/api/sync/[table]', () => {
  beforeEach(() => {
    calls.length = 0;
    nextResult = { data: [], error: null };
    session = { supabase: { from: (t: string) => builder(t) }, user: { id: 'user-1' } };
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('rejects tables outside the allowlist, even when signed in', async () => {
    for (const table of ['profiles', 'user_progress', 'institutions', 'code_executions']) {
      const res = await GET(req('GET', `/api/sync/${table}`), params(table));
      expect(res.status).toBe(404);
    }
    expect(calls).toHaveLength(0);
  });

  it('requires a signed-in user', async () => {
    session = null;
    const res = await GET(req('GET', '/api/sync/notes'), params('notes'));
    expect(res.status).toBe(401);
  });

  it("GET returns only the caller's rows", async () => {
    nextResult = { data: [{ id: 'n1' }], error: null };
    const res = await GET(req('GET', '/api/sync/notes'), params('notes'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ rows: [{ id: 'n1' }] });
    expect(calls).toContainEqual({ table: 'notes', op: 'eq', args: ['owner_id', 'user-1'] });
  });

  it('PUT forces owner_id to the caller, ignoring a spoofed one', async () => {
    const res = await PUT(
      req('PUT', '/api/sync/saved_queries', { id: 'q1', title: 't', owner_id: 'someone-else' }),
      params('saved_queries')
    );
    expect(res.status).toBe(200);
    const upsert = calls.find(c => c.op === 'upsert');
    expect(upsert?.args[0]).toEqual({ id: 'q1', title: 't', owner_id: 'user-1' });
  });

  it('PUT rejects malformed bodies', async () => {
    for (const body of ['not json', [], { title: 'no id' }, { id: 42 }]) {
      const res = await PUT(req('PUT', '/api/sync/notes', body), params('notes'));
      expect(res.status).toBe(400);
    }
    expect(calls.some(c => c.op === 'upsert')).toBe(false);
  });

  it('PUT rejects oversized rows', async () => {
    const res = await PUT(
      req('PUT', '/api/sync/notes', { id: 'n1', content_md: 'x'.repeat(300_000) }),
      params('notes')
    );
    expect(res.status).toBe(413);
  });

  it("DELETE is scoped to the caller's own row", async () => {
    const res = await DELETE(req('DELETE', '/api/sync/projects?id=p1'), params('projects'));
    expect(res.status).toBe(200);
    expect(calls).toContainEqual({ table: 'projects', op: 'eq', args: ['id', 'p1'] });
    expect(calls).toContainEqual({ table: 'projects', op: 'eq', args: ['owner_id', 'user-1'] });
  });

  it('does not leak database error messages', async () => {
    nextResult = { data: null, error: { message: 'relation "secret_table" does not exist' } };
    const res = await GET(req('GET', '/api/sync/notes'), params('notes'));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('secret_table');
  });
});
