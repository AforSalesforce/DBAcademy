import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * With ACCOUNTS_ENABLED unset (the public default), nothing account- or
 * payment-related may be reachable — even when Supabase and Stripe are fully
 * configured in the environment.
 */

const stripeMock = { webhooks: { constructEvent: vi.fn() }, subscriptions: { list: vi.fn() }, checkout: { sessions: { create: vi.fn() } } };
vi.mock('@/features/billing/stripe', async importOriginal => ({
  ...(await importOriginal<typeof import('@/features/billing/stripe')>()),
  getStripe: () => stripeMock,
}));

function configureEverything() {
  vi.stubEnv('SUPABASE_URL', 'https://x.supabase.co');
  vi.stubEnv('SUPABASE_ANON_KEY', 'anon');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service');
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_x');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_x');
}

const post = (path: string) =>
  new NextRequest(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'stripe-signature': 'sig', 'Content-Type': 'application/json' },
    body: '{"plan":"pro"}',
  });

describe('accounts switched off (ACCOUNTS_ENABLED unset)', () => {
  beforeEach(() => {
    vi.resetModules();
    configureEverything();
  });
  afterEach(() => vi.unstubAllEnvs());

  it('treats Supabase as unconfigured', async () => {
    const { getSupabaseConfig, isSupabaseConfigured } = await import('@/lib/supabase/config');
    expect(getSupabaseConfig()).toBeNull();
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('only "true" switches accounts on', async () => {
    const { accountsEnabled } = await import('@/lib/features');
    for (const v of ['', '1', 'yes', 'TRUE', 'false']) {
      vi.stubEnv('ACCOUNTS_ENABLED', v);
      expect(accountsEnabled()).toBe(false);
    }
    vi.stubEnv('ACCOUNTS_ENABLED', 'true');
    expect(accountsEnabled()).toBe(true);
  });

  it.each(['checkout', 'portal', 'webhook'])('billing /%s returns 404 without touching Stripe', async name => {
    const { POST } = await import(`@/app/api/billing/${name}/route`);
    const res = await POST(post(`/api/billing/${name}`));
    expect(res.status).toBe(404);
    expect(stripeMock.webhooks.constructEvent).not.toHaveBeenCalled();
    expect(stripeMock.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('refuses to create the service-role (RLS-bypassing) client', async () => {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    expect(() => createAdminClient()).toThrow(/Accounts are disabled/);
  });

  it.each(['/auth/signin', '/auth/signup', '/auth/callback', '/pricing', '/admin', '/admin/students'])(
    'middleware sends %s home',
    async path => {
      const { middleware } = await import('@/middleware');
      const res = await middleware(new NextRequest(`http://localhost${path}?next=/x`));
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost/');
    }
  );

  it('middleware leaves the local-progress dashboard reachable', async () => {
    const { middleware } = await import('@/middleware');
    const res = await middleware(new NextRequest('http://localhost/dashboard'));
    expect(res.headers.get('location')).toBeNull();
  });
});
