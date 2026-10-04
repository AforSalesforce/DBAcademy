import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, ArrowRight, ListChecks, Play, Target } from 'lucide-react';
import { PublicHeader, JsonLd } from '@/components/PublicHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { ENGINE_LABEL, LEARNING_PATH, findStepBySlug } from '@/features/learn/curriculum/path';
import { lessonBody, lessonDescription, lessonJsonLd, lessonSummary } from '@/features/learn/curriculum/seo';

// One static page per path lesson; any other slug is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return LEARNING_PATH.map(step => ({ slug: step.slug }));
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const step = findStepBySlug((await params).slug);
  if (!step) return {};
  const engine = ENGINE_LABEL[step.module.engine];
  const title = `${step.lesson.title}: ${engine} lesson`;
  const description = lessonDescription(step);
  return {
    title,
    description,
    alternates: { canonical: `/lessons/${step.slug}` },
    openGraph: { type: 'article', title, description, url: `/lessons/${step.slug}` },
  };
}

export default async function LessonPage({ params }: Params) {
  const step = findStepBySlug((await params).slug);
  if (!step) notFound();

  const index = LEARNING_PATH.indexOf(step);
  const prev = LEARNING_PATH[index - 1];
  const next = LEARNING_PATH[index + 1];
  const engine = ENGINE_LABEL[step.module.engine];
  const { lesson, module, moduleNumber } = step;
  const openInApp = `/learn?lesson=${encodeURIComponent(lesson.id)}`;

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <JsonLd data={lessonJsonLd(step)} />
      <PublicHeader />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <nav aria-label="Breadcrumb" className="text-sm text-muted mb-6">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link href="/lessons" className="hover:text-ink underline-offset-4 hover:underline">Lessons</Link></li>
            <li aria-hidden="true">/</li>
            <li>Module {moduleNumber}: {module.title}</li>
          </ol>
        </nav>

        <header className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-accent mb-3">
            Lesson {index + 1} of {LEARNING_PATH.length} · {engine}
          </p>
          <h1 className="heading-xl text-4xl sm:text-5xl mb-4">{lesson.title}</h1>
          <p className="text-lg text-muted leading-relaxed">{lessonSummary(step)}</p>
        </header>

        <article className="prose prose-invert max-w-none prose-code:before:content-none prose-code:after:content-none prose-headings:font-display prose-a:text-accent mb-10">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{lessonBody(step)}</ReactMarkdown>
        </article>

        {lesson.challenge && (
          <section aria-labelledby="challenge" className="rounded-2xl border border-accent/30 bg-accent/[0.06] p-6 mb-10">
            <h2 id="challenge" className="flex items-center gap-2 text-lg font-bold text-accent mb-2">
              <Target className="w-5 h-5" aria-hidden="true" /> Your challenge
            </h2>
            <p className="text-ink leading-relaxed mb-5">{lesson.challenge.prompt}</p>
            <Link
              href={openInApp}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-accent text-canvas hover:bg-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Play className="w-4 h-4" aria-hidden="true" /> Solve it in your browser
            </Link>
            <p className="text-sm text-muted mt-3">
              Free, no sign-up. The {engine} database runs in your browser; your answer is checked instantly, with hints if you need them.
              {lesson.quiz?.length ? (
                <span className="inline-flex items-center gap-1 ml-1">
                  <ListChecks className="w-3.5 h-3.5 inline" aria-hidden="true" /> Plus a {lesson.quiz.length}-question quiz.
                </span>
              ) : null}
            </p>
          </section>
        )}

        <nav aria-label="Lesson navigation" className="grid sm:grid-cols-2 gap-3">
          {prev ? (
            <Link href={`/lessons/${prev.slug}`} className="group rounded-xl p-4 bg-surface border border-line hover:border-accent/40 transition-colors">
              <span className="flex items-center gap-1.5 text-xs text-muted mb-1"><ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Previous</span>
              <span className="font-semibold">{prev.lesson.title}</span>
            </Link>
          ) : <span />}
          {next && (
            <Link href={`/lessons/${next.slug}`} className="group rounded-xl p-4 bg-surface border border-line hover:border-accent/40 transition-colors sm:text-right">
              <span className="flex items-center sm:justify-end gap-1.5 text-xs text-muted mb-1">Next <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" /></span>
              <span className="font-semibold">{next.lesson.title}</span>
            </Link>
          )}
        </nav>
      </main>

      <SiteFooter />
    </div>
  );
}
