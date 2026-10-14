'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/lib/use-profile';
import { Database, GraduationCap, CheckCircle, Zap, Play, ChevronDown } from 'lucide-react';
import { SiteFooter } from '@/components/SiteFooter';
import { PRICING_PLANS as PLANS, PRICING_FAQS as FAQS } from '@/features/billing/pricing';

export default function PricingPage() {
  const router = useRouter();
  const { profile } = useProfile();
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleCheckout = async (planId: 'pro' | 'institution') => {
    setCheckoutError('');
    if (!profile) {
      router.push(`/auth/signup?plan=${planId}`);
      return;
    }
    setCheckoutLoading(planId);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, interval: billing }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not start checkout');
      window.location.href = data.url;
    } catch (err: any) {
      setCheckoutError(err.message);
      setCheckoutLoading(null);
    }
  };

  return (
    <div className="min-h-screen text-white" style={{ background: '#07090F' }}>
      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-64 rounded-full blur-3xl" style={{ background: 'rgba(0,199,190,0.07)' }} />
      </div>
      <div className="fixed inset-0 grid-overlay pointer-events-none opacity-50" />

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <nav className="relative z-10 sticky top-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(7,9,15,0.8)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2.5 cursor-pointer">
              <div className="relative w-8 h-8 flex items-center justify-center rounded-lg" style={{ background: 'linear-gradient(135deg, #00C7BE, #0096A0)' }}>
                <Database className="w-4 h-4 text-white" />
              </div>
              <span className="text-base font-bold tracking-tight font-display">DBAcademy</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/auth/signin" className="text-sm transition-colors px-3 py-1.5 rounded-lg cursor-pointer" style={{ color: '#8A97B3' }}>
                Sign In
              </Link>
              <Link
                href="/learn"
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                style={{ background: '#00C7BE', color: '#07090F' }}
              >
                <Play className="w-3.5 h-3.5" /> Start Learning
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* ── Hero text ──────────────────────────────────────────────────────── */}
        <div className="text-center mb-14">
          <div className="stagger-1 inline-flex items-center gap-2 px-3 py-1.5 mb-6 rounded-full text-xs font-semibold" style={{ border: '1px solid rgba(0,199,190,0.25)', background: 'rgba(0,199,190,0.08)', color: '#00C7BE' }}>
            <Zap className="w-3 h-3" /> The whole course is free. No card needed to start
          </div>
          <h1 className="stagger-2 heading-xl text-4xl sm:text-5xl mb-4" style={{ color: '#EDF1FA' }}>
            Simple, transparent{' '}
            <span className="text-gradient-teal">pricing</span>
          </h1>
          <p className="stagger-3 text-lg max-w-2xl mx-auto mb-8" style={{ color: '#8A97B3' }}>
            Every lesson is free. Upgrade for unlimited projects and more server-run code.
          </p>

          {/* Billing toggle */}
          <div className="stagger-4 inline-flex items-center gap-1 rounded-full p-1" style={{ background: '#0C1018', border: '1px solid rgba(255,255,255,0.07)' }}>
            <button
              onClick={() => setBilling('monthly')}
              className="px-5 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer"
              style={billing === 'monthly' ? { background: '#1A2235', color: '#EDF1FA' } : { color: '#8A97B3' }}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('annual')}
              className="px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
              style={billing === 'annual' ? { background: '#1A2235', color: '#EDF1FA' } : { color: '#8A97B3' }}
            >
              Annual
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.25)' }}>
                -33%
              </span>
            </button>
          </div>
        </div>

        {checkoutError && (
          <div className="max-w-md mx-auto mb-8 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
            {checkoutError}
          </div>
        )}

        {/* ── Plans grid ─────────────────────────────────────────────────────── */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-20">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className="relative rounded-2xl p-7 transition-all"
              style={plan.popular ? {
                background: 'linear-gradient(160deg, rgba(0,199,190,0.1) 0%, #0C1018 40%)',
                border: '2px solid rgba(0,199,190,0.35)',
                boxShadow: '0 24px 80px rgba(0,199,190,0.1)',
              } : {
                background: '#0C1018',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold" style={{ background: '#00C7BE', color: '#07090F' }}>
                    <Zap className="w-3 h-3" /> Most Popular
                  </span>
                </div>
              )}

              <div className="mb-5">
                <h3 className="text-xl font-bold mb-1 font-display" style={{ color: '#EDF1FA' }}>{plan.name}</h3>
                <p className="text-sm" style={{ color: '#8A97B3' }}>{plan.description}</p>
              </div>

              <div className="mb-1">
                <span className="text-4xl font-extrabold tracking-tight font-display" style={{ color: '#EDF1FA' }}>${plan.price[billing]}</span>
                {plan.price[billing] > 0 && <span className="text-sm ml-1" style={{ color: '#8A97B3' }}>/mo</span>}
              </div>
              {plan.priceNote && <p className="text-xs mb-5" style={{ color: '#8A97B3' }}>{plan.priceNote}</p>}
              {!plan.priceNote && <div className="mb-5" />}

              {plan.id === 'free' ? (
                <Link
                  href={plan.href}
                  className="flex w-full items-center justify-center py-2.5 rounded-xl font-semibold text-sm transition-colors mb-6 cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#EDF1FA' }}
                >
                  {plan.cta}
                </Link>
              ) : profile?.plan === plan.id ? (
                <div className="flex w-full items-center justify-center py-2.5 rounded-xl font-semibold text-sm mb-6" style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)' }}>
                  Current plan
                </div>
              ) : (
                <button
                  onClick={() => handleCheckout(plan.id as 'pro' | 'institution')}
                  disabled={checkoutLoading !== null}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all mb-6 disabled:opacity-50 cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
                  style={plan.popular ? {
                    background: '#F59E0B',
                    color: '#07090F',
                    boxShadow: '0 0 24px rgba(245,158,11,0.25)',
                  } : {
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#EDF1FA',
                  }}
                >
                  {checkoutLoading === plan.id ? 'Redirecting…' : plan.cta}
                </button>
              )}

              <ul className="space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#00C7BE' }} aria-hidden="true" />
                    <span style={{ color: '#EDF1FA' }}>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── FAQ ────────────────────────────────────────────────────────────── */}
        <div className="max-w-2xl mx-auto mb-20">
          <h2 className="text-2xl font-bold text-center mb-8 heading-lg" style={{ color: '#EDF1FA' }}>Frequently asked questions</h2>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <div
                key={faq.q}
                className="rounded-xl overflow-hidden"
                style={{ background: '#0C1018', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left cursor-pointer transition-colors"
                >
                  <span className="font-medium text-sm pr-4" style={{ color: '#EDF1FA' }}>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`}
                    style={{ color: '#8A97B3' }}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4 text-sm leading-relaxed" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: '#8A97B3' }}>
                    <div className="pt-3">{faq.a}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom CTA ─────────────────────────────────────────────────────── */}
        <div id="contact" className="max-w-2xl mx-auto text-center">
          <div className="rounded-3xl p-10" style={{ background: 'linear-gradient(160deg, rgba(0,199,190,0.07) 0%, #0C1018 50%)', border: '1px solid rgba(0,199,190,0.15)' }}>
            <div className="w-12 h-12 mx-auto mb-5 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #00C7BE, #0096A0)', boxShadow: '0 0 40px rgba(0,199,190,0.3)' }}>
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2 heading-lg" style={{ color: '#EDF1FA' }}>Setting up a class?</h2>
            <p className="text-sm mb-7 max-w-sm mx-auto" style={{ color: '#8A97B3' }}>
              Email us with questions about the Institution plan, or for help getting your students started.
            </p>
            <a
              href="mailto:sales@dbacademy.io"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl font-semibold transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              style={{ background: '#F59E0B', color: '#07090F', boxShadow: '0 0 32px rgba(245,158,11,0.25)' }}
            >
              Email us
            </a>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
