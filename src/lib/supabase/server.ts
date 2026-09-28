import 'server-only';
import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getSupabaseConfig, hardenCookie, isSupabaseConfigured } from './config';

export { isSupabaseConfigured };

/**
 * Supabase client for Server Components, Server Actions, and Route Handlers,
 * bound to the signed-in user's session cookies (so RLS applies as that user).
 */
export async function createClient() {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error(
      'Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY (see .env.example).'
    );
  }

  const cookieStore = await cookies();

  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, hardenCookie(options))
          );
        } catch {
          // Called from a Server Component — safe to ignore when middleware
          // is refreshing sessions.
        }
      },
    },
  });
}

export type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

/**
 * The cookie-bound client plus the signed-in user, or null when Supabase
 * isn't configured or nobody is signed in.
 */
export async function getSession(): Promise<{ supabase: ServerSupabase; user: User } | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
}
