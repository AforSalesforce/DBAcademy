/**
 * Returns `next` only if it is a same-site path ("/dashboard?tab=x"), else the
 * fallback. Blocks open redirects such as "//evil.com", "/\evil.com" or
 * "https://evil.com" passed via ?next=.
 */
export function safeNextPath(next: string | null | undefined, fallback = '/dashboard'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return fallback;
  }
  return next;
}
