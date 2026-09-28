import type { CookieOptions } from '@supabase/ssr';

/**
 * Supabase connection settings. Deliberately NOT prefixed with NEXT_PUBLIC_,
 * so Next.js never inlines them into browser bundles: the browser only ever
 * talks to this app's own routes, and those talk to Supabase.
 */
export function getSupabaseConfig(): { url: string; anonKey: string } | null {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== null;
}

/**
 * Session cookies are httpOnly: no browser code reads them any more, so
 * script injected into the page can't steal a session token either.
 */
export function hardenCookie(options: CookieOptions): CookieOptions {
  return {
    ...options,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  };
}
