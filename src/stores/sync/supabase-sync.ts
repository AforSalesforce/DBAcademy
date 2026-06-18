'use client';

import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

export interface Syncable {
  id: string;
  updatedAt: string;
}

/** Last-write-wins merge by `updatedAt`. Ties keep the local entry. */
export function mergeById<T extends Syncable>(local: T[], remote: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of local) map.set(item.id, item);
  for (const item of remote) {
    const existing = map.get(item.id);
    if (!existing || item.updatedAt > existing.updatedAt) map.set(item.id, item);
  }
  return Array.from(map.values());
}

/**
 * Best-effort pull of the signed-in user's rows from a Supabase table.
 * Returns null when Supabase isn't configured, the user is signed out, or
 * the request fails — callers should fall back to treating the local copy
 * as authoritative rather than surfacing an error.
 */
export async function pullRemote<T>(
  table: string,
  mapRow: (row: any) => T
): Promise<T[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase.from(table).select('*').eq('owner_id', user.id);
    return data ? data.map(mapRow) : null;
  } catch {
    return null;
  }
}

/** Best-effort upsert to Supabase, scoped to the signed-in user. Failures are swallowed. */
export async function pushUpsert(table: string, row: Record<string, unknown>): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from(table).upsert({ ...row, owner_id: user.id });
  } catch { /* best-effort */ }
}

/** Best-effort delete from Supabase. Failures are swallowed. */
export async function pushDelete(table: string, id: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const supabase = createClient();
    await supabase.from(table).delete().eq('id', id);
  } catch { /* best-effort */ }
}
