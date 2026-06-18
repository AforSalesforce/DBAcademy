'use client';

import { useEffect, useState } from 'react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { Plan } from '@/features/billing/plans';

export interface Profile {
  id: string;
  email: string | null;
  name: string | null;
  role: 'student' | 'teacher' | 'admin';
  plan: Plan;
  institution: string | null;
  institution_id: string | null;
}

/**
 * Returns the signed-in user's profile row, or null when signed out
 * (or when Supabase isn't configured yet).
 */
export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const supabase = createClient();
    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!cancelled) {
        setProfile((data as Profile) ?? null);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { profile, loading };
}
