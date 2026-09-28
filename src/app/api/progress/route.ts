import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/supabase/server';

const MAX_BODY_BYTES = 256_000;

/** The signed-in user's saved progress, or `{ progress: null }` if none yet. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const { data, error } = await session.supabase
    .from('user_progress')
    .select('progress')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (error) {
    console.error('GET /api/progress failed:', error.message);
    return NextResponse.json({ error: 'Could not load progress' }, { status: 500 });
  }
  return NextResponse.json({ progress: data?.progress ?? null });
}

/** Replaces the signed-in user's progress with `{ progress }`. */
export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Progress payload too large' }, { status: 413 });
  }

  let progress: unknown;
  try {
    progress = (JSON.parse(raw) as { progress?: unknown }).progress;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!progress || typeof progress !== 'object' || Array.isArray(progress)) {
    return NextResponse.json({ error: 'Body must be { progress: {...} }' }, { status: 400 });
  }

  const { error } = await session.supabase.from('user_progress').upsert({
    user_id: session.user.id,
    progress,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error('PUT /api/progress failed:', error.message);
    return NextResponse.json({ error: 'Could not save progress' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
