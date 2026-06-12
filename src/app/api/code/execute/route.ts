import { NextRequest, NextResponse } from 'next/server';

// JavaScript and Python run entirely client-side (Web Worker / Pyodide).
// Only compiled/server languages reach this route.
const ALLOWED_LANGUAGES = new Set([
  'java', 'c', 'cpp', 'go', 'rust', 'ruby', 'kotlin', 'swift', 'typescript',
]);

// Judge0 CE language IDs — https://github.com/judge0/judge0/blob/master/docs/languages/README.md
const JUDGE0_LANG_ID: Record<string, number> = {
  c:          50,   // GCC 9.2.0
  cpp:        54,   // GCC 9.2.0
  java:       62,   // OpenJDK 13.0.1
  go:         60,   // Go 1.13.5
  typescript: 74,   // TypeScript 3.7.4
  ruby:       72,   // Ruby 2.7.0
  kotlin:     78,   // Kotlin 1.3.70
  rust:       73,   // Rust 1.40.0
  swift:      83,   // Swift 5.2.3
};

// Judge0 status IDs that indicate the program ran (vs compile error / TLE etc.)
const JUDGE0_COMPILE_ERROR = 6;
const JUDGE0_TLE           = 5;

const MAX_CODE_BYTES  = 50_000;
const MAX_STDIN_BYTES = 1_000;

// Judge0 endpoint — set JUDGE0_API_URL for self-hosted, defaults to RapidAPI CE host.
// For RapidAPI, also set JUDGE0_API_KEY to your X-RapidAPI-Key.
const JUDGE0_BASE = (process.env.JUDGE0_API_URL ?? 'https://judge0-ce.p.rapidapi.com').replace(/\/$/, '');
const JUDGE0_KEY  = process.env.JUDGE0_API_KEY ?? '';

// ── In-memory rate limiter ────────────────────────────────────────────────────
const RATE_LIMIT     = 20;
const RATE_WINDOW_MS = 60_000;

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

  // 1. Auth — require signed-in user when Supabase is configured.
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
      rateLimitKey = user.id;
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

  // 4. Validate
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

  const languageId = JUDGE0_LANG_ID[language];
  if (!languageId) {
    return NextResponse.json({ error: `No Judge0 language ID mapped for '${language}'.` }, { status: 400 });
  }

  // 5. Submit to Judge0 (synchronous mode — wait=true)
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (JUDGE0_KEY) {
      headers['X-RapidAPI-Key']  = JUDGE0_KEY;
      headers['X-RapidAPI-Host'] = new URL(JUDGE0_BASE).hostname;
    }

    const j0Res = await fetch(`${JUDGE0_BASE}/submissions?base64_encoded=false&wait=true`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        language_id:      languageId,
        source_code:      code,
        stdin:            stdin || '',
        cpu_time_limit:   10,
        wall_time_limit:  15,
      }),
    });

    if (!j0Res.ok) {
      const text = await j0Res.text().catch(() => '');
      return NextResponse.json(
        { error: `Execution service returned ${j0Res.status}: ${text.slice(0, 300)}` },
        { status: 502 },
      );
    }

    const data = await j0Res.json() as {
      stdout:          string | null;
      stderr:          string | null;
      compile_output:  string | null;
      status:          { id: number; description: string };
      time:            string | null;
      memory:          number | null;
    };

    const statusId = data.status?.id ?? 0;

    // Compilation error
    if (statusId === JUDGE0_COMPILE_ERROR) {
      return NextResponse.json({
        stdout:   '',
        stderr:   (data.compile_output || data.stderr || 'Compilation failed.').trim(),
        exitCode: 1,
      });
    }

    // Time limit exceeded
    if (statusId === JUDGE0_TLE) {
      return NextResponse.json({
        stdout:   (data.stdout ?? '').trim(),
        stderr:   'Time limit exceeded (10 seconds).',
        exitCode: 124,
      });
    }

    // Runtime error or accepted — pass through stdout/stderr
    const exitCode = statusId === 3 ? 0 : 1;
    return NextResponse.json({
      stdout:   (data.stdout ?? '').trim(),
      stderr:   (data.stderr ?? data.compile_output ?? '').trim(),
      exitCode,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'network error';
    return NextResponse.json(
      { error: `Could not reach execution service: ${msg}` },
      { status: 503 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    languages: [...ALLOWED_LANGUAGES],
    backend: JUDGE0_KEY ? 'judge0-rapidapi' : 'judge0-self-hosted',
    endpoint: JUDGE0_BASE,
  });
}
