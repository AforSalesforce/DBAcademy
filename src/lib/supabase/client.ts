'use client';

import { createBrowserClient } from '@supabase/ssr';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True once NEXT_PUBLIC_SUPABASE_URL / ANON_KEY are set (see .env.example). */
export const isSupabaseConfigured = Boolean(url && anonKey);

export function createClient() {
  if (!url || !anonKey) {
    throw new Error(
      'Supabase is not configured. Copy .env.example to .env.local and fill in your project credentials.'
    );
  }
  return createBrowserClient(url, anonKey);
}
