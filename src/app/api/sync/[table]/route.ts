import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/supabase/server';

/**
 * Server side of the "local-first, sync if signed in" pattern
 * (src/stores/sync/supabase-sync.ts). Every query runs as the signed-in user,
 * so RLS still applies; on top of that, only these tables are reachable and
 * owner_id is always forced to the caller.
 */
const SYNC_TABLES = new Set(['projects', 'saved_queries', 'notes', 'schema_designs']);
const MAX_BODY_BYTES = 256_000;

type Params = { params: Promise<{ table: string }> };

type Resolved =
  | { failure: NextResponse }
  | ({ table: string } & NonNullable<Awaited<ReturnType<typeof getSession>>>);

async function resolve(params: Params['params']): Promise<Resolved> {
  const { table } = await params;
  if (!SYNC_TABLES.has(table)) {
    return { failure: NextResponse.json({ error: 'Unknown table' }, { status: 404 }) };
  }
  const session = await getSession();
  if (!session) {
    return { failure: NextResponse.json({ error: 'Not signed in' }, { status: 401 }) };
  }
  return { table, ...session };
}

const dbFailure = (method: string, table: string, message: string) => {
  console.error(`${method} /api/sync/${table} failed:`, message);
  return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
};

/** All of the caller's rows in `table`. */
export async function GET(_request: NextRequest, { params }: Params) {
  const r = await resolve(params);
  if ('failure' in r) return r.failure;

  const { data, error } = await r.supabase.from(r.table).select('*').eq('owner_id', r.user.id);
  if (error) return dbFailure('GET', r.table, error.message);
  return NextResponse.json({ rows: data ?? [] });
}

/** Upserts one row (body is the row, including its `id`). */
export async function PUT(request: NextRequest, { params }: Params) {
  const r = await resolve(params);
  if ('failure' in r) return r.failure;

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Row too large' }, { status: 413 });
  }
  let row: unknown;
  try {
    row = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!row || typeof row !== 'object' || Array.isArray(row) || typeof (row as { id?: unknown }).id !== 'string') {
    return NextResponse.json({ error: 'Body must be a row object with a string id' }, { status: 400 });
  }

  const { error } = await r.supabase.from(r.table).upsert({ ...row, owner_id: r.user.id });
  if (error) return dbFailure('PUT', r.table, error.message);
  return NextResponse.json({ ok: true });
}

/** Deletes the caller's row `?id=`. */
export async function DELETE(request: NextRequest, { params }: Params) {
  const r = await resolve(params);
  if ('failure' in r) return r.failure;

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { error } = await r.supabase.from(r.table).delete().eq('id', id).eq('owner_id', r.user.id);
  if (error) return dbFailure('DELETE', r.table, error.message);
  return NextResponse.json({ ok: true });
}
