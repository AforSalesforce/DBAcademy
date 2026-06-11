'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useProgressStore } from '@/lib/progress-store';
import { CURRICULUM } from '@/lib/curriculum';
import { useProfile } from '@/lib/use-profile';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Database, GraduationCap, Trophy, Zap, Flame, Target, BookOpen, ArrowRight, Star, LogOut } from 'lucide-react';

const TOTAL_LESSONS = CURRICULUM.reduce((sum, m) => sum + m.lessons.length, 0);

export default function DashboardPage() {
  const router = useRouter();
  const { progress, updateStreak } = useProgressStore();
  const { profile } = useProfile();

  useEffect(() => {
    updateStreak();
  }, [updateStreak]);

  const handleSignOut = async () => {
    if (!isSupabaseConfigured) return;
    await createClient().auth.signOut();
    router.push('/');
    router.refresh();
  };

  const handleManageBilling = async () => {
    const res = await fetch('/api/billing/portal', { method: 'POST' });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };

  const [inviteCode, setInviteCode] = useState('');
  const [joinStatus, setJoinStatus] = useState<{ ok?: string; error?: string }>({});
  const [joining, setJoining] = useState(false);

  const handleJoinInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinStatus({});
    setJoining(true);
    try {
      const { data, error } = await createClient().rpc('join_institution', {
        code: inviteCode,
      });
      if (error) throw new Error(error.message);
      setJoinStatus({ ok: `Joined ${data?.name ?? 'institution'}!` });
      setInviteCode('');
    } catch (err: any) {
      setJoinStatus({ error: err.message });
    } finally {
      setJoining(false);
    }
  };

  const xpForNextLevel = (progress.level) * 100;
  const xpProgress = progress.xp % 100;
  const progressPercent = (xpProgress / 100) * 100;

  const completionPercent = TOTAL_LESSONS > 0
    ? Math.round((progress.lessonsCompleted / TOTAL_LESSONS) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-3">
                <div className="relative w-8 h-8 flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg">
                  <Database className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-bold">DBAcademy</span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              {profile && (
                <span className="hidden sm:inline-flex items-center gap-2 text-sm text-slate-400">
                  {profile.name || profile.email}
                  <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full uppercase">{profile.plan}</span>
                </span>
              )}
              {profile && profile.plan !== 'free' && (
                <button
                  onClick={handleManageBilling}
                  className="hidden sm:block px-3 py-2 text-sm text-slate-400 hover:text-white border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Manage subscription
                </button>
              )}
              <Link href="/learn" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors">
                Continue Learning
              </Link>
              {profile && (
                <button
                  onClick={handleSignOut}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Your Dashboard</h1>
          <p className="text-slate-400">Track your progress and continue learning.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Star className="w-5 h-5 text-yellow-400" />}
            label="Level"
            value={progress.level.toString()}
            sub={`${xpProgress}/${100} XP`}
          />
          <StatCard
            icon={<Flame className="w-5 h-5 text-orange-400" />}
            label="Streak"
            value={`${progress.streak} days`}
            sub="Keep it going!"
          />
          <StatCard
            icon={<BookOpen className="w-5 h-5 text-blue-400" />}
            label="Lessons"
            value={`${progress.lessonsCompleted}/${TOTAL_LESSONS}`}
            sub={`${completionPercent}% complete`}
          />
          <StatCard
            icon={<Zap className="w-5 h-5 text-green-400" />}
            label="Queries Run"
            value={progress.queriesExecuted.toString()}
            sub="Total executed"
          />
        </div>

        {/* XP Progress Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <span className="font-semibold">Level {progress.level} Progress</span>
            </div>
            <span className="text-sm text-slate-400">{progress.xp} total XP</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <p className="text-xs text-slate-500 mt-2">{100 - xpProgress} XP to Level {progress.level + 1}</p>
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Achievements */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Achievements ({progress.achievements.length})
            </h2>
            {progress.achievements.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Start learning to unlock achievements!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {progress.achievements.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                    <span className="text-2xl">{a.icon}</span>
                    <div>
                      <div className="text-sm font-medium">{a.title}</div>
                      <div className="text-xs text-slate-500">{a.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                href="/learn"
                className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-blue-500/50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">Continue Learning</div>
                    <div className="text-xs text-slate-500">Pick up where you left off</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
              </Link>

              <Link
                href="/learn?tab=schema"
                className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-blue-500/50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <Database className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">SQL Playground</div>
                    <div className="text-xs text-slate-500">Free practice with any engine</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
              </Link>

              <Link
                href="/learn"
                className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-blue-500/50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">Take a Quiz</div>
                    <div className="text-xs text-slate-500">Test your knowledge</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
              </Link>

              {/* Join institution */}
              {profile && !profile.institution_id && (
                <form
                  onSubmit={handleJoinInstitution}
                  className="p-4 bg-slate-800/50 rounded-lg border border-slate-700"
                >
                  <div className="font-medium text-sm mb-1">Join your class</div>
                  <div className="text-xs text-slate-500 mb-3">
                    Have an invite code from your school or company? Enter it here.
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="e.g. 3F8A21BC"
                      required
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm font-mono uppercase placeholder-slate-600 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={joining}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
                    >
                      {joining ? '…' : 'Join'}
                    </button>
                  </div>
                  {joinStatus.error && (
                    <p className="text-xs text-red-400 mt-2">{joinStatus.error}</p>
                  )}
                  {joinStatus.ok && (
                    <p className="text-xs text-green-400 mt-2">{joinStatus.ok}</p>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{sub}</div>
    </div>
  );
}
