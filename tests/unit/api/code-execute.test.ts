import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

const supabaseMock = {
  auth: { getUser: vi.fn() },
  rpc: vi.fn(),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => supabaseMock,
}));

const fetchMock = vi.fn();

// The route reads env at module load, so import it fresh per test.
async function loadRoute() {
  vi.resetModules();
  return import('@/app/api/code/execute/route');
}

const request = (body: unknown) =>
  new NextRequest('http://localhost/api/code/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const validBody = { language: 'java', code: 'class Main {}' };

const judge0Ok = () =>
  new Response(
    JSON.stringify({ stdout: 'hi\n', stderr: null, compile_output: null, status: { id: 3, description: 'Accepted' } }),
    { status: 200 }
  );

// ── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/code/execute', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    supabaseMock.auth.getUser.mockReset();
    supabaseMock.rpc.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  describe('without Supabase configured', () => {
    beforeEach(() => {
      vi.stubEnv('SUPABASE_URL', '');
      vi.stubEnv('SUPABASE_ANON_KEY', '');
    });

    it('fails closed — never proxies to Judge0 anonymously by default', async () => {
      const { POST } = await loadRoute();
      const res = await POST(request(validBody));
      expect(res.status).toBe(503);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('ignores ALLOW_ANONYMOUS_CODE_EXEC in production', async () => {
      vi.stubEnv('ALLOW_ANONYMOUS_CODE_EXEC', 'true');
      vi.stubEnv('NODE_ENV', 'production');
      const { POST } = await loadRoute();
      const res = await POST(request(validBody));
      expect(res.status).toBe(503);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('allows anonymous runs in local dev when explicitly opted in', async () => {
      vi.stubEnv('ALLOW_ANONYMOUS_CODE_EXEC', 'true');
      vi.stubEnv('NODE_ENV', 'development');
      fetchMock.mockResolvedValue(judge0Ok());
      const { POST } = await loadRoute();
      const res = await POST(request(validBody));
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ stdout: 'hi', exitCode: 0 });
    });
  });

  describe('with Supabase configured', () => {
    beforeEach(() => {
      vi.stubEnv('ACCOUNTS_ENABLED', 'true');
      vi.stubEnv('SUPABASE_URL', 'https://x.supabase.co');
      vi.stubEnv('SUPABASE_ANON_KEY', 'anon');
    });

    it('requires a signed-in user', async () => {
      supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } });
      const { POST } = await loadRoute();
      const res = await POST(request(validBody));
      expect(res.status).toBe(401);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('does not spend quota on invalid requests', async () => {
      supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
      const { POST } = await loadRoute();
      const res = await POST(request({ language: 'cobol', code: 'x' }));
      expect(res.status).toBe(400);
      expect(supabaseMock.rpc).not.toHaveBeenCalled();
    });

    it.each([
      ['minute_limit', 429],
      ['daily_limit', 429],
      ['unauthenticated', 401],
    ])('maps quota result %s to %i without calling Judge0', async (quota, status) => {
      supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
      supabaseMock.rpc.mockResolvedValue({ data: quota, error: null });
      const { POST } = await loadRoute();
      const res = await POST(request(validBody));
      expect(res.status).toBe(status);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('fails closed when the quota check itself errors', async () => {
      supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
      supabaseMock.rpc.mockResolvedValue({ data: null, error: { message: 'function does not exist' } });
      const { POST } = await loadRoute();
      const res = await POST(request(validBody));
      expect(res.status).toBe(503);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('runs the code when within quota', async () => {
      supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
      supabaseMock.rpc.mockResolvedValue({ data: 'ok', error: null });
      fetchMock.mockResolvedValue(judge0Ok());
      const { POST } = await loadRoute();
      const res = await POST(request(validBody));
      expect(res.status).toBe(200);
      expect(supabaseMock.rpc).toHaveBeenCalledWith('consume_code_execution');
    });

    it('does not leak the upstream response body on Judge0 errors', async () => {
      supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
      supabaseMock.rpc.mockResolvedValue({ data: 'ok', error: null });
      fetchMock.mockResolvedValue(new Response('X-RapidAPI-Key invalid: abc123', { status: 403 }));
      const { POST } = await loadRoute();
      const res = await POST(request(validBody));
      expect(res.status).toBe(502);
      expect(JSON.stringify(await res.json())).not.toContain('abc123');
    });
  });

  it('stays closed when Supabase is configured but accounts are switched off', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://x.supabase.co');
    vi.stubEnv('SUPABASE_ANON_KEY', 'anon');
    vi.stubEnv('ACCOUNTS_ENABLED', 'false');
    const { POST } = await loadRoute();
    const res = await POST(request(validBody));
    expect(res.status).toBe(503);
    expect(supabaseMock.auth.getUser).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('no longer exposes a GET endpoint describing the backend', async () => {
    const route = await loadRoute();
    expect('GET' in route).toBe(false);
  });
});
