'use client';

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
 * Off until <FeaturesProvider> turns it on (accounts enabled). While off, the
 * helpers below return immediately instead of making requests that would
 * only be refused.
 */
let remoteSyncEnabled = false;

export function setRemoteSyncEnabled(enabled: boolean): void {
  remoteSyncEnabled = enabled;
}

/**
 * Best-effort pull of the signed-in user's rows, via this app's own
 * /api/sync route (the browser never talks to Supabase directly).
 * Returns null when the user is signed out, Supabase isn't configured, or the
 * request fails — callers should fall back to treating the local copy as
 * authoritative rather than surfacing an error.
 */
export async function pullRemote<T>(
  table: string,
  mapRow: (row: Record<string, unknown>) => T
): Promise<T[] | null> {
  if (!remoteSyncEnabled) return null;
  try {
    const res = await fetch(`/api/sync/${table}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const { rows } = (await res.json()) as { rows?: Record<string, unknown>[] };
    return Array.isArray(rows) ? rows.map(mapRow) : null;
  } catch {
    return null;
  }
}

/** Best-effort upsert, scoped server-side to the signed-in user. Failures are swallowed. */
export async function pushUpsert(table: string, row: Record<string, unknown>): Promise<void> {
  if (!remoteSyncEnabled) return;
  try {
    await fetch(`/api/sync/${table}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    });
  } catch { /* best-effort */ }
}

/** Best-effort delete, scoped server-side to the signed-in user. Failures are swallowed. */
export async function pushDelete(table: string, id: string): Promise<void> {
  if (!remoteSyncEnabled) return;
  try {
    await fetch(`/api/sync/${table}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch { /* best-effort */ }
}
