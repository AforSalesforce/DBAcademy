import { NextRequest, NextResponse } from 'next/server';
import { accountsEnabled } from '@/lib/features';
import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/features/billing/stripe';

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

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing account found' },
        { status: 400 }
      );
    }

    const origin =
      process.env.APP_URL ?? new URL(request.url).origin;

    const session = await getStripe().billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error('Portal error:', err);
    return NextResponse.json(
      { error: 'Could not open billing portal. Please try again.' },
      { status: 500 }
    );
  }
}
