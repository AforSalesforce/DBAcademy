import { NextResponse } from 'next/server';
import { getSession } from '@/lib/supabase/server';

/** The signed-in user's profile row, or `{ profile: null }` when signed out. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ profile: null });

  const { data, error } = await session.supabase
    .from('profiles')
    .select('id, email, name, role, plan, institution, institution_id')
    .eq('id', session.user.id)
    .maybeSingle();

  if (error) {
    console.error('GET /api/me failed:', error.message);
    return NextResponse.json({ error: 'Could not load profile' }, { status: 500 });
  }
  return NextResponse.json({ profile: data ?? null });
}
