import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

const stripeMock = {
  webhooks: { constructEvent: vi.fn() },
  subscriptions: { list: vi.fn() },
};

vi.mock('@/features/billing/stripe', async importOriginal => ({
  ...(await importOriginal<typeof import('@/features/billing/stripe')>()),
  getStripe: () => stripeMock,
}));

/** Each `.update().eq().select()` chain resolves to the next queued result. */
const updateResults: { data: { id: string }[] | null; error: { message: string } | null }[] = [];
const updates: { values: Record<string, unknown>; column: string; value: string }[] = [];

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      update: (values: Record<string, unknown>) => ({
        eq: (column: string, value: string) => ({
          select: async () => {
            updates.push({ values, column, value });
            return updateResults.shift() ?? { data: [], error: null };
          },
        }),
      }),
    }),
  }),
}));

import { POST } from '@/app/api/billing/webhook/route';

// ── Helpers ──────────────────────────────────────────────────────────────────

const request = () =>
  new NextRequest('http://localhost/api/billing/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': 'sig' },
    body: '{}',
  });

function subscriptionEvent(type: string, metadata: Record<string, string> = {}) {
  return {
    id: 'evt_1',
    type,
    data: { object: { customer: 'cus_1', metadata } },
  };
}

const activeProSub = {
  status: 'active',
  items: { data: [{ price: { id: 'price_pro_m' } }] },
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/billing/webhook', () => {
  beforeEach(() => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test');
    vi.stubEnv('STRIPE_PRICE_PRO_MONTHLY', 'price_pro_m');
    stripeMock.webhooks.constructEvent.mockReset();
    stripeMock.subscriptions.list.mockReset();
    updateResults.length = 0;
    updates.length = 0;
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('rejects a bad signature with 400', async () => {
    stripeMock.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('bad sig');
    });
    const res = await POST(request());
    expect(res.status).toBe(400);
  });

  it('acknowledges unrelated events without touching the DB', async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue({ id: 'evt', type: 'invoice.paid', data: { object: {} } });
    const res = await POST(request());
    expect(res.status).toBe(200);
    expect(stripeMock.subscriptions.list).not.toHaveBeenCalled();
    expect(updates).toHaveLength(0);
  });

  it('derives the plan from current Stripe state, not the event payload', async () => {
    // A late `deleted` event for an old sub must not downgrade a user who has
    // an active subscription now.
    stripeMock.webhooks.constructEvent.mockReturnValue(subscriptionEvent('customer.subscription.deleted'));
    stripeMock.subscriptions.list.mockResolvedValue({ data: [activeProSub] });
    updateResults.push({ data: [{ id: 'user_1' }], error: null });

    const res = await POST(request());

    expect(res.status).toBe(200);
    expect(updates).toEqual([{ values: { plan: 'pro' }, column: 'stripe_customer_id', value: 'cus_1' }]);
  });

  it('returns 500 on a DB error so Stripe retries instead of dropping the upgrade', async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue(subscriptionEvent('customer.subscription.created'));
    stripeMock.subscriptions.list.mockResolvedValue({ data: [activeProSub] });
    updateResults.push({ data: null, error: { message: 'connection reset' } });

    const res = await POST(request());
    expect(res.status).toBe(500);
  });

  it('returns 500 when Stripe itself is unreachable', async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue(subscriptionEvent('customer.subscription.updated'));
    stripeMock.subscriptions.list.mockRejectedValue(new Error('ECONNRESET'));

    const res = await POST(request());
    expect(res.status).toBe(500);
  });

  it('repairs a missing customer link using subscription metadata.user_id', async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue(
      subscriptionEvent('customer.subscription.created', { user_id: 'user_1' })
    );
    stripeMock.subscriptions.list.mockResolvedValue({ data: [activeProSub] });
    updateResults.push({ data: [], error: null }); // no profile has cus_1 yet
    updateResults.push({ data: [{ id: 'user_1' }], error: null });

    const res = await POST(request());

    expect(res.status).toBe(200);
    expect(updates[1]).toEqual({
      values: { plan: 'pro', stripe_customer_id: 'cus_1' },
      column: 'id',
      value: 'user_1',
    });
  });
});
