'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useProgressStore, currentStreak, ACHIEVEMENTS } from '@/stores/progress-store';
import {
  ENGINE_LABEL, TOTAL_PATH_LESSONS, completedPathLessons, moduleProgress, nextIncompleteStep,
} from '@/features/learn/curriculum/path';
import { useProfile } from '@/lib/use-profile';
import { SiteFooter } from '@/components/SiteFooter';
import { signOut } from '@/features/auth/actions';
import { joinInstitution } from '@/features/institutions/actions';
import { useFeatures } from '@/components/FeaturesProvider';
import {
  Database, GraduationCap, Trophy, Zap, Flame,
  BookOpen, ArrowRight, Star, LogOut, Play, CheckCircle, X, Lock, Code2, HardDrive,
  Wand2, BadgeCheck, Sparkles, Gem, Crown, type LucideIcon,
} from 'lucide-react';

/** One icon per achievement (the stored emoji is ignored: no emoji as UI icons). */
const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  'first-query': Zap,
  'ten-queries': Zap,
  'hundred-queries': Wand2,
  'first-lesson': BookOpen,
  'five-lessons': GraduationCap,
  'perfect-quiz': BadgeCheck,
  'streak-3': Flame,
  'streak-7': Flame,
  'streak-30': Crown,
  'level-5': Sparkles,
  'level-10': Gem,
};


function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { progress } = useProgressStore();
  const { profile } = useProfile();
  const { accounts } = useFeatures();

  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState('');
  const billingStatus = accounts ? searchParams.get('billing') : null;


  // Clear the ?billing= param from the URL after reading it (clean UX)
  useEffect(() => {
    if (billingStatus) {
      const url = new URL(window.location.href);
      url.searchParams.delete('billing');
      window.history.replaceState({}, '', url.toString());
    }
  }, [billingStatus]);

  const handleSignOut = async () => {
    await signOut();
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
      const { name, error } = await joinInstitution(inviteCode);
      if (error) throw new Error(error);
      setJoinStatus({ ok: `Joined ${name ?? 'institution'}!` });
      setInviteCode('');
    } catch (err: unknown) {
      setJoinStatus({ error: err instanceof Error ? err.message : 'Could not join institution.' });
    } finally {
      setJoining(false);
    }
  };

  const xpProgress = progress.xp % 100;
  const progressPercent = (xpProgress / 100) * 100;
  // Path progress counts built-in lessons only (not code-playground or custom ones).
  const isComplete = (id: string) => Boolean(progress.lessonProgress[id]?.completed);
  const lessonsDone = completedPathLessons(isComplete);
  const completionPercent = Math.round((lessonsDone / TOTAL_PATH_LESSONS) * 100);
  const next = nextIncompleteStep(isComplete);
  const continueHref = next ? `/learn?lesson=${encodeURIComponent(next.lesson.id)}` : '/learn';
  const modules = moduleProgress(isComplete);
  const streak = currentStreak(progress);
  const unlocked = new Map(progress.achievements.map(a => [a.id, a]));

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
                <span className="hidden sm:inline-flex items-center gap-2 text-sm" style={{ color: '#8A97B3' }}>
                  {profile.name || profile.email}
                  <span className="text-xs px-2 py-0.5 rounded-full uppercase font-semibold" style={{ background: 'rgba(0,199,190,0.1)', color: '#00C7BE', border: '1px solid rgba(0,199,190,0.2)' }}>
                    {profile.plan}
                  </span>
                </span>
              )}
              {accounts && profile && profile.plan !== 'free' && (
                <button
                  onClick={handleManageBilling}
                  disabled={billingLoading}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors cursor-pointer rounded-lg disabled:opacity-60"
                  style={{ color: '#8A97B3', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {billingLoading ? (
                    <><div className="w-3.5 h-3.5 rounded-full border-2 border-current/30 border-t-current animate-spin" /> Opening…</>
                  ) : 'Manage subscription'}
                </button>
              )}
              <Link
                href={continueHref}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer"
                style={{ background: '#00C7BE', color: '#07090F' }}
              >
                <Play className="w-3.5 h-3.5" /> Continue
              </Link>
              {profile && (
                <button
                  onClick={handleSignOut}
                  className="p-2 text-muted hover:text-ink hover:bg-card rounded-lg transition-colors cursor-pointer"
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
              <p className="text-xs mt-0.5" style={{ color: '#8A97B3' }}>Your plan has been upgraded. All features are now unlocked.</p>
            </div>
          </div>
        )}
        {billingStatus === 'cancelled' && (
          <div className="flex items-center gap-3 mb-6 p-4 rounded-xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <X className="w-5 h-5 shrink-0" style={{ color: '#F59E0B' }} />
            <div>
              <p className="font-semibold text-sm" style={{ color: '#F59E0B' }}>Checkout cancelled</p>
              <p className="text-xs mt-0.5" style={{ color: '#8A97B3' }}>No charges were made. You can upgrade anytime from the <Link href="/pricing" className="underline">pricing page</Link>.</p>
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
          <p style={{ color: '#8A97B3' }}>Track your progress and keep the streak alive.</p>
          {/* Learners worry about losing progress: say plainly where it lives. */}
          <p className="flex items-start gap-2 text-sm mt-3" style={{ color: '#B4BED3' }}>
            <HardDrive className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#8A97B3' }} aria-hidden="true" />
            {accounts && profile
              ? 'Your progress is saved in this browser and synced to your account.'
              : 'Your progress is saved in this browser only. Clearing your browsing data, using a private window or switching device starts you afresh.'}
          </p>
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
            value={`${streak}d`}
            sub={streak > 0 ? 'days in a row' : 'Finish a lesson today to start one'}
          />
          <StatCard
            icon={<BookOpen className="w-5 h-5" />}
            iconColor="text-teal"
            bgGradient=""
            borderColor=""
            label="Lessons"
            value={`${lessonsDone}/${TOTAL_PATH_LESSONS}`}
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
                <div className="text-xs" style={{ color: '#8A97B3' }}>{100 - xpProgress} XP to next level</div>
              </div>
            </div>
            <span className="text-sm font-medium" style={{ color: '#8A97B3' }}>{progress.xp} total XP</span>
          </div>
          <div className="w-full rounded-full h-2.5 overflow-hidden" style={{ background: '#1A2235' }}>
            <div
              className="h-2.5 rounded-full transition-all duration-700 ease-out relative"
              style={{ width: `${Math.max(progressPercent, 2)}%`, background: 'linear-gradient(90deg, #00C7BE, #00E5DC)' }}
            >
              <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse motion-reduce:animate-none" style={{ animationDuration: '2s' }} />
            </div>
          </div>
          <p className="text-xs mt-3" style={{ color: '#8A97B3' }}>
            How XP works: up to 25 per lesson (5 less for each hint), 50 the first time you pass a quiz, and 2 for each new query you run (up to 40 a day; running the same query again doesn&apos;t count).
          </p>
        </div>

        {/* ── Next up + path ───────────────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-3 lg:items-start gap-6 mb-6">
          {/* Next up */}
          <div className="rounded-2xl p-6 flex flex-col" style={{ background: '#0C1018', border: '1px solid rgba(0,199,190,0.2)' }}>
            <h2 className="font-semibold text-base mb-4" style={{ color: '#EDF1FA' }}>Next up</h2>
            {next ? (
              <>
                <p className="text-xs mb-1" style={{ color: '#8A97B3' }}>
                  Module {next.moduleNumber}: {next.module.title} · {ENGINE_LABEL[next.module.engine]}
                </p>
                <p className="text-lg font-semibold mb-5" style={{ color: '#EDF1FA' }}>{next.lesson.title}</p>
                <Link
                  href={continueHref}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold mb-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
                  style={{ background: '#00C7BE', color: '#07090F' }}
                >
                  {lessonsDone === 0 ? 'Start the first lesson' : 'Continue'} <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </>
            ) : (
              <p className="text-sm mb-5" style={{ color: '#B4BED3' }}>
                You&apos;ve completed all {TOTAL_PATH_LESSONS} lessons. Revisit any of them from the path.
              </p>
            )}
            <div className="space-y-2.5">
              <QuickLink
                href="/learn"
                icon={<Database className="w-5 h-5" style={{ color: '#22C55E' }} />}
                iconBg="emerald"
                title="SQL playground"
                sub="Free practice on any engine"
              />
              <QuickLink
                href="/code"
                icon={<Code2 className="w-5 h-5" style={{ color: '#F59E0B' }} />}
                iconBg="amber"
                title="Code sandbox"
                sub="JavaScript and Python in the browser"
              />
              {/* Join institution */}
              {profile && !profile.institution_id && (
                <form
                  onSubmit={handleJoinInstitution}
                  className="p-4 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div className="font-medium text-sm mb-1" style={{ color: '#EDF1FA' }}>Join your class</div>
                  <div className="text-xs mb-3" style={{ color: '#8A97B3' }}>
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

          {/* Your path */}
          <div className="lg:col-span-2 rounded-2xl p-6" style={{ background: '#0C1018', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="font-semibold text-base mb-4 flex items-center gap-2" style={{ color: '#EDF1FA' }}>
              <BookOpen className="w-4 h-4" style={{ color: '#00C7BE' }} aria-hidden="true" />
              Your path
              <span className="ml-auto text-xs font-normal" style={{ color: '#8A97B3' }}>{completionPercent}% complete</span>
            </h2>
            <ol className="space-y-1.5">
              {modules.map(m => {
                const pct = Math.round((m.done / m.total) * 100);
                const finished = m.done === m.total;
                return (
                  <li key={m.module.id}>
                    <Link
                      href={`/learn?lesson=${encodeURIComponent(m.resumeLesson.id)}`}
                      className="flex items-center gap-3 p-2.5 rounded-xl transition-colors hover:bg-white/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-400"
                    >
                      <span
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={finished
                          ? { background: 'rgba(34,197,94,0.15)', color: '#22C55E' }
                          : { background: 'rgba(255,255,255,0.05)', color: '#B4BED3' }}
                      >
                        {finished ? <CheckCircle className="w-4 h-4" aria-label="Complete" /> : m.moduleNumber}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-2 text-sm font-medium" style={{ color: '#EDF1FA' }}>
                          <span className="truncate">{m.module.title}</span>
                          <span className="text-[10px] uppercase tracking-wide shrink-0" style={{ color: '#8A97B3' }}>{ENGINE_LABEL[m.module.engine]}</span>
                        </span>
                        <span className="block h-1.5 mt-1.5 rounded-full overflow-hidden" style={{ background: '#1A2235' }}>
                          <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: finished ? '#22C55E' : '#00C7BE' }} />
                        </span>
                      </span>
                      <span className="text-xs tabular-nums w-10 text-right shrink-0" style={{ color: '#8A97B3' }}>{m.done}/{m.total}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        {/* ── Achievements: unlocked ones, and locked ones as goals ─────────── */}
        <div className="rounded-2xl p-6" style={{ background: '#0C1018', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 className="font-semibold text-base mb-4 flex items-center gap-2" style={{ color: '#EDF1FA' }}>
            <Trophy className="w-4 h-4" style={{ color: '#F59E0B' }} aria-hidden="true" />
            Achievements
            <span className="ml-auto text-xs font-normal" style={{ color: '#8A97B3' }}>{unlocked.size} of {ACHIEVEMENTS.length} unlocked</span>
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ACHIEVEMENTS.map(a => {
              const got = unlocked.get(a.id);
              return (
                <li
                  key={a.id}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{
                    background: got ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${got ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)'}`,
                  }}
                >
                  {(() => {
                    const Icon = ACHIEVEMENT_ICONS[a.id] ?? Trophy;
                    return (
                      <span
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={got
                          ? { background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }
                          : { background: 'rgba(255,255,255,0.04)', color: '#7A87A5' }}
                        aria-hidden="true"
                      >
                        <Icon className="w-4 h-4" />
                      </span>
                    );
                  })()}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate" style={{ color: got ? '#EDF1FA' : '#B4BED3' }}>{a.title}</div>
                    <div className="text-xs truncate" style={{ color: '#8A97B3' }}>{a.description}</div>
                  </div>
                  {!got && <Lock className="w-3.5 h-3.5 shrink-0" style={{ color: '#8A97B3' }} aria-label="Locked" />}
                </li>
              );
            })}
          </ul>
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
        <span className="text-xs uppercase tracking-wide font-semibold" style={{ color: '#8A97B3' }}>{label}</span>
      </div>
      <div className="text-2xl font-bold tracking-tight font-display" style={{ color: '#EDF1FA' }}>{value}</div>
      <div className="text-xs mt-1" style={{ color: '#8A97B3' }}>{sub}</div>
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
          <div className="text-xs" style={{ color: '#8A97B3' }}>{sub}</div>
        </div>
      </div>
      <ArrowRight className="w-4 h-4 shrink-0" style={{ color: '#7A87A5' }} />
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
