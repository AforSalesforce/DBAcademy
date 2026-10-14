'use server';

import { getSession } from '@/lib/supabase/server';
import type { UserProgress } from '@/stores/progress-store';
import { quizAverageFrom, pathLessonsFrom, streakFrom, type Institution, type MemberRow } from './types';

/**
 * The institution the caller owns, with a progress summary per member.
 * RLS ("Owners manage own institution", "Owners read member profiles/progress")
 * is what actually limits this to the caller's own members.
 */
export async function loadInstitutionDashboard(): Promise<{
  institution: Institution | null;
  members: MemberRow[];
}> {
  const empty = { institution: null, members: [] };
  const session = await getSession();
  if (!session) return empty;
  const { supabase, user } = session;

  const { data: inst } = await supabase
    .from('institutions')
    .select('id, name, invite_code')
    .eq('owner_id', user.id)
    .maybeSingle();
  if (!inst) return empty;

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, email')
    .eq('institution_id', inst.id);

  const memberIds = (profiles ?? []).map(p => p.id);
  const { data: progressRows } = memberIds.length
    ? await supabase.from('user_progress').select('user_id, progress').in('user_id', memberIds)
    : { data: [] };

  const progressByUser = new Map(
    (progressRows ?? []).map(r => [r.user_id as string, r.progress as UserProgress])
  );

  return {
    institution: inst as Institution,
    members: (profiles ?? []).map(p => {
      const prog = progressByUser.get(p.id);
      return {
        id: p.id,
        name: p.name,
        email: p.email,
        lessonsCompleted: pathLessonsFrom(prog),
        quizAverage: quizAverageFrom(prog),
        streak: streakFrom(prog),
        xp: prog?.xp ?? 0,
        level: prog?.level ?? 1,
        lastActiveDate: prog?.lastActiveDate ?? '',
      };
    }),
  };
}

/** Creates an institution owned by the caller (the RPC re-checks the Institution plan). */
export async function createInstitution(name: string): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: 'Not signed in.' };
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) return { error: 'Organization name is required.' };

  const { error } = await session.supabase.rpc('create_institution', { institution_name: trimmed });
  return error ? { error: error.message } : {};
}

/** Joins the institution with this invite code. */
export async function joinInstitution(code: string): Promise<{ name?: string; error?: string }> {
  const session = await getSession();
  if (!session) return { error: 'Not signed in.' };
  if (typeof code !== 'string' || !code.trim()) return { error: 'Enter an invite code.' };

  const { data, error } = await session.supabase.rpc('join_institution', { code });
  if (error) return { error: error.message };
  return { name: (data as Institution | null)?.name };
}
