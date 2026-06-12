'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Database, GraduationCap, Eye, EyeOff, ArrowRight } from 'lucide-react';

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!isSupabaseConfigured) {
        setError('Auth is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment.');
        return;
      }

      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        setError(signInError.message);
      } else {
        router.push(searchParams.get('next') || '/dashboard');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: '#07090F' }}>
      {/* Background */}
      <div className="absolute inset-0 mesh-bg" />
      <div className="absolute inset-0 grid-overlay opacity-30" />
      <div className="fixed top-0 left-1/3 w-[500px] h-[400px] rounded-full pointer-events-none blur-[120px]" style={{ background: 'rgba(0,199,190,0.06)' }} />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-8 group cursor-pointer">
          <div className="relative w-10 h-10 flex items-center justify-center rounded-xl ring-1 ring-white/10" style={{ background: 'linear-gradient(135deg, #00C7BE, #0096A0)', boxShadow: '0 0 24px rgba(0,199,190,0.25)' }}>
            <Database className="w-5 h-5 text-white" strokeWidth={2.5} />
            <div className="absolute -bottom-1 -right-1 rounded-full p-0.5" style={{ background: '#07090F', border: '1px solid rgba(255,255,255,0.1)' }}>
              <GraduationCap className="w-2.5 h-2.5" style={{ color: '#00C7BE' }} />
            </div>
          </div>
          <span className="text-2xl font-extrabold tracking-tight font-display" style={{ color: '#EDF1FA' }}>DBAcademy</span>
        </Link>

        {/* Card */}
        <div className="rounded-2xl p-8 shadow-2xl" style={{ background: '#0C1018', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-1" style={{ color: '#EDF1FA' }}>Welcome back</h1>
            <p className="text-sm" style={{ color: '#5C6B8A' }}>Sign in to continue your learning journey</p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl text-sm text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#EDF1FA' }} htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm transition-all focus:outline-none"
                style={{ background: '#111724', border: '1px solid rgba(255,255,255,0.08)', color: '#EDF1FA' }}
                onFocus={e => (e.target.style.borderColor = '#00C7BE')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#EDF1FA' }} htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-11 rounded-xl text-sm transition-all focus:outline-none"
                  style={{ background: '#111724', border: '1px solid rgba(255,255,255,0.08)', color: '#EDF1FA' }}
                  onFocus={e => (e.target.style.borderColor = '#00C7BE')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors cursor-pointer"
                  style={{ color: '#5C6B8A' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              style={{ background: '#00C7BE', color: '#07090F', boxShadow: '0 0 24px rgba(0,199,190,0.25)' }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-current/30 border-t-current animate-spin" />
                  Signing in…
                </>
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm" style={{ color: '#5C6B8A' }}>
              Don&apos;t have an account?{' '}
              <Link href="/auth/signup" className="font-semibold transition-colors cursor-pointer" style={{ color: '#00C7BE' }}>
                Sign up free
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs mt-5" style={{ color: '#2E3A52' }}>
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#07090F' }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(0,199,190,0.2)', borderTopColor: '#00C7BE' }} />
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
