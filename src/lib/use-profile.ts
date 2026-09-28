'use client';

import { useEffect, useState } from 'react';
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
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/me', { cache: 'no-store' });
        const data = res.ok ? ((await res.json()) as { profile: Profile | null }) : null;
        if (!cancelled) setProfile(data?.profile ?? null);
      } catch {
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { profile, loading };
}
