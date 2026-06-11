import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe, planFromPriceId } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Stripe webhook — the single source of truth for `profiles.plan`.
 *
 * Local dev: stripe listen --forward-to localhost:3000/api/billing/webhook
 */
export async function POST(request: NextRequest) {
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

  let event: Stripe.Event;
  try {
    const body = await request.text();
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const admin = createAdminClient();

  const setPlanByCustomer = async (customerId: string, plan: string) => {
    const { error } = await admin
      .from('profiles')
      .update({ plan })
      .eq('stripe_customer_id', customerId);
    if (error) console.error('Failed to update plan:', error.message);
  };

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      const priceId = sub.items.data[0]?.price.id;
      const plan = priceId ? planFromPriceId(priceId) : null;

      if (['active', 'trialing'].includes(sub.status) && plan) {
        await setPlanByCustomer(customerId, plan);
      } else if (['canceled', 'unpaid', 'incomplete_expired'].includes(sub.status)) {
        await setPlanByCustomer(customerId, 'free');
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await setPlanByCustomer(sub.customer as string, 'free');
      break;
    }

    default:
      // Unhandled event types are fine — acknowledge them.
      break;
  }

  return NextResponse.json({ received: true });
}
