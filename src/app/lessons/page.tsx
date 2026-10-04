import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PublicHeader, JsonLd } from '@/components/PublicHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { CURRICULUM } from '@/features/learn/curriculum/curriculum';
import { ENGINE_LABEL, LEARNING_PATH, TOTAL_PATH_LESSONS } from '@/features/learn/curriculum/path';
import { courseJsonLd, lessonSummary } from '@/features/learn/curriculum/seo';

const DESCRIPTION = `${TOTAL_PATH_LESSONS} free interactive SQL lessons with graded challenges: SELECT, WHERE, JOINs, GROUP BY, schema design, PostgreSQL window functions and NoSQL, all in your browser.`;

export const metadata: Metadata = {
  title: `Free SQL lessons: ${TOTAL_PATH_LESSONS} interactive exercises`,
  description: DESCRIPTION,
  alternates: { canonical: '/lessons' },
  openGraph: { title: `Free SQL lessons: ${TOTAL_PATH_LESSONS} interactive exercises`, description: DESCRIPTION, url: '/lessons' },
};

const ENGINE_COLOR: Record<string, string> = { sqlite: '#F59E0B', postgres: '#00C7BE', nosql: '#22C55E' };

export default function LessonsIndexPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <JsonLd data={courseJsonLd()} />
      <PublicHeader />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <header className="max-w-2xl mb-12">
          <p className="text-xs font-bold uppercase tracking-widest text-accent mb-3">Free course</p>
          <h1 className="heading-xl text-4xl sm:text-5xl mb-4">Learn SQL by doing</h1>
          <p className="text-lg text-muted leading-relaxed mb-6">
            {TOTAL_PATH_LESSONS} short lessons, each with a challenge you solve in a real database running in your browser.
            Start with a murder mystery, then work up to joins, schema design, PostgreSQL window functions and NoSQL.
          </p>
          <Link
            href={`/learn?lesson=${LEARNING_PATH[0].lesson.id}`}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-warm text-canvas hover:bg-warm/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warm"
          >
            Start lesson 1 <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </header>

        <ol className="space-y-10">
          {CURRICULUM.map((module, i) => (
            <li key={module.id}>
              <h2 className="flex flex-wrap items-center gap-3 text-xl font-bold font-display mb-4">
                <span className="text-muted tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                {module.title}
                <span
                  className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded"
                  style={{ color: ENGINE_COLOR[module.engine], background: `${ENGINE_COLOR[module.engine]}14`, border: `1px solid ${ENGINE_COLOR[module.engine]}33` }}
                >
                  {ENGINE_LABEL[module.engine]}
                </span>
              </h2>
              <ul className="grid sm:grid-cols-2 gap-3">
                {LEARNING_PATH.filter(s => s.module.id === module.id).map(step => (
                  <li key={step.slug}>
                    <Link
                      href={`/lessons/${step.slug}`}
                      className="group block h-full rounded-xl p-4 bg-surface border border-line hover:border-accent/40 hover:bg-card transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      <span className="flex items-center justify-between gap-2 font-semibold text-ink mb-1">
                        {step.lesson.title}
                        <ArrowRight className="w-4 h-4 text-faint group-hover:text-accent transition-colors" aria-hidden="true" />
                      </span>
                      <span className="block text-sm text-muted leading-relaxed">{lessonSummary(step)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </main>

      <SiteFooter />
    </div>
  );
}
