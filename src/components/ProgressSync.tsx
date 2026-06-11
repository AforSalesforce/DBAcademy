'use client';

import { useEffect, useRef } from 'react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { useProgressStore, UserProgress } from '@/lib/progress-store';

const SAVE_DEBOUNCE_MS = 2000;

/**
 * Invisible component (mounted in the root layout) that keeps the local
 * zustand progress store in sync with Supabase for signed-in users.
 *
 * - On mount: pulls the server copy and keeps whichever has more XP.
 * - On change: debounced upsert back to the server.
 * - Signed-out / unconfigured: does nothing (localStorage still works).
 */
export function ProgressSync() {
  const userIdRef = useRef<string | null>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const hydrate = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      userIdRef.current = user.id;

      const { data } = await supabase
        .from('user_progress')
        .select('progress')
        .eq('user_id', user.id)
        .maybeSingle();

      const remote = data?.progress as UserProgress | undefined;
      const local = useProgressStore.getState().progress;

      if (remote && typeof remote.xp === 'number' && remote.xp >= local.xp) {
        // Server copy wins
        useProgressStore.getState().setProgress(remote);
      } else {
        // Local copy wins — push it up
        await supabase.from('user_progress').upsert({
          user_id: user.id,
          progress: local,
          updated_at: new Date().toISOString(),
        });
      }
      hydratedRef.current = true;
    };

    hydrate();

    const unsubscribe = useProgressStore.subscribe((state) => {
      if (!userIdRef.current || !hydratedRef.current) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        supabase.from('user_progress').upsert({
          user_id: userIdRef.current!,
          progress: state.progress,
          updated_at: new Date().toISOString(),
        }).then(({ error }) => {
          if (error) console.error('Progress sync failed:', error.message);
        });
      }, SAVE_DEBOUNCE_MS);
    });

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  return null;
}
