import { NextRequest, NextResponse } from 'next/server';
import { accountsEnabled } from '@/lib/features';
import type Stripe from 'stripe';
import { getStripe, planFromSubscriptions } from '@/features/billing/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

const SUBSCRIPTION_EVENTS = new Set([
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
]);

/**
 * Stripe webhook — the single source of truth for `profiles.plan`.
 *
 * Every subscription event triggers a re-read of the customer's current
 * subscriptions from Stripe, so handling is idempotent and immune to
 * out-of-order delivery. Any failure returns 500 so Stripe retries (it keeps
 * retrying for up to 3 days) instead of silently dropping a paid upgrade.
 *
 * Local dev: stripe listen --forward-to localhost:3000/api/billing/webhook
 */
export async function POST(request: NextRequest) {
  // Payments are part of the accounts feature; while it's off they don't exist.
  if (!accountsEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'STRIPE_WEBHOOK_SECRET not configured' },
      { status: 500 }
    );
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    const body = await request.text();
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err: unknown) {
    console.error('Webhook signature verification failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Unhandled event types are fine — acknowledge them.
  if (!SUBSCRIPTION_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true });
  }

  const sub = event.data.object as Stripe.Subscription;
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;

  try {
    const { data: subscriptions } = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 100,
    });
    const plan = planFromSubscriptions(subscriptions);
    const admin = createAdminClient();

    const byCustomer = await admin
      .from('profiles')
      .update({ plan })
      .eq('stripe_customer_id', customerId)
      .select('id');
    if (byCustomer.error) throw byCustomer.error;

    if (byCustomer.data.length === 0) {
      // No profile linked to this customer yet — e.g. checkout created the
      // customer but its profile write failed. Checkout stamps user_id on the
      // subscription, so use that to repair the link.
      const userId = sub.metadata?.user_id;
      if (!userId) {
        console.error(`Webhook ${event.id}: no profile for customer ${customerId} and no user_id metadata`);
        return NextResponse.json({ received: true });
      }
      const byUser = await admin
        .from('profiles')
        .update({ plan, stripe_customer_id: customerId })
        .eq('id', userId)
        .select('id');
      if (byUser.error) throw byUser.error;
      if (byUser.data.length === 0) {
        console.error(`Webhook ${event.id}: no profile for user ${userId}`);
      }
    }
  } catch (err: unknown) {
    console.error(`Webhook ${event.id} (${event.type}) failed:`, err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
