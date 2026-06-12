'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useProgressStore } from '@/lib/progress-store';
import { CURRICULUM } from '@/lib/curriculum';
import { useProfile } from '@/lib/use-profile';
import { SiteFooter } from '@/components/SiteFooter';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  Database, GraduationCap, Trophy, Zap, Flame, Target,
  BookOpen, ArrowRight, Star, LogOut, Play, CheckCircle, X,
} from 'lucide-react';

const TOTAL_LESSONS = CURRICULUM.reduce((sum, m) => sum + m.lessons.length, 0);

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { progress, updateStreak } = useProgressStore();
  const { profile } = useProfile();

  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState('');
  const billingStatus = searchParams.get('billing');

  useEffect(() => {
    updateStreak();
  }, [updateStreak]);

  // Clear the ?billing= param from the URL after reading it (clean UX)
  useEffect(() => {
    if (billingStatus) {
      const url = new URL(window.location.href);
      url.searchParams.delete('billing');
      window.history.replaceState({}, '', url.toString());
    }
  }, [billingStatus]);

  const handleSignOut = async () => {
    if (!isSupabaseConfigured) return;
    await createClient().auth.signOut();
    router.push('/');
    router.refresh();
  };

  const handleManageBilling = async () => {
    setBillingError('');
    setBillingLoading(true);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setBillingError(data.error ?? 'Could not open billing portal. Try again.');
      }
    } catch {
      setBillingError('Network error — could not reach billing portal.');
    } finally {
      setBillingLoading(false);
    }
  };

  const [inviteCode, setInviteCode] = useState('');
  const [joinStatus, setJoinStatus] = useState<{ ok?: string; error?: string }>({});
  const [joining, setJoining] = useState(false);

  const handleJoinInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinStatus({});
    setJoining(true);
    try {
      const { data, error } = await createClient().rpc('join_institution', { code: inviteCode });
      if (error) throw new Error(error.message);
      setJoinStatus({ ok: `Joined ${data?.name ?? 'institution'}!` });
      setInviteCode('');
    } catch (err: any) {
      setJoinStatus({ error: err.message });
    } finally {
      setJoining(false);
    }
  };

  const xpProgress = progress.xp % 100;
  const progressPercent = (xpProgress / 100) * 100;
  const completionPercent = TOTAL_LESSONS > 0
    ? Math.round((progress.lessonsCompleted / TOTAL_LESSONS) * 100)
    : 0;

  return (
    <div className="min-h-screen text-white" style={{ background: '#07090F' }}>
      {/* ── Ambient glow ─── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: 'rgba(0,199,190,0.06)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full blur-3xl" style={{ background: 'rgba(245,158,11,0.05)' }} />
      </div>
      <div className="fixed inset-0 grid-overlay pointer-events-none opacity-50" />

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <header className="relative z-10 sticky top-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(7,9,15,0.8)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="relative w-8 h-8 flex items-center justify-center rounded-lg" style={{ background: 'linear-gradient(135deg, #00C7BE, #0096A0)' }}>
                <Database className="w-4 h-4 text-white" />
                <div className="absolute -bottom-1 -right-1 rounded-full p-0.5" style={{ background: '#07090F', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <GraduationCap className="w-2.5 h-2.5" style={{ color: '#00C7BE' }} />
                </div>
              </div>
              <span className="text-base font-bold tracking-tight font-display">DBAcademy</span>
            </Link>

            <div className="flex items-center gap-3">
              {profile && (
                <span className="hidden sm:inline-flex items-center gap-2 text-sm" style={{ color: '#5C6B8A' }}>
                  {profile.name || profile.email}
                  <span className="text-xs px-2 py-0.5 rounded-full uppercase font-semibold" style={{ background: 'rgba(0,199,190,0.1)', color: '#00C7BE', border: '1px solid rgba(0,199,190,0.2)' }}>
                    {profile.plan}
                  </span>
                </span>
              )}
              {profile?.plan !== 'free' && (
                <button
                  onClick={handleManageBilling}
                  disabled={billingLoading}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors cursor-pointer rounded-lg disabled:opacity-60"
                  style={{ color: '#5C6B8A', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {billingLoading ? (
                    <><div className="w-3.5 h-3.5 rounded-full border-2 border-current/30 border-t-current animate-spin" /> Opening…</>
                  ) : 'Manage subscription'}
                </button>
              )}
              <Link
                href="/learn"
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer"
                style={{ background: '#00C7BE', color: '#07090F' }}
              >
                <Play className="w-3.5 h-3.5" /> Continue
              </Link>
              {profile && (
                <button
                  onClick={handleSignOut}
                  className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* ── Billing status banners ────────────────────────────────────────────── */}
        {billingStatus === 'success' && (
          <div className="flex items-center gap-3 mb-6 p-4 rounded-xl" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <CheckCircle className="w-5 h-5 shrink-0" style={{ color: '#22C55E' }} />
            <div>
              <p className="font-semibold text-sm" style={{ color: '#22C55E' }}>Subscription activated!</p>
              <p className="text-xs mt-0.5" style={{ color: '#5C6B8A' }}>Your plan has been upgraded. All features are now unlocked.</p>
            </div>
          </div>
        )}
        {billingStatus === 'cancelled' && (
          <div className="flex items-center gap-3 mb-6 p-4 rounded-xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <X className="w-5 h-5 shrink-0" style={{ color: '#F59E0B' }} />
            <div>
              <p className="font-semibold text-sm" style={{ color: '#F59E0B' }}>Checkout cancelled</p>
              <p className="text-xs mt-0.5" style={{ color: '#5C6B8A' }}>No charges were made. You can upgrade anytime from the <Link href="/pricing" className="underline">pricing page</Link>.</p>
            </div>
          </div>
        )}
        {billingError && (
          <div className="flex items-center gap-3 mb-6 p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <X className="w-5 h-5 shrink-0" style={{ color: '#EF4444' }} />
            <p className="text-sm" style={{ color: '#EF4444' }}>{billingError}</p>
          </div>
        )}

        {/* ── Welcome ───────────────────────────────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1 tracking-tight heading-lg" style={{ color: '#EDF1FA' }}>
            {profile?.name ? `Welcome back, ${profile.name.split(' ')[0]}` : 'Your Dashboard'}
          </h1>
          <p style={{ color: '#5C6B8A' }}>Track your progress and keep the streak alive.</p>
        </div>

        {/* ── Stat Cards ────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={<Star className="w-5 h-5" />}
            iconColor="text-yellow"
            bgGradient=""
            borderColor=""
            label="Level"
            value={progress.level.toString()}
            sub={`${xpProgress} / 100 XP`}
          />
          <StatCard
            icon={<Flame className="w-5 h-5" />}
            iconColor="text-orange"
            bgGradient=""
            borderColor=""
            label="Streak"
            value={`${progress.streak}d`}
            sub="days in a row"
          />
          <StatCard
            icon={<BookOpen className="w-5 h-5" />}
            iconColor="text-teal"
            bgGradient=""
            borderColor=""
            label="Lessons"
            value={`${progress.lessonsCompleted}/${TOTAL_LESSONS}`}
            sub={`${completionPercent}% complete`}
          />
          <StatCard
            icon={<Zap className="w-5 h-5" />}
            iconColor="text-emerald"
            bgGradient=""
            borderColor=""
            label="Queries Run"
            value={progress.queriesExecuted.toString()}
            sub="total executed"
          />
        </div>

        {/* ── XP Progress bar ───────────────────────────────────────────────────── */}
        <div className="rounded-2xl p-6 mb-6" style={{ background: '#0C1018', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <Trophy className="w-4 h-4" style={{ color: '#F59E0B' }} />
              </div>
              <div>
                <div className="font-semibold text-sm" style={{ color: '#EDF1FA' }}>Level {progress.level}</div>
                <div className="text-xs" style={{ color: '#5C6B8A' }}>{100 - xpProgress} XP to next level</div>
              </div>
            </div>
            <span className="text-sm font-medium" style={{ color: '#5C6B8A' }}>{progress.xp} total XP</span>
          </div>
          <div className="w-full rounded-full h-2.5 overflow-hidden" style={{ background: '#1A2235' }}>
            <div
              className="h-2.5 rounded-full transition-all duration-700 ease-out relative"
              style={{ width: `${Math.max(progressPercent, 2)}%`, background: 'linear-gradient(90deg, #00C7BE, #00E5DC)' }}
            >
              <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse" style={{ animationDuration: '2s' }} />
            </div>
          </div>
        </div>

        {/* ── Two Column ────────────────────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* Achievements */}
          <div className="rounded-2xl p-6" style={{ background: '#0C1018', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="font-semibold text-base mb-4 flex items-center gap-2" style={{ color: '#EDF1FA' }}>
              <Trophy className="w-4 h-4" style={{ color: '#F59E0B' }} />
              Achievements
              <span className="ml-auto text-xs font-normal" style={{ color: '#5C6B8A' }}>{progress.achievements.length} unlocked</span>
            </h2>
            {progress.achievements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10" style={{ color: '#2E3A52' }}>
                <Target className="w-8 h-8 mb-3 opacity-40" />
                <p className="text-sm">Start learning to unlock achievements!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {progress.achievements.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 p-3 rounded-xl transition-colors"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <span className="text-xl shrink-0">{a.icon}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: '#EDF1FA' }}>{a.title}</div>
                      <div className="text-xs truncate" style={{ color: '#5C6B8A' }}>{a.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="rounded-2xl p-6" style={{ background: '#0C1018', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="font-semibold text-base mb-4" style={{ color: '#EDF1FA' }}>Quick Actions</h2>
            <div className="space-y-2.5">
              <QuickLink
                href="/learn"
                icon={<BookOpen className="w-5 h-5" style={{ color: '#00C7BE' }} />}
                iconBg="teal"
                title="Continue Learning"
                sub="Pick up where you left off"
              />
              <QuickLink
                href="/learn"
                icon={<Database className="w-5 h-5" style={{ color: '#22C55E' }} />}
                iconBg="emerald"
                title="SQL Playground"
                sub="Free practice with any engine"
              />
              <QuickLink
                href="/learn"
                icon={<GraduationCap className="w-5 h-5" style={{ color: '#F59E0B' }} />}
                iconBg="amber"
                title="Take a Quiz"
                sub="Test your knowledge"
              />

              {/* Join institution */}
              {profile && !profile.institution_id && (
                <form
                  onSubmit={handleJoinInstitution}
                  className="p-4 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div className="font-medium text-sm mb-1" style={{ color: '#EDF1FA' }}>Join your class</div>
                  <div className="text-xs mb-3" style={{ color: '#5C6B8A' }}>
                    Have an invite code from your school or company?
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="e.g. 3F8A21BC"
                      required
                      className="flex-1 px-3 py-2 rounded-lg text-sm font-mono uppercase focus:outline-none transition-colors"
                      style={{ background: '#07090F', border: '1px solid rgba(255,255,255,0.08)', color: '#EDF1FA' }}
                    />
                    <button
                      type="submit"
                      disabled={joining}
                      className="px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
                      style={{ background: '#00C7BE', color: '#07090F' }}
                    >
                      {joining ? '…' : 'Join'}
                    </button>
                  </div>
                  {joinStatus.error && <p className="text-xs mt-2" style={{ color: '#EF4444' }}>{joinStatus.error}</p>}
                  {joinStatus.ok && <p className="text-xs mt-2" style={{ color: '#22C55E' }}>{joinStatus.ok}</p>}
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────

const STAT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  yellow:  { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.15)',  text: '#F59E0B' },
  orange:  { bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.15)',  text: '#FB923C' },
  teal:    { bg: 'rgba(0,199,190,0.08)',   border: 'rgba(0,199,190,0.15)',   text: '#00C7BE' },
  emerald: { bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.15)',   text: '#22C55E' },
  amber:   { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.15)',  text: '#F59E0B' },
};

function StatCard({
  icon, iconColor, bgGradient, borderColor, label, value, sub,
}: {
  icon: React.ReactNode;
  iconColor: string;
  bgGradient: string;
  borderColor: string;
  label: string;
  value: string;
  sub: string;
}) {
  const colorKey = iconColor.replace('text-', '').split('-')[0];
  const colors = STAT_COLORS[colorKey] ?? STAT_COLORS.teal;
  return (
    <div className="rounded-2xl p-4" style={{ background: colors.bg, border: `1px solid ${colors.border}` }}>
      <div className="flex items-center gap-2 mb-3" style={{ color: colors.text }}>
        {icon}
        <span className="text-xs uppercase tracking-wide font-semibold" style={{ color: '#5C6B8A' }}>{label}</span>
      </div>
      <div className="text-2xl font-bold tracking-tight font-display" style={{ color: '#EDF1FA' }}>{value}</div>
      <div className="text-xs mt-1" style={{ color: '#5C6B8A' }}>{sub}</div>
    </div>
  );
}

// ── QuickLink ─────────────────────────────────────────────────────────────────

const QUICK_COLORS: Record<string, { bg: string; border: string }> = {
  teal:    { bg: 'rgba(0,199,190,0.08)',   border: 'rgba(0,199,190,0.15)'   },
  emerald: { bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.15)'   },
  amber:   { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.15)'  },
  purple:  { bg: 'rgba(168,85,247,0.08)',  border: 'rgba(168,85,247,0.15)'  },
};

function QuickLink({
  href, icon, iconBg, title, sub,
}: {
  href: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  sub: string;
}) {
  const colors = QUICK_COLORS[iconBg] ?? QUICK_COLORS.teal;
  return (
    <Link
      href={href}
      className="flex items-center justify-between p-3.5 rounded-xl transition-all group cursor-pointer"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: colors.bg, border: `1px solid ${colors.border}` }}>
          {icon}
        </div>
        <div>
          <div className="font-medium text-sm" style={{ color: '#EDF1FA' }}>{title}</div>
          <div className="text-xs" style={{ color: '#5C6B8A' }}>{sub}</div>
        </div>
      </div>
      <ArrowRight className="w-4 h-4 shrink-0" style={{ color: '#2E3A52' }} />
    </Link>
  );
}


export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#07090F' }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(0,199,190,0.2)', borderTopColor: '#00C7BE' }} />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
