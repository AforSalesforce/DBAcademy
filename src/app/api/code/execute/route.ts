import { NextRequest, NextResponse } from 'next/server';

// Languages that require server-side execution via Piston.
// JavaScript and Python run entirely client-side (Web Worker / Pyodide) and
// never reach this route.
const ALLOWED_LANGUAGES = new Set([
  'java', 'c', 'cpp', 'go', 'rust', 'ruby', 'kotlin', 'swift', 'typescript',
]);

const MAX_CODE_BYTES  = 50_000; // 50 KB
const MAX_STDIN_BYTES = 1_000;  // 1 KB

// Default to the public Piston endpoint; override via env for self-hosted.
const PISTON_BASE = process.env.PISTON_URL ?? 'https://emkc.org/api/v2/piston';

// ── In-memory rate limiter ────────────────────────────────────────────────────
// Effective for dev and warm serverless invocations.
// For distributed production enforcement, replace with Upstash Redis:
//   https://upstash.com/docs/redis/sdks/ratelimit-ts/overview
const RATE_LIMIT     = 20;      // max executions per window
const RATE_WINDOW_MS = 60_000;  // 1 minute

interface Bucket { count: number; resetAt: number }
const rateMap = new Map<string, Bucket>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const b = rateMap.get(key);
  if (!b || now > b.resetAt) {
    rateMap.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  if (b.count >= RATE_LIMIT) return true;
  b.count++;
  return false;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {

  // 1. Auth — require a signed-in user when Supabase is configured.
  //    Unauthenticated dev mode still goes through; just rate-limits by IP.
  let rateLimitKey = req.headers.get('x-forwarded-for')
    ?? req.headers.get('x-real-ip')
    ?? 'unknown';

  const supabaseConfigured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (supabaseConfigured) {
    try {
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required. Sign in to run server-executed languages.' },
          { status: 401 },
        );
      }
      rateLimitKey = user.id; // user ID is more stable than IP for rate limiting
    } catch {
      return NextResponse.json(
        { error: 'Could not verify authentication. Try again.' },
        { status: 401 },
      );
    }
  }

  // 2. Rate limit
  if (isRateLimited(rateLimitKey)) {
    return NextResponse.json(
      { error: 'Rate limit reached (20 runs/min). Wait a moment and try again.' },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  }

  // 3. Parse body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const language = typeof body.language === 'string' ? body.language : '';
  const code     = typeof body.code     === 'string' ? body.code     : '';
  const stdin    = typeof body.stdin    === 'string' ? body.stdin    : '';

  // 4. Validate input
  if (!ALLOWED_LANGUAGES.has(language)) {
    return NextResponse.json({
      error: `'${language || '(none)'}' is not a supported server-executed language. ` +
             `Supported: ${[...ALLOWED_LANGUAGES].join(', ')}. ` +
             `JavaScript and Python run in your browser directly.`,
    }, { status: 400 });
  }

  if (!code.trim()) {
    return NextResponse.json({ error: 'No code provided.' }, { status: 400 });
  }
  if (Buffer.byteLength(code, 'utf8') > MAX_CODE_BYTES) {
    return NextResponse.json({ error: 'Code exceeds the 50 KB maximum.' }, { status: 400 });
  }
  if (Buffer.byteLength(stdin, 'utf8') > MAX_STDIN_BYTES) {
    return NextResponse.json({ error: 'Stdin exceeds the 1 KB maximum.' }, { status: 400 });
  }

  // 5. Proxy to Piston
  try {
    const pistonRes = await fetch(`${PISTON_BASE}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language,
        version: '*',
        files: [{ content: code }],
        stdin,
        compile_timeout: 15_000,
        run_timeout: 10_000,
      }),
    });

    if (!pistonRes.ok) {
      const text = await pistonRes.text().catch(() => '');
      return NextResponse.json(
        { error: `Execution service returned ${pistonRes.status}: ${text.slice(0, 200)}` },
        { status: 502 },
      );
    }

    const data = await pistonRes.json() as {
      compile?: { stdout?: string; stderr?: string; code?: number };
      run:      { stdout?: string; stderr?: string; code?: number };
    };

    // Compile step failed → surface compiler errors as stderr
    if (data.compile && (data.compile.code ?? 0) !== 0) {
      return NextResponse.json({
        stdout:   '',
        stderr:   (data.compile.stderr || data.compile.stdout || 'Compilation failed.').trim(),
        exitCode: data.compile.code ?? 1,
      });
    }

    return NextResponse.json({
      stdout:   (data.run.stdout ?? '').trim(),
      stderr:   (data.run.stderr ?? '').trim(),
      exitCode: data.run.code ?? 0,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'network error';
    return NextResponse.json(
      { error: `Could not reach execution service: ${msg}` },
      { status: 503 },
    );
  }
}

// Expose the list of server-executed languages so the UI can show which
// languages need the server vs which run client-side.
export async function GET() {
  return NextResponse.json({
    languages: [...ALLOWED_LANGUAGES],
    pistonUrl: process.env.PISTON_URL ? 'custom' : 'public',
  });
}
