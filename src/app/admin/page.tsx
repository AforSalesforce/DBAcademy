'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createInstitution, loadInstitutionDashboard } from '@/features/institutions/actions';
import type { Institution, MemberRow } from '@/features/institutions/types';
import { useProfile } from '@/lib/use-profile';
import { TOTAL_PATH_LESSONS as TOTAL_LESSONS } from '@/features/learn/curriculum/path';
import { localDay } from '@/features/learn/streak';
import {
  Database, Users, BookOpen, BarChart3, Settings, Search, Copy, Check,
  TrendingUp, Award, Building2, Flame,
} from 'lucide-react';

type Section = 'overview' | 'students' | 'settings';

const SECTIONS: { id: Section; label: string; Icon: typeof BarChart3 }[] = [
  { id: 'overview', label: 'Overview', Icon: BarChart3 },
  { id: 'students', label: 'Students', Icon: Users },
  { id: 'settings', label: 'Settings', Icon: Settings },
];

export default function AdminPage() {
  const { profile, loading: profileLoading } = useProfile();
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const [newOrgName, setNewOrgName] = useState('');
  const [actionError, setActionError] = useState('');
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadData = async () => {
    try {
      const { institution: inst, members: rows } = await loadInstitutionDashboard();
      setInstitution(inst);
      setMembers(rows);
    } catch {
      setActionError('Could not load your organization. Try refreshing.');
    } finally {
      setLoading(false);
    }
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
      const { error } = await createInstitution(newOrgName);
      if (error) throw new Error(error);
      await loadData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Could not create organization.');
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

  // Students record activity on their own local day; compare with ours.
  const today = localDay();
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
      <div className="min-h-screen bg-canvas text-ink flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-canvas text-ink flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <Building2 className="w-10 h-10 text-muted mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Institution Dashboard</h1>
          <p className="text-muted text-sm mb-6">
            Sign in with an Institution plan account to manage your organization.
          </p>
          <Link href="/auth/signin" className="px-4 py-2 bg-accent hover:bg-accent/90 rounded-lg text-sm font-medium text-canvas">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  // Signed in but no institution yet — create one
  if (!institution) {
    return (
      <div className="min-h-screen bg-canvas text-ink flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-surface border border-line rounded-2xl p-8">
          <Building2 className="w-10 h-10 text-accent mx-auto mb-4" />
          <h1 className="text-xl font-bold text-center mb-2">Create your institution</h1>
          <p className="text-muted text-sm text-center mb-6">
            Set up your school or company, then share the invite code with students.
          </p>

          {profile.plan !== 'institution' ? (
            <div className="text-center">
              <p className="text-sm text-warm mb-4">
                The Institution plan is required to create an organization.
              </p>
              <Link href="/pricing" className="px-4 py-2 bg-accent hover:bg-accent/90 rounded-lg text-sm font-medium text-canvas">
                View Plans
              </Link>
            </div>
          ) : (
            <form onSubmit={handleCreateInstitution} className="space-y-4">
              {actionError && (
                <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm text-center">
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
                className="w-full px-4 py-3 bg-card border border-white/10 rounded-lg text-ink placeholder-faint focus:outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={creating}
                className="w-full py-3 bg-accent hover:bg-accent/90 disabled:opacity-50 rounded-lg font-medium transition-colors text-canvas"
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
    <div className="min-h-screen bg-canvas text-ink flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-line bg-surface p-4 hidden lg:block">
        <Link href="/" className="flex items-center gap-2 mb-8">
          <Database className="w-5 h-5 text-accent" />
          <span className="font-bold">DBAcademy</span>
          <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full ml-auto">Admin</span>
        </Link>

        <nav className="space-y-1" aria-label="Admin sections">
          {SECTIONS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              aria-current={activeSection === id ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                activeSection === id
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'text-muted hover:text-ink hover:bg-card'
              }`}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        {/* Below lg the sidebar is hidden: switch sections here instead. */}
        <nav className="lg:hidden flex gap-1 mb-6 p-1 rounded-lg bg-surface border border-line overflow-x-auto" aria-label="Admin sections">
          {SECTIONS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              aria-current={activeSection === id ? 'page' : undefined}
              className={`flex-1 min-h-[44px] flex items-center justify-center gap-2 px-3 rounded-md text-sm whitespace-nowrap ${
                activeSection === id ? 'bg-accent/10 text-accent font-medium' : 'text-muted hover:text-ink'
              }`}
            >
              <Icon className="w-4 h-4" aria-hidden="true" /> {label}
            </button>
          ))}
        </nav>
        {activeSection === 'overview' && (
          <>
            <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold mb-2">{institution.name}</h1>
                <p className="text-muted text-sm">Monitor student progress and manage your organization.</p>
              </div>
              <button
                onClick={copyInviteCode}
                className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-white/10 rounded-lg text-sm hover:border-accent/50 transition-colors"
                title="Share this code with students so they can join"
              >
                <span className="text-muted">Invite code:</span>
                <span className="font-mono font-bold text-accent">{institution.invite_code}</span>
                {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4 text-faint" />}
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-surface border border-line rounded-xl p-5">
                <div className="flex items-center gap-2 text-muted mb-2">
                  <Users className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-wide">Total Students</span>
                </div>
                <div className="text-3xl font-bold">{members.length}</div>
              </div>
              <div className="bg-surface border border-line rounded-xl p-5">
                <div className="flex items-center gap-2 text-muted mb-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-wide">Active Today</span>
                </div>
                <div className="text-3xl font-bold">{activeToday}</div>
                <div className="text-xs text-faint mt-1">
                  {members.length ? Math.round((activeToday / members.length) * 100) : 0}% engagement
                </div>
              </div>
              <div className="bg-surface border border-line rounded-xl p-5">
                <div className="flex items-center gap-2 text-muted mb-2">
                  <BookOpen className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-wide">Avg. Completion</span>
                </div>
                <div className="text-3xl font-bold">{avgCompletion}</div>
                <div className="text-xs text-faint mt-1">lessons per student</div>
              </div>
              <div className="bg-surface border border-line rounded-xl p-5">
                <div className="flex items-center gap-2 text-muted mb-2">
                  <Award className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-wide">Avg. Quiz Score</span>
                </div>
                <div className="text-3xl font-bold">{avgQuizScore}%</div>
              </div>
            </div>

            {/* Top Performers */}
            <div className="bg-surface border border-line rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Top Performers</h2>
              {members.length === 0 ? (
                <p className="text-sm text-faint text-center py-6">
                  No students yet. Share your invite code <span className="font-mono text-accent">{institution.invite_code}</span> to get started.
                </p>
              ) : (
                <div className="space-y-3">
                  {[...members]
                    .sort((a, b) => b.xp - a.xp)
                    .slice(0, 3)
                    .map((student, i) => (
                      <div key={student.id} className="flex items-center gap-4 p-3 bg-card/50 rounded-lg">
                        <div className="w-8 h-8 bg-accent/15 text-accent rounded-full flex items-center justify-center text-sm font-bold">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{student.name ?? student.email}</div>
                          <div className="text-xs text-faint">
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-surface border border-line rounded-lg text-sm focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            {/* Students Table */}
            <div className="bg-surface border border-line rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Student</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Progress</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Quiz Avg</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Streak</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-faint">
                        {members.length === 0
                          ? 'No students have joined yet.'
                          : 'No students match your search.'}
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map(student => (
                      <tr key={student.id} className="border-b border-line/50 hover:bg-card/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-sm">{student.name ?? '—'}</div>
                          <div className="text-xs text-faint">{student.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-card rounded-full h-2">
                              <div
                                className="bg-accent h-2 rounded-full text-canvas"
                                style={{ width: `${Math.min(100, (student.lessonsCompleted / TOTAL_LESSONS) * 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-muted">{student.lessonsCompleted}/{TOTAL_LESSONS}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {student.quizAverage === null ? (
                            <span className="text-sm text-muted">—</span>
                          ) : (
                            <span className={`text-sm font-medium ${student.quizAverage >= 80 ? 'text-success' : student.quizAverage >= 60 ? 'text-warm' : 'text-danger'}`}>
                              {student.quizAverage}%
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {student.streak > 0 ? (
                            <span className="inline-flex items-center gap-1 text-sm">
                              <Flame className="w-3.5 h-3.5 text-warm" aria-hidden="true" /> {student.streak}
                              <span className="sr-only">day streak</span>
                            </span>
                          ) : (
                            <span className="text-sm text-faint">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted">{student.lastActiveDate || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeSection === 'settings' && (
          <>
            <h1 className="text-2xl font-bold mb-6">Institution Settings</h1>
            <div className="space-y-6 max-w-2xl">
              <div className="bg-surface border border-line rounded-xl p-6">
                <h3 className="font-semibold mb-4">Organization</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-line">
                    <span className="text-muted">Name</span>
                    <span>{institution.name}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-line">
                    <span className="text-muted">Invite code</span>
                    <button onClick={copyInviteCode} className="font-mono text-accent hover:text-accent flex items-center gap-1.5">
                      {institution.invite_code}
                      {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted">Students</span>
                    <span>{members.length}</span>
                  </div>
                </div>
              </div>
              <div className="bg-surface border border-line rounded-xl p-6">
                <h3 className="font-semibold mb-2">Student Enrollment</h3>
                <p className="text-sm text-muted">
                  Students join by entering your invite code on their dashboard.
                </p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
