import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

const auth = {
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
};
let configured = true;

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth }),
  isSupabaseConfigured: () => configured,
}));

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ origin: 'https://app.example.com' }),
}));

import { signUpWithPassword, signInWithPassword } from '@/features/auth/actions';

// ── Tests ────────────────────────────────────────────────────────────────────

describe('auth server actions', () => {
  beforeEach(() => {
    configured = true;
    auth.signUp.mockReset().mockResolvedValue({ data: { session: {} }, error: null });
    auth.signInWithPassword.mockReset().mockResolvedValue({ error: null });
    vi.unstubAllEnvs();
  });

  it('never forwards a plan to Supabase, and only allows student/teacher roles', async () => {
    await signUpWithPassword({
      name: 'Mallory',
      email: 'm@example.com',
      password: 'longenough',
      // A tampered client could send anything here.
      role: 'admin' as 'student',
      ...({ plan: 'institution' } as object),
    });

    const options = auth.signUp.mock.calls[0][0].options;
    expect(options.data).toEqual({ name: 'Mallory', role: 'student' });
  });

  it('points confirmation emails at /auth/callback, preferring APP_URL', async () => {
    const input = { name: 'A', email: 'a@example.com', password: 'longenough', role: 'student' as const };

    await signUpWithPassword(input);
    expect(auth.signUp.mock.calls[0][0].options.emailRedirectTo).toBe('https://app.example.com/auth/callback');

    vi.stubEnv('APP_URL', 'https://dbacademy.example/');
    await signUpWithPassword(input);
    expect(auth.signUp.mock.calls[1][0].options.emailRedirectTo).toBe('https://dbacademy.example/auth/callback');
  });

  it('reports when email confirmation is required', async () => {
    auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
    const result = await signUpWithPassword({ name: 'A', email: 'a@example.com', password: 'longenough', role: 'student' });
    expect(result).toEqual({ needsConfirmation: true });
  });

  it('validates input on the server, not just in the form', async () => {
    expect(await signUpWithPassword({ name: 'A', email: 'a@example.com', password: 'short', role: 'student' }))
      .toEqual({ error: 'Password must be at least 8 characters' });
    expect(await signInWithPassword('', '')).toEqual({ error: 'Email and password are required.' });
    expect(auth.signUp).not.toHaveBeenCalled();
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('fails gracefully when Supabase is not configured', async () => {
    configured = false;
    const result = await signInWithPassword('a@example.com', 'longenough');
    expect(result.error).toMatch(/not available/);
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });
});
