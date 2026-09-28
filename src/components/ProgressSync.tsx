'use client';

import { useEffect, useRef } from 'react';
import { useProgressStore, UserProgress } from '@/stores/progress-store';

const SAVE_DEBOUNCE_MS = 2000;

const saveRemote = (progress: UserProgress) =>
  fetch('/api/progress', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ progress }),
  });

/**
 * Invisible component (mounted in the root layout) that keeps the local
 * zustand progress store in sync with the signed-in user's saved progress,
 * via this app's /api/progress route.
 *
 * - On mount: pulls the server copy and keeps whichever has more XP.
 * - On change: debounced save back to the server.
 * - Signed out / Supabase unconfigured (the route returns non-2xx): does
 *   nothing, and localStorage still works.
 */
export function ProgressSync() {
  const syncEnabledRef = useRef(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const hydrate = async () => {
      try {
        const res = await fetch('/api/progress', { cache: 'no-store' });
        if (!res.ok || cancelled) return; // signed out or unavailable

        const { progress: remote } = (await res.json()) as { progress: UserProgress | null };
        const local = useProgressStore.getState().progress;

        if (remote && typeof remote.xp === 'number' && remote.xp >= local.xp) {
          // Server copy wins
          useProgressStore.getState().setProgress(remote);
        } else {
          // Local copy wins — push it up
          await saveRemote(local);
        }
        syncEnabledRef.current = true;
      } catch {
        /* offline — local copy stays authoritative */
      }
    };

    hydrate();

    const unsubscribe = useProgressStore.subscribe((state) => {
      if (!syncEnabledRef.current) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        saveRemote(state.progress)
          .then(res => {
            if (!res.ok) console.error('Progress sync failed:', res.status);
          })
          .catch(() => { /* offline — retried on the next change */ });
      }, SAVE_DEBOUNCE_MS);
    });

    return () => {
      cancelled = true;
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  return null;
}
