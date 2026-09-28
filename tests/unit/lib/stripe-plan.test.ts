import { describe, it, expect, beforeEach, vi } from 'vitest';
import type Stripe from 'stripe';
import { planFromSubscriptions } from '@/features/billing/stripe';

type Sub = Pick<Stripe.Subscription, 'status' | 'items'>;

const sub = (status: Stripe.Subscription.Status, ...priceIds: string[]): Sub =>
  ({ status, items: { data: priceIds.map(id => ({ price: { id } })) } }) as unknown as Sub;

describe('planFromSubscriptions', () => {
  beforeEach(() => {
    vi.stubEnv('STRIPE_PRICE_PRO_MONTHLY', 'price_pro_m');
    vi.stubEnv('STRIPE_PRICE_PRO_ANNUAL', 'price_pro_a');
    vi.stubEnv('STRIPE_PRICE_INSTITUTION_MONTHLY', 'price_inst_m');
    vi.stubEnv('STRIPE_PRICE_INSTITUTION_ANNUAL', 'price_inst_a');
  });

  it('is free with no subscriptions', () => {
    expect(planFromSubscriptions([])).toBe('free');
  });

  it('grants the plan for active, trialing and past_due (grace period)', () => {
    expect(planFromSubscriptions([sub('active', 'price_pro_m')])).toBe('pro');
    expect(planFromSubscriptions([sub('trialing', 'price_pro_a')])).toBe('pro');
    expect(planFromSubscriptions([sub('past_due', 'price_inst_m')])).toBe('institution');
  });

  it('revokes access for canceled, unpaid, incomplete and incomplete_expired', () => {
    for (const status of ['canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused'] as const) {
      expect(planFromSubscriptions([sub(status, 'price_pro_m')])).toBe('free');
    }
  });

  it('a stale canceled subscription does not override a current active one', () => {
    // The old bug: a late `subscription.deleted` for an old sub set the user to free.
    expect(
      planFromSubscriptions([sub('canceled', 'price_pro_m'), sub('active', 'price_pro_a')])
    ).toBe('pro');
  });

  it('picks the highest plan across subscriptions and items', () => {
    expect(
      planFromSubscriptions([sub('active', 'price_pro_m'), sub('active', 'price_inst_a')])
    ).toBe('institution');
    expect(planFromSubscriptions([sub('active', 'price_unknown', 'price_inst_m')])).toBe('institution');
  });

  it('ignores prices that are not ours', () => {
    expect(planFromSubscriptions([sub('active', 'price_unknown')])).toBe('free');
  });
});
