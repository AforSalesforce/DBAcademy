import Link from 'next/link';
import { accountsEnabled } from '@/lib/features';
import type { Metadata } from 'next';
import { CURRICULUM } from '@/features/learn/curriculum/curriculum';
import { JsonLd } from '@/components/PublicHeader';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';
import {
  Database, GraduationCap, Zap, BookOpen, BarChart3, Code2,
  ShieldCheck, Globe, ArrowRight, Play, Terminal, Table, GitBranch,
  BrainCircuit,
} from 'lucide-react';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
  openGraph: { url: '/' },
};

/** Tells search engines who publishes the site. */
const SITE_JSON_LD = [
  { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE_NAME, url: SITE_URL, description: SITE_DESCRIPTION },
  { '@context': 'https://schema.org', '@type': 'Organization', name: SITE_NAME, url: SITE_URL, logo: `${SITE_URL}/icon.svg` },
];

/** Real counts, so the page never promises more than the product has. */
const LESSON_COUNT = CURRICULUM.reduce((n, m) => n + m.lessons.length, 0);

const FEATURES = [
  {
    icon: Database,
    color: 'text-[#00C7BE]',
    bg: 'rgba(0, 199, 190, 0.08)',
    border: 'rgba(0, 199, 190, 0.18)',
    title: 'Browser-Native Engines',
    description: 'Full PostgreSQL, SQLite & NoSQL running in WebAssembly — zero install, zero server.',
    rotate: '',
  },
  {
    icon: BookOpen,
    color: 'text-[#F59E0B]',
    bg: 'rgba(245, 158, 11, 0.08)',
    border: 'rgba(245, 158, 11, 0.18)',
    title: `${LESSON_COUNT} Guided Lessons`,
    description: 'Start by solving a murder mystery in SQL, then work through joins, schema design, window functions and document databases.',
    rotate: 'sm:rotate-1',
    href: '/lessons',
  },
  {
    icon: Code2,
    color: 'text-[#00C7BE]',
    bg: 'rgba(0, 199, 190, 0.08)',
    border: 'rgba(0, 199, 190, 0.18)',
    title: 'Live SQL Playground',
    description: 'Write, run, and iterate on queries with instant feedback. Save queries and track history.',
    rotate: '',
  },
  {
    icon: BarChart3,
    color: 'text-[#F59E0B]',
    bg: 'rgba(245, 158, 11, 0.08)',
    border: 'rgba(245, 158, 11, 0.18)',
    title: 'Progress Dashboard',
    description: 'XP, streaks, achievements and completion tracking to keep you motivated every session.',
    rotate: 'sm:-rotate-1',
  },
  {
    icon: ShieldCheck,
    color: 'text-[#00C7BE]',
    bg: 'rgba(0, 199, 190, 0.08)',
    border: 'rgba(0, 199, 190, 0.18)',
    title: 'Schema Designer',
    description: 'Visual drag-and-drop schema builder that generates DDL SQL — learn by designing real schemas.',
    rotate: '',
  },
  {
    icon: BrainCircuit,
    color: 'text-[#F59E0B]',
    bg: 'rgba(245, 158, 11, 0.08)',
    border: 'rgba(245, 158, 11, 0.18)',
    title: 'Code Playground',
    description: 'Write and run JavaScript & Python directly in the browser.',
    /** Only true when server-side execution (an accounts feature) is on. */
    accountsNote: ' Switch to Java, C, Go and more with one click.',
    rotate: '',
    href: '/code',
  },
];

const MARQUEE_ITEMS = [
  { icon: Terminal, text: 'PostgreSQL' },
  { icon: Database, text: 'SQLite' },
  { icon: Table, text: 'NoSQL' },
  { icon: Code2, text: 'JavaScript' },
  { icon: BrainCircuit, text: 'Python' },
  { icon: GitBranch, text: 'Schema Designer' },
  { icon: BarChart3, text: 'Progress Tracking' },
  { icon: BookOpen, text: `${LESSON_COUNT} Lessons` },
  { icon: ShieldCheck, text: 'Zero Setup' },
];

export default function HomePage() {
  const accounts = accountsEnabled();
  return (
    <main className="min-h-screen overflow-x-hidden" style={{ background: '#07090F', color: '#EDF1FA' }}>
      <JsonLd data={SITE_JSON_LD} />
      {/* Grid overlay */}
      <div className="fixed inset-0 grid-overlay pointer-events-none opacity-60" />
      {/* Ambient glows */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] rounded-full pointer-events-none blur-[120px] opacity-[0.07]" style={{ background: '#00C7BE' }} />
      <div className="fixed bottom-0 right-1/4 w-[400px] h-[400px] rounded-full pointer-events-none blur-[100px] opacity-[0.05]" style={{ background: '#F59E0B' }} />

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-6 sm:px-10 h-16" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(7,9,15,0.75)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-2.5">
          <div className="relative w-8 h-8 flex items-center justify-center rounded-lg" style={{ background: 'linear-gradient(135deg, #00C7BE, #0096A0)' }}>
            <Database className="w-4 h-4 text-white" strokeWidth={2.5} />
            <div className="absolute -bottom-1 -right-1 rounded-full p-0.5" style={{ background: '#07090F', border: '1px solid rgba(255,255,255,0.1)' }}>
              <GraduationCap className="w-2.5 h-2.5" style={{ color: '#00C7BE' }} />
            </div>
          </div>
          <span className="text-base font-bold tracking-tight font-display">DBAcademy</span>
        </div>
        <div className="flex items-center gap-3">
          {accounts && (
            <>
              <Link href="/auth/signin" className="text-sm transition-colors px-3 py-1.5 rounded-lg cursor-pointer hover:bg-white/5" style={{ color: '#8A97B3' }}>
                Sign In
              </Link>
              <Link href="/pricing" className="hidden sm:block text-sm transition-colors px-3 py-1.5 rounded-lg cursor-pointer hover:bg-white/5" style={{ color: '#8A97B3' }}>
                Pricing
              </Link>
            </>
          )}
          <Link href="/lessons"
            className="hidden sm:block text-sm transition-colors px-3 py-1.5 rounded-lg cursor-pointer hover:bg-white/5"
            style={{ color: '#8A97B3' }}>
            Lessons
          </Link>
          {/* The code sandbox is a side feature: a quiet link, not a second CTA. */}
          <Link href="/code"
            className="hidden sm:block text-sm transition-colors px-3 py-1.5 rounded-lg cursor-pointer hover:bg-white/5"
            style={{ color: '#8A97B3' }}>
            Code sandbox
          </Link>
          <Link
            href="/learn"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer"
            style={{ background: '#00C7BE', color: '#07090F' }}
          >
            <Play className="w-3.5 h-3.5" /> Start Learning
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 pt-20 pb-8 lg:pt-28">
        <div className="grid lg:grid-cols-[1fr_480px] gap-16 items-center">
          {/* Left — text */}
          <div className="relative">
            {/* Ghost decorative text */}
            <div className="absolute -top-8 -left-4 select-none pointer-events-none font-display font-extrabold leading-none"
              style={{ fontSize: 'clamp(120px, 20vw, 200px)', color: 'transparent', WebkitTextStroke: '1px rgba(0, 199, 190, 0.06)', zIndex: 0 }}>
              DB
            </div>

            <div className="relative z-10">
              {/* Badge */}
              <div className="stagger-1 inline-flex items-center gap-2 px-3 py-1.5 mb-7 rounded-full text-xs font-semibold"
                style={{ border: '1px solid rgba(0, 199, 190, 0.25)', background: 'rgba(0, 199, 190, 0.08)', color: '#00C7BE' }}>
                <Zap className="w-3 h-3" />
                Runs 100% in your browser — no install needed
              </div>

              {/* Headline */}
              <h1 className="stagger-2 heading-xl text-4xl sm:text-5xl lg:text-[64px] mb-6" style={{ color: '#EDF1FA' }}>
                Master{' '}
                <span className="text-gradient-teal">Database</span>
                <br />
                Engineering
                <br />
                <span style={{ color: '#8A97B3', fontStyle: 'italic', fontSize: '0.72em', fontWeight: 400 }}>by actually doing it.</span>
              </h1>

              {/* Sub */}
              <p className="stagger-3 text-lg leading-relaxed mb-10 max-w-lg" style={{ color: '#8A97B3' }}>
                Interactive SQL lessons with a live PostgreSQL, SQLite &amp; NoSQL playground.
                Run queries, design schemas, track progress — all in the browser.
              </p>

              {/* CTA: one primary action (the database course); the sandbox is secondary */}
              <div className="stagger-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <Link
                  href="/learn"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-base transition-all cursor-pointer shine-hover"
                  style={{ background: '#F59E0B', color: '#07090F', boxShadow: '0 0 32px rgba(245, 158, 11, 0.3)' }}
                >
                  <Play className="w-4 h-4" />
                  Start learning free
                </Link>
                <Link
                  href="/code"
                  className="inline-flex items-center justify-center gap-1.5 text-sm font-medium transition-colors cursor-pointer hover:underline underline-offset-4"
                  style={{ color: '#8A97B3' }}
                >
                  <Code2 className="w-4 h-4" aria-hidden="true" /> Or try the JavaScript &amp; Python sandbox
                </Link>
              </div>

              {/* Micro stats */}
              <div className="stagger-5 flex items-center gap-6 mt-10">
                {[
                  { value: String(LESSON_COUNT), label: 'lessons' },
                  { value: '3', label: 'DB engines' },
                  { value: '0', label: 'setup needed' },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <div className="font-display font-extrabold text-xl" style={{ color: '#00C7BE' }}>{s.value}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#8A97B3' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right — code editor mockup */}
          <div className="stagger-3 hidden lg:block relative">
            {/* Editor glow */}
            <div className="absolute inset-0 rounded-2xl blur-2xl opacity-30 -z-10" style={{ background: 'radial-gradient(ellipse at center, rgba(0,199,190,0.2), transparent 70%)' }} />
            <div className="rounded-2xl overflow-hidden" style={{ background: '#0C1018', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,199,190,0.08)' }}>
              {/* Title bar */}
              <div className="flex items-center gap-2 px-4 py-3" style={{ background: '#111724', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="w-3 h-3 rounded-full" style={{ background: '#EF4444', opacity: 0.7 }} />
                <div className="w-3 h-3 rounded-full" style={{ background: '#F59E0B', opacity: 0.7 }} />
                <div className="w-3 h-3 rounded-full" style={{ background: '#22C55E', opacity: 0.7 }} />
                <span className="ml-3 text-xs font-mono" style={{ color: '#7A87A5' }}>playground.sql</span>
              </div>
              {/* Code — a real query against the lesson data, with its real output */}
              <div className="p-5 font-mono text-sm leading-7">
                <div style={{ color: '#8A97B3' }}>-- Where is crime happening?</div>
                <div>
                  <span style={{ color: '#00C7BE' }}>SELECT</span>
                  <span style={{ color: '#EDF1FA' }}> city,</span>
                </div>
                <div>
                  <span style={{ color: '#EDF1FA' }}>       </span>
                  <span style={{ color: '#00C7BE' }}>COUNT</span>
                  <span style={{ color: '#EDF1FA' }}>(*) </span>
                  <span style={{ color: '#00C7BE' }}>AS</span>
                  <span style={{ color: '#F59E0B' }}> reports</span>
                  <span style={{ color: '#EDF1FA' }}>,</span>
                </div>
                <div>
                  <span style={{ color: '#EDF1FA' }}>       </span>
                  <span style={{ color: '#00C7BE' }}>SUM</span>
                  <span style={{ color: '#EDF1FA' }}>(type = </span>
                  <span style={{ color: '#F59E0B' }}>&apos;murder&apos;</span>
                  <span style={{ color: '#EDF1FA' }}>) </span>
                  <span style={{ color: '#00C7BE' }}>AS</span>
                  <span style={{ color: '#F59E0B' }}> murders</span>
                </div>
                <div>
                  <span style={{ color: '#00C7BE' }}>FROM</span>
                  <span style={{ color: '#EDF1FA' }}> crime_scene_report</span>
                </div>
                <div>
                  <span style={{ color: '#00C7BE' }}>GROUP BY</span>
                  <span style={{ color: '#EDF1FA' }}> city</span>
                </div>
                <div>
                  <span style={{ color: '#00C7BE' }}>ORDER BY</span>
                  <span style={{ color: '#F59E0B' }}> reports</span>
                  <span style={{ color: '#00C7BE' }}> DESC</span>
                  <span style={{ color: '#EDF1FA' }}>, city;</span>
                </div>
              </div>
              {/* Results preview */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="px-5 py-2 text-xs font-semibold flex items-center gap-2" style={{ background: '#111724', color: '#8A97B3' }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#22C55E' }} />
                  4 rows
                </div>
                <div className="px-5 py-3 overflow-hidden" style={{ maxHeight: '96px' }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        {['city', 'reports', 'murders'].map(h => (
                          <th key={h} className="text-left pb-1.5 font-semibold uppercase tracking-wider" style={{ color: '#8A97B3', fontSize: '10px' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['SQL City', '6', '1'],
                        ['Boston', '2', '0'],
                        ['Chicago', '2', '1'],
                      ].map(row => (
                        <tr key={row[0]}>
                          <td className="py-1" style={{ color: '#EDF1FA' }}>{row[0]}</td>
                          <td className="py-1" style={{ color: '#00C7BE' }}>{row[1]}</td>
                          <td className="py-1" style={{ color: '#F59E0B' }}>{row[2]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            {/* Floating badge */}
            <div className="absolute -bottom-5 -left-6 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2" style={{ background: '#111724', border: '1px solid rgba(0,199,190,0.2)', color: '#00C7BE' }}>
              <Zap className="w-3.5 h-3.5" /> WebAssembly powered
            </div>
          </div>
        </div>
      </section>

      {/* ── Marquee strip ────────────────────────────────────────────────────── */}
      <div className="relative z-10 overflow-hidden py-6 my-8" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="marquee-track gap-12 px-6">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <div key={i} className="flex items-center gap-2.5 shrink-0">
              <item.icon className="w-4 h-4" style={{ color: i % 2 === 0 ? '#00C7BE' : '#F59E0B' }} />
              <span className="text-sm font-medium whitespace-nowrap" style={{ color: '#7A87A5' }}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features grid ────────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 pb-24">
        <div className="mb-14">
          <h2 className="heading-lg text-2xl sm:text-3xl mb-3" style={{ color: '#EDF1FA' }}>
            Everything to learn{' '}
            <span className="text-gradient-teal">databases</span>
          </h2>
          <p className="text-base max-w-lg" style={{ color: '#8A97B3' }}>
            A complete environment — from first query to production-ready schema design.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => {
            const inner = (
              <>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <h3 className="font-semibold mb-2 font-display flex items-center gap-1.5" style={{ color: '#EDF1FA' }}>
                  {f.title}
                  {'href' in f && <ArrowRight className="w-3.5 h-3.5 opacity-50" />}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: '#8A97B3' }}>
                  {f.description}{accounts && 'accountsNote' in f ? f.accountsNote : ''}
                </p>
              </>
            );
            return 'href' in f ? (
              <Link
                key={f.title}
                href={f.href!}
                className={`rounded-2xl p-6 transition-all duration-300 shine-hover cursor-pointer block ${f.rotate}`}
                style={{ background: f.bg, border: `1px solid ${f.border}` }}
              >
                {inner}
              </Link>
            ) : (
              <div
                key={f.title}
                className={`rounded-2xl p-6 transition-all duration-300 cursor-default shine-hover ${f.rotate}`}
                style={{ background: f.bg, border: `1px solid ${f.border}` }}
              >
                {inner}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── CTA section — diagonal ───────────────────────────────────────────── */}
      <section className="relative z-10 diagonal-section py-32" style={{ background: '#0C1018' }}>
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="w-14 h-14 mx-auto mb-6 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #00C7BE, #0096A0)', boxShadow: '0 0 40px rgba(0, 199, 190, 0.3)' }}>
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <h2 className="heading-lg text-2xl sm:text-4xl mb-4" style={{ color: '#EDF1FA' }}>Ready to level up?</h2>
          <p className="text-base mb-9 max-w-md mx-auto" style={{ color: '#8A97B3' }}>
            Start free — no credit card, no install. Open the app and run your first query in under 30 seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/learn"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-base transition-all cursor-pointer shine-hover"
              style={{ background: '#F59E0B', color: '#07090F', boxShadow: '0 0 40px rgba(245, 158, 11, 0.35)' }}
            >
              <Play className="w-4 h-4" />
              Start Learning Free
            </Link>
            {accounts && (
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-base transition-all cursor-pointer"
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#EDF1FA' }}
              >
                View Pricing <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 py-10 text-center text-sm" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center justify-center gap-1.5 mb-3">
          <Database className="w-3.5 h-3.5" style={{ color: '#00C7BE' }} />
          <span className="font-semibold font-display" style={{ color: '#7A87A5' }}>DBAcademy</span>
        </div>
        <div className="flex items-center justify-center gap-5">
          {accounts && (
            <>
              <Link href="/pricing" className="transition-colors cursor-pointer" style={{ color: '#7A87A5' }}>Pricing</Link>
              <Link href="/auth/signin" className="transition-colors cursor-pointer" style={{ color: '#7A87A5' }}>Sign In</Link>
            </>
          )}
          <Link href="/lessons" className="transition-colors cursor-pointer" style={{ color: '#7A87A5' }}>Lessons</Link>
          <Link href="/learn" className="transition-colors cursor-pointer" style={{ color: '#7A87A5' }}>Database</Link>
          <Link href="/code" className="transition-colors cursor-pointer" style={{ color: '#7A87A5' }}>Code</Link>
        </div>
      </footer>
    </main>
  );
}
