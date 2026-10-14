import Stripe from 'stripe';
import type { Plan } from '@/features/billing/plans';

/** Server-side Stripe client. */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured.');
  }
  return new Stripe(key);
}

export type BillingInterval = 'monthly' | 'annual';
export type PaidPlan = Extract<Plan, 'pro' | 'institution'>;

/** Maps plan + interval to a Stripe Price ID (set these in .env.local). */
export function getPriceId(plan: PaidPlan, interval: BillingInterval): string {
  const env: Record<PaidPlan, Record<BillingInterval, string | undefined>> = {
    pro: {
      monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
      annual: process.env.STRIPE_PRICE_PRO_ANNUAL,
    },
    institution: {
      monthly: process.env.STRIPE_PRICE_INSTITUTION_MONTHLY,
      annual: process.env.STRIPE_PRICE_INSTITUTION_ANNUAL,
    },
  };
  const priceId = env[plan][interval];
  if (!priceId) {
    throw new Error(`No Stripe price configured for ${plan}/${interval}.`);
  }
  return priceId;
}

/** Reverse mapping: Stripe Price ID -> plan. Returns null for unknown prices. */
export function planFromPriceId(priceId: string): PaidPlan | null {
  if (
    priceId === process.env.STRIPE_PRICE_PRO_MONTHLY ||
    priceId === process.env.STRIPE_PRICE_PRO_ANNUAL
  ) {
    return 'pro';
  }
  if (
    priceId === process.env.STRIPE_PRICE_INSTITUTION_MONTHLY ||
    priceId === process.env.STRIPE_PRICE_INSTITUTION_ANNUAL
  ) {
    return 'institution';
  }
  return null;
}

/**
 * Statuses that keep paid access. `past_due` is included as a grace period:
 * Stripe is still retrying the card, and it moves the subscription to
 * `canceled`/`unpaid` (which we treat as free) if the retries fail.
 */
const PAID_STATUSES = new Set<Stripe.Subscription.Status>(['active', 'trialing', 'past_due']);
const PLAN_RANK: Record<Plan, number> = { free: 0, pro: 1, institution: 2 };

/**
 * Derives a customer's plan from the full, current list of their Stripe
 * subscriptions — the highest plan among subscriptions that still grant
 * access, or 'free'. Because it looks at current state rather than a single
 * event, it gives the same answer no matter which order webhooks arrive in
 * or how many times they're retried.
 */
export function planFromSubscriptions(
  subscriptions: Pick<Stripe.Subscription, 'status' | 'items'>[]
): Plan {
  let best: Plan = 'free';
  for (const sub of subscriptions) {
    if (!PAID_STATUSES.has(sub.status)) continue;
    for (const item of sub.items.data) {
      const plan = planFromPriceId(item.price.id);
      if (plan && PLAN_RANK[plan] > PLAN_RANK[best]) best = plan;
    }
  }
  return best;
}
