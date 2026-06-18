'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { useProfile } from '@/lib/use-profile';
import { CURRICULUM } from '@/features/learn/curriculum/curriculum';
import type { UserProgress } from '@/stores/progress-store';
import {
  Database, Users, BookOpen, BarChart3, Settings, Search, Copy, Check,
  TrendingUp, Award, Building2,
} from 'lucide-react';

const TOTAL_LESSONS = CURRICULUM.reduce((sum, m) => sum + m.lessons.length, 0);

interface Institution {
  id: string;
  name: string;
  invite_code: string;
}

interface MemberRow {
  id: string;
  name: string | null;
  email: string | null;
  lessonsCompleted: number;
  quizAverage: number | null;
  streak: number;
  xp: number;
  level: number;
  lastActiveDate: string;
}

function quizAverageFrom(progress?: UserProgress): number | null {
  if (!progress?.lessonProgress) return null;
  const scores = Object.values(progress.lessonProgress)
    .map(lp => lp.quizScore)
    .filter((s): s is number => typeof s === 'number');
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export default function AdminPage() {
  const { profile, loading: profileLoading } = useProfile();
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<'overview' | 'students' | 'curriculum' | 'settings'>('overview');
  const [newOrgName, setNewOrgName] = useState('');
  const [actionError, setActionError] = useState('');
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadData = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: inst } = await supabase
      .from('institutions')
      .select('id, name, invite_code')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (!inst) {
      setLoading(false);
      return;
    }
    setInstitution(inst as Institution);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('institution_id', inst.id);

    const memberIds = (profiles ?? []).map(p => p.id);
    const { data: progressRows } = memberIds.length
      ? await supabase
          .from('user_progress')
          .select('user_id, progress')
          .in('user_id', memberIds)
      : { data: [] };

    const progressByUser = new Map(
      (progressRows ?? []).map(r => [r.user_id, r.progress as UserProgress])
    );

    setMembers(
      (profiles ?? []).map(p => {
        const prog = progressByUser.get(p.id);
        return {
          id: p.id,
          name: p.name,
          email: p.email,
          lessonsCompleted: prog?.lessonsCompleted ?? 0,
          quizAverage: quizAverageFrom(prog),
          streak: prog?.streak ?? 0,
          xp: prog?.xp ?? 0,
          level: prog?.level ?? 1,
          lastActiveDate: prog?.lastActiveDate ?? '',
        };
      })
    );
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');
    setCreating(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc('create_institution', {
        institution_name: newOrgName.trim(),
      });
      if (error) throw new Error(error.message);
      await loadData();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const copyInviteCode = async () => {
    if (!institution) return;
    await navigator.clipboard.writeText(institution.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredStudents = useMemo(
    () =>
      members.filter(
        s =>
          (s.name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.email ?? '').toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [members, searchQuery]
  );

  const today = new Date().toISOString().split('T')[0];
  const activeToday = members.filter(s => s.lastActiveDate === today).length;
  const avgCompletion = members.length
    ? Math.round(members.reduce((sum, s) => sum + s.lessonsCompleted, 0) / members.length)
    : 0;
  const quizAvgs = members.map(m => m.quizAverage).filter((q): q is number => q !== null);
  const avgQuizScore = quizAvgs.length
    ? Math.round(quizAvgs.reduce((a, b) => a + b, 0) / quizAvgs.length)
    : 0;

  // ---------- Render states ----------

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (!isSupabaseConfigured || !profile) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <Building2 className="w-10 h-10 text-slate-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Institution Dashboard</h1>
          <p className="text-slate-400 text-sm mb-6">
            Sign in with an Institution plan account to manage your organization.
          </p>
          <Link href="/auth/signin" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  // Signed in but no institution yet — create one
  if (!institution) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <Building2 className="w-10 h-10 text-blue-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-center mb-2">Create your institution</h1>
          <p className="text-slate-400 text-sm text-center mb-6">
            Set up your school or company, then share the invite code with students.
          </p>

          {profile.plan !== 'institution' ? (
            <div className="text-center">
              <p className="text-sm text-yellow-400 mb-4">
                The Institution plan is required to create an organization.
              </p>
              <Link href="/pricing" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium">
                View Plans
              </Link>
            </div>
          ) : (
            <form onSubmit={handleCreateInstitution} className="space-y-4">
              {actionError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                  {actionError}
                </div>
              )}
              <input
                type="text"
                value={newOrgName}
                onChange={e => setNewOrgName(e.target.value)}
                placeholder="e.g. Springfield University"
                required
                minLength={2}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={creating}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium transition-colors"
              >
                {creating ? 'Creating…' : 'Create Institution'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ---------- Full dashboard ----------

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900 p-4 hidden lg:block">
        <Link href="/" className="flex items-center gap-2 mb-8">
          <Database className="w-5 h-5 text-blue-500" />
          <span className="font-bold">DBAcademy</span>
          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full ml-auto">Admin</span>
        </Link>

        <nav className="space-y-1">
          {[
            { id: 'overview', icon: <BarChart3 className="w-4 h-4" />, label: 'Overview' },
            { id: 'students', icon: <Users className="w-4 h-4" />, label: 'Students' },
            { id: 'curriculum', icon: <BookOpen className="w-4 h-4" />, label: 'Curriculum' },
            { id: 'settings', icon: <Settings className="w-4 h-4" />, label: 'Settings' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as any)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                activeSection === item.id
                  ? 'bg-blue-500/10 text-blue-400 font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        {activeSection === 'overview' && (
          <>
            <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold mb-2">{institution.name}</h1>
                <p className="text-slate-400 text-sm">Monitor student progress and manage your organization.</p>
              </div>
              <button
                onClick={copyInviteCode}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm hover:border-blue-500/50 transition-colors"
                title="Share this code with students so they can join"
              >
                <span className="text-slate-400">Invite code:</span>
                <span className="font-mono font-bold text-blue-400">{institution.invite_code}</span>
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-slate-500" />}
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center gap-2 text-slate-400 mb-2">
                  <Users className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-wide">Total Students</span>
                </div>
                <div className="text-3xl font-bold">{members.length}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center gap-2 text-slate-400 mb-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-wide">Active Today</span>
                </div>
                <div className="text-3xl font-bold">{activeToday}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {members.length ? Math.round((activeToday / members.length) * 100) : 0}% engagement
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center gap-2 text-slate-400 mb-2">
                  <BookOpen className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-wide">Avg. Completion</span>
                </div>
                <div className="text-3xl font-bold">{avgCompletion}</div>
                <div className="text-xs text-slate-500 mt-1">lessons per student</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center gap-2 text-slate-400 mb-2">
                  <Award className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-wide">Avg. Quiz Score</span>
                </div>
                <div className="text-3xl font-bold">{avgQuizScore}%</div>
              </div>
            </div>

            {/* Top Performers */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Top Performers</h2>
              {members.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">
                  No students yet. Share your invite code <span className="font-mono text-blue-400">{institution.invite_code}</span> to get started.
                </p>
              ) : (
                <div className="space-y-3">
                  {[...members]
                    .sort((a, b) => b.xp - a.xp)
                    .slice(0, 3)
                    .map((student, i) => (
                      <div key={student.id} className="flex items-center gap-4 p-3 bg-slate-800/50 rounded-lg">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-sm font-bold">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{student.name ?? student.email}</div>
                          <div className="text-xs text-slate-500">
                            {student.lessonsCompleted} lessons • Level {student.level} • {student.xp} XP
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeSection === 'students' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">Students</h1>
            </div>

            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Students Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Student</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Progress</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Quiz Avg</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Streak</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                        {members.length === 0
                          ? 'No students have joined yet.'
                          : 'No students match your search.'}
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map(student => (
                      <tr key={student.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-sm">{student.name ?? '—'}</div>
                          <div className="text-xs text-slate-500">{student.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-slate-800 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${Math.min(100, (student.lessonsCompleted / TOTAL_LESSONS) * 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-slate-400">{student.lessonsCompleted}/{TOTAL_LESSONS}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {student.quizAverage === null ? (
                            <span className="text-sm text-slate-600">—</span>
                          ) : (
                            <span className={`text-sm font-medium ${student.quizAverage >= 80 ? 'text-green-400' : student.quizAverage >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                              {student.quizAverage}%
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm">{student.streak > 0 ? `🔥 ${student.streak}` : '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-400">{student.lastActiveDate || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeSection === 'curriculum' && (
          <>
            <h1 className="text-2xl font-bold mb-6">Custom Curriculum</h1>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
              <BookOpen className="w-12 h-12 mx-auto text-slate-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Custom Curriculum Builder</h3>
              <p className="text-slate-400 text-sm max-w-md mx-auto mb-4">
                Create custom modules and lessons in the learning app — they are saved per browser today.
                Institution-wide shared curricula are on the roadmap.
              </p>
              <Link href="/learn" className="inline-block px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                Open Learning App
              </Link>
            </div>
          </>
        )}

        {activeSection === 'settings' && (
          <>
            <h1 className="text-2xl font-bold mb-6">Institution Settings</h1>
            <div className="space-y-6 max-w-2xl">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="font-semibold mb-4">Organization</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-slate-400">Name</span>
                    <span>{institution.name}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-slate-400">Invite code</span>
                    <button onClick={copyInviteCode} className="font-mono text-blue-400 hover:text-blue-300 flex items-center gap-1.5">
                      {institution.invite_code}
                      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-400">Students</span>
                    <span>{members.length}</span>
                  </div>
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="font-semibold mb-2">Student Enrollment</h3>
                <p className="text-sm text-slate-400">
                  Students join by entering your invite code on their dashboard. Bulk CSV import and email invitations are on the roadmap.
                </p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
