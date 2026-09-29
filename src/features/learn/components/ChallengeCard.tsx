'use client';

import React, { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Lightbulb, Eye, ArrowRight, RotateCcw, Target, Loader2 } from 'lucide-react';
import type { Challenge } from '@/features/learn/curriculum/challenges';
import type { Grade } from '@/features/learn/grading/grade';
import { describeVerdict } from '@/features/learn/grading/grade';
import { useProgressStore, challengeXp } from '@/stores/progress-store';

interface ChallengeCardProps {
    lessonId: string;
    challenge: Challenge;
    grade: Grade | null;
    checking: boolean;
    /** XP paid by the pass that produced `grade` (0 when the lesson was already done). */
    xpAwarded: number | null;
    onCheck: () => void;
    onResetStarter: () => void;
    onUseSolution: (solution: string) => void;
    onNextLesson?: () => void;
    /** Beginner-friendly explanation of an error message, if there is one. */
    explain: (message: string) => string | null;
}

export function ChallengeCard({
    lessonId, challenge, grade, checking, xpAwarded,
    onCheck, onResetStarter, onUseSolution, onNextLesson, explain,
}: ChallengeCardProps) {
    const lessonProgress = useProgressStore(s => s.progress.lessonProgress[lessonId]);
    const recordHelp = useProgressStore(s => s.recordHelp);
    const hintsShown = lessonProgress?.hintsUsed ?? 0;
    const solutionShown = Boolean(lessonProgress?.solutionShown);
    const isComplete = Boolean(lessonProgress?.completed);
    const [confirmingSolution, setConfirmingSolution] = useState(false);
    const worth = challengeXp(hintsShown, solutionShown);

    const revealHint = () => recordHelp(lessonId, { hintsUsed: Math.min(hintsShown + 1, challenge.hints.length) });
    const revealSolution = () => {
        recordHelp(lessonId, { solutionShown: true });
        setConfirmingSolution(false);
    };

    return (
        <section aria-labelledby={`challenge-${lessonId}`} className="rounded-lg border border-teal-500/30 bg-teal-500/[0.06] overflow-hidden">
            {/* Task */}
            <div className="p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                    <h3 id={`challenge-${lessonId}`} className="flex items-center gap-2 font-bold text-teal-300">
                        <Target size={16} aria-hidden="true" /> Your challenge
                    </h3>
                    <span className="text-xs font-medium text-slate-400">
                        {isComplete ? 'Completed' : `Worth ${worth} XP`}
                    </span>
                </div>
                <p className="text-sm leading-relaxed text-slate-100">{challenge.prompt}</p>

                <div className="flex flex-wrap items-center gap-3 mt-4">
                    <button
                        onClick={onCheck}
                        disabled={checking}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 disabled:opacity-60 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
                    >
                        {checking
                            ? <><Loader2 size={14} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> Checking…</>
                            : <><CheckCircle2 size={14} aria-hidden="true" /> Check my answer</>}
                    </button>
                    <button
                        onClick={onResetStarter}
                        className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-300 rounded"
                    >
                        <RotateCcw size={12} aria-hidden="true" /> Start over
                    </button>
                </div>
                <p className="text-xs text-slate-400 mt-2">Write your query in the editor. Checking runs it on a fresh copy of the sample data, so changes you&apos;ve made to your own tables won&apos;t count against you.</p>
            </div>

            {/* Feedback */}
            <div aria-live="polite">
                {grade && !checking && <Feedback grade={grade} challenge={challenge} xpAwarded={xpAwarded} onNextLesson={onNextLesson} explain={explain} />}
            </div>

            {/* Help */}
            <div className="px-4 py-3 border-t border-white/5 space-y-3">
                {hintsShown > 0 && (
                    <ol className="space-y-2">
                        {challenge.hints.slice(0, hintsShown).map((hint, i) => (
                            <li key={i} className="flex gap-2 text-sm text-slate-200">
                                <Lightbulb size={14} className="mt-0.5 shrink-0 text-amber-400" aria-hidden="true" />
                                <span><span className="sr-only">Hint {i + 1}: </span>{hint}</span>
                            </li>
                        ))}
                    </ol>
                )}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    {hintsShown < challenge.hints.length && (
                        <button
                            onClick={revealHint}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-300 hover:text-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 rounded"
                        >
                            <Lightbulb size={13} aria-hidden="true" />
                            {hintsShown === 0 ? 'Get a hint' : 'Another hint'} ({hintsShown + 1} of {challenge.hints.length})
                            {!isComplete && !solutionShown && <span className="text-slate-500 font-normal">· −5 XP</span>}
                        </button>
                    )}
                    {!solutionShown && !confirmingSolution && (
                        <button
                            onClick={() => (isComplete ? revealSolution() : setConfirmingSolution(true))}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-300 rounded"
                        >
                            <Eye size={13} aria-hidden="true" /> Show solution
                        </button>
                    )}
                </div>

                {confirmingSolution && (
                    <div className="rounded-md bg-slate-900/80 border border-white/10 p-3 text-sm text-slate-200">
                        <p>Seeing the solution drops this challenge to 5 XP. You can still check it afterwards.</p>
                        <div className="flex gap-3 mt-2">
                            <button onClick={revealSolution} className="text-xs font-semibold text-slate-100 underline underline-offset-2">Show it</button>
                            <button onClick={() => setConfirmingSolution(false)} className="text-xs text-slate-400 hover:text-slate-200">Keep trying</button>
                        </div>
                    </div>
                )}

                {solutionShown && (
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Solution</p>
                            <button
                                onClick={() => onUseSolution(challenge.solution)}
                                className="text-xs font-medium text-teal-300 hover:text-teal-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-300 rounded"
                            >
                                Put in editor
                            </button>
                        </div>
                        <pre className="bg-slate-950 text-slate-100 p-3 rounded-md text-xs overflow-x-auto font-mono">{challenge.solution}</pre>
                    </div>
                )}
            </div>
        </section>
    );
}

function Feedback({ grade, challenge, xpAwarded, onNextLesson, explain }: {
    grade: Grade;
    challenge: Challenge;
    xpAwarded: number | null;
    onNextLesson?: () => void;
    explain: (message: string) => string | null;
}) {
    if (grade.status === 'pass') {
        return (
            <div className="mx-4 mb-4 rounded-md border border-green-500/30 bg-green-500/10 p-3" role="status">
                <p className="flex items-center gap-2 text-sm font-semibold text-green-300">
                    <CheckCircle2 size={16} aria-hidden="true" />
                    Correct!{xpAwarded ? ` +${xpAwarded} XP` : ''}
                </p>
                <p className="text-xs text-green-200/80 mt-1">
                    {xpAwarded ? 'Lesson complete.' : 'You\'d already completed this lesson.'}
                    {grade.note === 'column-order' ? ' (Your columns are in a different order, which is fine.)' : ''}
                </p>
                {onNextLesson && (
                    <button
                        onClick={onNextLesson}
                        className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-md text-xs font-semibold bg-green-500 text-slate-950 hover:bg-green-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-300"
                    >
                        Next lesson <ArrowRight size={13} aria-hidden="true" />
                    </button>
                )}
            </div>
        );
    }

    if (grade.status === 'error') {
        const hint = explain(grade.message);
        return (
            <div className="mx-4 mb-4 rounded-md border border-red-500/30 bg-red-500/10 p-3" role="alert">
                <p className="flex items-center gap-2 text-sm font-semibold text-red-300">
                    <AlertTriangle size={16} aria-hidden="true" /> Your query hit an error
                </p>
                <p className="text-xs font-mono text-red-200/90 mt-1 break-words">{grade.message}</p>
                {hint && <p className="text-sm text-slate-200 mt-2">{hint}</p>}
            </div>
        );
    }

    const { title, detail } = describeVerdict(grade.verdict, Boolean(challenge.check));
    const v = grade.verdict;
    return (
        <div className="mx-4 mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-3" role="status">
            <p className="flex items-center gap-2 text-sm font-semibold text-amber-200">
                <XCircle size={16} aria-hidden="true" /> Not yet. {title}
            </p>
            {detail && <p className="text-xs text-amber-100/80 mt-1">{detail}</p>}
            {v.kind === 'values' && (
                <div className="mt-2 space-y-2 text-xs">
                    <RowList label="Missing from your result" columns={v.columns} rows={v.missing} />
                    <RowList label="In your result, but not the answer" columns={v.columns} rows={v.extra} />
                </div>
            )}
        </div>
    );
}

function RowList({ label, columns, rows }: { label: string; columns: string[]; rows: string[][] }) {
    if (rows.length === 0) return null;
    return (
        <div>
            <p className="text-amber-100/80 mb-1">{label}:</p>
            <ul className="space-y-1">
                {rows.map((row, i) => (
                    <li key={i} className="font-mono text-slate-200 bg-slate-950/60 rounded px-2 py-1 break-words">
                        {row.map((v, c) => (columns.length > 1 ? `${columns[c]}: ${v}` : v)).join(' · ')}
                    </li>
                ))}
            </ul>
        </div>
    );
}
