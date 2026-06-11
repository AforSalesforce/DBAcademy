'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/lib/use-profile';
import { Database, GraduationCap, CheckCircle, X, Zap } from 'lucide-react';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: { monthly: 0, annual: 0 },
    description: 'Get started with the basics',
    features: [
      { text: '3 starter modules', included: true },
      { text: 'PostgreSQL & SQLite engines', included: true },
      { text: 'Basic progress tracking', included: true },
      { text: 'Community support', included: true },
      { text: 'All 30+ modules', included: false },
      { text: 'NoSQL engine', included: false },
      { text: 'Quizzes & certificates', included: false },
      { text: 'Priority support', included: false },
    ],
    cta: 'Start Free',
    href: '/learn',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: { monthly: 12, annual: 8 },
    description: 'Everything for serious learners',
    popular: true,
    features: [
      { text: 'All 30+ modules & lessons', included: true },
      { text: 'All database engines', included: true },
      { text: 'Advanced progress tracking', included: true },
      { text: 'Quizzes & assessments', included: true },
      { text: 'Achievement system', included: true },
      { text: 'Completion certificates', included: true },
      { text: 'Priority email support', included: true },
      { text: 'Offline mode (coming soon)', included: true },
    ],
    cta: 'Start 14-day Trial',
    href: '/auth/signup?plan=pro',
  },
  {
    id: 'institution',
    name: 'Institution',
    price: { monthly: 8, annual: 6 },
    priceNote: 'per student',
    description: 'For schools, colleges & companies',
    features: [
      { text: 'Everything in Pro', included: true },
      { text: 'Admin dashboard', included: true },
      { text: 'Student progress monitoring', included: true },
      { text: 'Custom curriculum builder', included: true },
      { text: 'Bulk student enrollment', included: true },
      { text: 'LMS integration (SCORM)', included: true },
      { text: 'SSO / SAML support', included: true },
      { text: 'Dedicated account manager', included: true },
    ],
    cta: 'Get Institution Plan',
    href: '#contact',
  },
];

export default function PricingPage() {
  const router = useRouter();
  const { profile } = useProfile();
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState('');

  const handleCheckout = async (planId: 'pro' | 'institution') => {
    setCheckoutError('');

    // Not signed in — create an account first, then come back
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
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Could not start checkout');
      }
      window.location.href = data.url;
    } catch (err: any) {
      setCheckoutError(err.message);
      setCheckoutLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative w-8 h-8 flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg">
                <Database className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold">DBAcademy</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/auth/signin" className="text-sm text-slate-400 hover:text-white">Sign In</Link>
              <Link href="/learn" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium">
                Start Learning
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">Choose Your Plan</h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8">
            Start free, upgrade when you need more. All plans include browser-based database engines.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-full p-1">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                billing === 'monthly' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                billing === 'annual' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Annual
              <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">-33%</span>
            </button>
          </div>
        </div>

        {checkoutError && (
          <div className="max-w-md mx-auto mb-8 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
            {checkoutError}
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border p-8 ${
                plan.popular
                  ? 'bg-gradient-to-b from-blue-600/10 to-slate-900 border-blue-500 shadow-xl shadow-blue-500/10'
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 bg-blue-600 rounded-full text-xs font-semibold">
                  <Zap className="w-3 h-3" /> Most Popular
                </div>
              )}

              <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
              <p className="text-sm text-slate-400 mb-4">{plan.description}</p>

              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-extrabold">
                  ${plan.price[billing]}
                </span>
                {plan.price[billing] > 0 && (
                  <span className="text-slate-400 text-sm">/mo</span>
                )}
              </div>
              {plan.priceNote && (
                <p className="text-xs text-slate-500 mb-4">{plan.priceNote}</p>
              )}
              {!plan.priceNote && <div className="mb-4"></div>}

              {plan.id === 'free' ? (
                <Link
                  href={plan.href}
                  className="block w-full text-center py-3 rounded-lg font-medium transition-colors mb-6 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                >
                  {plan.cta}
                </Link>
              ) : profile?.plan === plan.id ? (
                <div className="block w-full text-center py-3 rounded-lg font-medium mb-6 bg-green-500/10 text-green-400 border border-green-500/20">
                  Current plan
                </div>
              ) : (
                <button
                  onClick={() => handleCheckout(plan.id as 'pro' | 'institution')}
                  disabled={checkoutLoading !== null}
                  className={`block w-full text-center py-3 rounded-lg font-medium transition-colors mb-6 disabled:opacity-50 ${
                    plan.popular
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                >
                  {checkoutLoading === plan.id ? 'Redirecting…' : plan.cta}
                </button>
              )}

              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature.text} className="flex items-start gap-2 text-sm">
                    {feature.included ? (
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />
                    )}
                    <span className={feature.included ? 'text-slate-300' : 'text-slate-600'}>{feature.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto mt-20">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              { q: 'Do I need to install anything?', a: 'No! DBAcademy runs entirely in your browser using WebAssembly. PostgreSQL, SQLite, and our NoSQL engine all run locally — zero setup required.' },
              { q: 'Can I use this for my class/company?', a: 'Absolutely! Our Institution plan includes admin dashboards, student tracking, custom curricula, and bulk enrollment. Contact us for a demo.' },
              { q: 'Is there a free trial for Pro?', a: 'Yes! Pro comes with a 14-day free trial. No credit card required to start.' },
              { q: 'How is progress saved?', a: 'Progress is saved locally in your browser and synced to your account when signed in. Your work is never lost.' },
              { q: 'Can I get a certificate?', a: 'Pro and Institution plans include completion certificates that you can share on LinkedIn or include in your portfolio.' },
            ].map((faq) => (
              <details key={faq.q} className="group bg-slate-900 border border-slate-800 rounded-xl">
                <summary className="px-6 py-4 cursor-pointer font-medium text-sm hover:text-blue-400 transition-colors list-none flex items-center justify-between">
                  {faq.q}
                  <span className="text-slate-500 group-open:rotate-45 transition-transform text-lg">+</span>
                </summary>
                <div className="px-6 pb-4 text-sm text-slate-400">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>

        {/* Contact Section */}
        <div id="contact" className="max-w-2xl mx-auto mt-20 text-center bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <GraduationCap className="w-10 h-10 text-blue-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Need an Institution Plan?</h2>
          <p className="text-slate-400 text-sm mb-6">
            Get in touch for custom pricing, bulk discounts, and a personalized demo for your school or company.
          </p>
          <a
            href="mailto:sales@dbacademy.io"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
          >
            Contact Sales
          </a>
        </div>
      </main>
    </div>
  );
}
