'use client';

import React from 'react';
import { ArrowRight, BookOpen, CheckCircle2, PenLine, Search, Trophy, X } from 'lucide-react';
import { useProgressStore } from '@/stores/progress-store';
import {
  ENGINE_LABEL, PathStep, TOTAL_PATH_LESSONS, completedPathLessons, nextIncompleteStep,
} from '@/features/learn/curriculum/path';

interface LearnHomeProps {
  onStart: (step: PathStep) => void;
  onDismiss: () => void;
}

/**
 * Shown in the lesson column when no lesson is open: a first-run welcome
 * for new learners, "continue where you left off" for returning ones.
 */
export function LearnHome({ onStart, onDismiss }: LearnHomeProps) {
  const lessonProgress = useProgressStore(s => s.progress.lessonProgress);
  const isComplete = (id: string) => Boolean(lessonProgress[id]?.completed);
  const done = completedPathLessons(isComplete);
  const next = nextIncompleteStep(isComplete);
  const percent = Math.round((done / TOTAL_PATH_LESSONS) * 100);

  return (
    <section className="relative h-full overflow-y-auto p-6 sm:p-8" aria-labelledby="learn-home-title" style={{ color: '#EDF1FA' }}>
      <button
        onClick={onDismiss}
        className="absolute top-4 right-4 p-2 rounded-full transition-colors hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-400"
        style={{ color: '#8A97B3' }}
        aria-label="Close and use the playground"
        title="Close and use the playground"
      >
        <X className="w-5 h-5" />
      </button>

      {done === 0 && next ? (
        <>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#00C7BE' }}>Welcome to DBAcademy</p>
          <h2 id="learn-home-title" className="text-2xl sm:text-3xl font-extrabold font-display leading-tight mb-3">
            A murder in SQL City. You have the database.
          </h2>
          <p className="text-base leading-relaxed mb-6" style={{ color: '#B4BED3' }}>
            Learn SQL by solving the case, one query at a time. Everything runs in your browser; there&apos;s nothing to install.
          </p>

          <ol className="space-y-3 mb-8">
            {[
              { Icon: BookOpen, text: 'Read a short lesson' },
              { Icon: PenLine, text: 'Write a query in the editor and run it' },
              { Icon: CheckCircle2, text: 'Check your answer to finish the lesson' },
            ].map(({ Icon, text }, i) => (
              <li key={text} className="flex items-center gap-3 text-sm">
                <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold" style={{ background: 'rgba(0,199,190,0.12)', color: '#00C7BE' }}>
                  {i + 1}
                </span>
                <Icon className="w-4 h-4 shrink-0" style={{ color: '#8A97B3' }} aria-hidden="true" />
                {text}
              </li>
            ))}
          </ol>

          <StartButton onClick={() => onStart(next)} label={`Start lesson 1: ${next.lesson.title}`} />
          <p className="text-xs mt-4" style={{ color: '#8A97B3' }}>
            {TOTAL_PATH_LESSONS} lessons across SQLite, PostgreSQL and NoSQL. Your progress saves in this browser.
          </p>
        </>
      ) : next ? (
        <>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#00C7BE' }}>Welcome back</p>
          <h2 id="learn-home-title" className="text-2xl font-extrabold font-display leading-tight mb-5">Pick up where you left off</h2>

          <div className="mb-6">
            <div className="flex justify-between text-xs mb-1.5" style={{ color: '#8A97B3' }}>
              <span>{done} of {TOTAL_PATH_LESSONS} lessons complete</span>
              <span>{percent}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1A2235' }} role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Path progress">
              <div className="h-full rounded-full" style={{ width: `${percent}%`, background: 'linear-gradient(90deg, #00C7BE, #00E5DC)' }} />
            </div>
          </div>

          <div className="rounded-xl p-4 mb-5" style={{ background: '#111724', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-xs mb-1" style={{ color: '#8A97B3' }}>
              Next up · Module {next.moduleNumber}: {next.module.title} · {ENGINE_LABEL[next.module.engine]}
            </p>
            <p className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Search className="w-4 h-4 shrink-0" style={{ color: '#00C7BE' }} aria-hidden="true" />
              {next.lesson.title}
            </p>
            <StartButton onClick={() => onStart(next)} label="Continue" />
          </div>
        </>
      ) : (
        <>
          <Trophy className="w-10 h-10 mb-4" style={{ color: '#F59E0B' }} aria-hidden="true" />
          <h2 id="learn-home-title" className="text-2xl font-extrabold font-display leading-tight mb-3">You&apos;ve finished every lesson</h2>
          <p className="text-base leading-relaxed mb-6" style={{ color: '#B4BED3' }}>
            All {TOTAL_PATH_LESSONS} lessons done. The playground is yours: design a schema, write your own lessons, or revisit any challenge from the sidebar.
          </p>
          <button
            onClick={onDismiss}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
            style={{ background: '#00C7BE', color: '#07090F' }}
          >
            Open the playground
          </button>
        </>
      )}
    </section>
  );
}

function StartButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-transform active:scale-[0.98] motion-reduce:transform-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
      style={{ background: '#00C7BE', color: '#07090F' }}
    >
      {label} <ArrowRight className="w-4 h-4" aria-hidden="true" />
    </button>
  );
}
