import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseConfig, hardenCookie } from '@/lib/supabase/config';
import { accountsEnabled } from '@/lib/features';

const PROTECTED_PREFIXES = ['/dashboard', '/admin'];

/** Pages that only make sense with accounts/payments; hidden while those are off. */
const ACCOUNT_ONLY_PREFIXES = ['/auth', '/pricing', '/admin'];

export async function middleware(request: NextRequest) {
  if (!accountsEnabled()) {
    const path = request.nextUrl.pathname;
    if (ACCOUNT_ONLY_PREFIXES.some(p => path === p || path.startsWith(`${p}/`))) {
      const home = request.nextUrl.clone();
      home.pathname = '/';
      home.search = '';
      return NextResponse.redirect(home);
    }
    return NextResponse.next();
  }

  const supabaseConfig = getSupabaseConfig();

  // Supabase not configured yet — let everything through so the app
  // still works in local/demo mode.
  if (!supabaseConfig) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseConfig.url, supabaseConfig.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, hardenCookie(options))
        );
      },
    },
  });

  // Refreshes the session cookie if expired — do not remove.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some(p => path.startsWith(p));

  if (!user && isProtected) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/auth/signin';
    redirectUrl.searchParams.set('next', path);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && path.startsWith('/auth')) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    redirectUrl.search = '';
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/auth/:path*', '/pricing/:path*'],
};
