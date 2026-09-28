/**
 * Master switch for everything tied to a user account: Supabase auth and
 * cloud sync, Stripe payments, institutions, and server-side code execution
 * (Java/C/C++/Go, whose cost is capped per account).
 *
 * Off unless ACCOUNTS_ENABLED=true. When off, the server treats Supabase as
 * unconfigured, billing routes 404, account pages redirect home, and the UI
 * hides every account/payment entry point — the app is fully usable as a
 * browser-only learning tool. Read on the server; the client gets the value
 * through <FeaturesProvider> in the root layout.
 */
export function accountsEnabled(): boolean {
  return process.env.ACCOUNTS_ENABLED === 'true';
}
