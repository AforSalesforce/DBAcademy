import { NextRequest, NextResponse } from 'next/server';
import { accountsEnabled } from '@/lib/features';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe, getPriceId, type BillingInterval, type PaidPlan } from '@/features/billing/stripe';

export async function POST(request: NextRequest) {
  // Payments are part of the accounts feature; while it's off they don't exist.
  if (!accountsEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    const { plan, interval } = (await request.json()) as {
      plan: PaidPlan;
      interval: BillingInterval;
    };
    if (!['pro', 'institution'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }
    const billingInterval: BillingInterval = interval ?? 'monthly';
    if (!['monthly', 'annual'].includes(billingInterval)) {
      return NextResponse.json({ error: 'Invalid billing interval' }, { status: 400 });
    }

    const stripe = getStripe();
    const admin = createAdminClient();

    // Reuse or create the Stripe customer
    const { data: profile } = await admin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id as string | null;
    if (!customerId) {
      // Idempotency key: a double-click (two concurrent requests that both
      // see no customer yet) gets the same Stripe customer back, not two.
      const customer = await stripe.customers.create(
        {
          email: user.email ?? undefined,
          metadata: { user_id: user.id },
        },
        { idempotencyKey: `create-customer-${user.id}` }
      );
      customerId = customer.id;
      const { error: linkError } = await admin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
      // Not fatal: the webhook re-links via subscription metadata.user_id.
      if (linkError) console.error('Checkout: failed to link Stripe customer:', linkError.message);
    }

    const origin =
      process.env.APP_URL ?? new URL(request.url).origin;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: getPriceId(plan, billingInterval), quantity: 1 }],
      subscription_data: {
        metadata: { user_id: user.id },
        ...(plan === 'pro' ? { trial_period_days: 14 } : {}),
      },
      success_url: `${origin}/dashboard?billing=success`,
      cancel_url: `${origin}/pricing?billing=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error('Checkout error:', err);
    return NextResponse.json(
      { error: 'Checkout failed. Please try again.' },
      { status: 500 }
    );
  }
}
