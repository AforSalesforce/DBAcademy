'use server';

import { headers } from 'next/headers';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';

export interface AuthResult {
  error?: string;
  /** Sign-up succeeded but the user must click the confirmation email first. */
  needsConfirmation?: boolean;
}

const NOT_CONFIGURED: AuthResult = {
  error: 'Accounts are not available right now. Please try again later.',
};

/** Public origin for links in auth emails: APP_URL, else the request's own origin. */
async function appOrigin(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  const h = await headers();
  const origin = h.get('origin');
  if (origin) return origin;
  const proto = h.get('x-forwarded-proto') ?? 'https';
  return `${proto}://${h.get('x-forwarded-host') ?? h.get('host')}`;
}

export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return { error: 'Email and password are required.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  return error ? { error: error.message } : {};
}

export async function signUpWithPassword(input: {
  name: string;
  email: string;
  password: string;
  role: 'student' | 'teacher';
}): Promise<AuthResult> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const name = typeof input?.name === 'string' ? input.name.trim() : '';
  const email = typeof input?.email === 'string' ? input.email.trim() : '';
  const password = typeof input?.password === 'string' ? input.password : '';
  // Plan is never accepted from the client; role is only a self-declared label.
  const role = input?.role === 'teacher' ? 'teacher' : 'student';

  if (!name || !email || !password) return { error: 'All fields are required' };
  if (password.length < 8) return { error: 'Password must be at least 8 characters' };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, role },
      emailRedirectTo: `${await appOrigin()}/auth/callback`,
    },
  });

  if (error) return { error: error.message };
  return data.session ? {} : { needsConfirmation: true };
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = await createClient();
  await supabase.auth.signOut();
}
