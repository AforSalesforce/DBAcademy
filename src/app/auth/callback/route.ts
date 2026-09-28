import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { safeNextPath } from '@/lib/safe-redirect';

/**
 * Landing point for links in Supabase auth emails (sign-up confirmation).
 * Sign-up runs on the server with the PKCE flow, so the email link arrives
 * here with a one-time `code` that the server exchanges for a session cookie.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = safeNextPath(url.searchParams.get('next'));

  if (code && isSupabaseConfigured()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
    console.error('Auth callback: code exchange failed:', error.message);
  }

  return NextResponse.redirect(new URL('/auth/signin?error=confirmation', url.origin));
}
