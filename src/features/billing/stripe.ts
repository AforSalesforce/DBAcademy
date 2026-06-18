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
