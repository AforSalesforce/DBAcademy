import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookOpen, Play, X, StickyNote, CheckCircle, ListChecks } from 'lucide-react';
import { Quiz, QuizQuestion } from './Quiz';
import { useProgressStore } from '@/stores/progress-store';
import { useNotesStore, latestLessonNote } from '@/stores/notes-store';

const NOTE_SAVE_DEBOUNCE_MS = 500;

type NoteSaveState = 'idle' | 'saving' | 'saved' | 'error';

interface LessonViewProps {
    id: string;
    title: string;
    content: string;
    defaultQuery?: string;
    quiz?: QuizQuestion[];
    moduleId?: string;
    onRunSample?: (query: string) => void;
    /** True when onRunSample runs the sample; false when it only loads it into the editor. */
    runsSample?: boolean;
    onClose: () => void;
    onEdit?: (newContent: string) => void;
    /**
     * The lesson's graded challenge (a <ChallengeCard>). When present, passing
     * it is what completes the lesson: there's no "Mark as complete" button
     * and the quiz only earns XP.
     */
    challengeSlot?: React.ReactNode;
}

export const LessonView: React.FC<LessonViewProps> = ({ id, title, content, defaultQuery, quiz, moduleId, onRunSample, runsSample = false, onClose, onEdit, challengeSlot }) => {
    const hasChallenge = Boolean(challengeSlot);
    const [note, setNote] = useState('');
    const [notesReady, setNotesReady] = useState(false);
    const [noteSaveState, setNoteSaveState] = useState<NoteSaveState>('idle');
    const pendingNote = useRef<string | null>(null);
    const noteSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(content);
    const [showQuiz, setShowQuiz] = useState(false);
    // Opening a lesson you've already quizzed shows your result, not a fresh start.
    // (The parent keys this component by lesson id, so this runs per lesson.)
    const [quizCompleted, setQuizCompleted] = useState(
        () => useProgressStore.getState().progress.lessonProgress[id]?.quizScore !== undefined
    );
    const { markLessonComplete, recordQuizScore } = useProgressStore();
    const lessonProgress = useProgressStore(s => s.progress.lessonProgress[id]);
    const isComplete = Boolean(lessonProgress?.completed);
    const bestQuizScore = lessonProgress?.quizScore;

    // Lesson notes live in the notes store (IndexedDB, synced when signed in) —
    // the same place the notes drawer reads. Wait for it to load, including
    // the one-time move of old localStorage notes, before showing the box.
    useEffect(() => {
        let cancelled = false;
        useNotesStore.getState().migrateFromLocalStorage().finally(() => {
            if (!cancelled) setNotesReady(true);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!notesReady) return;
        setNote(latestLessonNote(useNotesStore.getState().notes, id)?.contentMd ?? '');
        setNoteSaveState('idle');
    }, [id, notesReady]);

    // Switching lessons or closing the panel: save anything still pending.
    useEffect(() => {
        return () => {
            if (noteSaveTimer.current) clearTimeout(noteSaveTimer.current);
            const pending = pendingNote.current;
            pendingNote.current = null;
            if (pending !== null) void useNotesStore.getState().saveLessonNote(id, pending, title);
        };
    }, [id, title]);

    useEffect(() => {
        setEditedContent(content);
    }, [content]);

    const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setNote(newValue);
        pendingNote.current = newValue;
        setNoteSaveState('saving');
        if (noteSaveTimer.current) clearTimeout(noteSaveTimer.current);
        noteSaveTimer.current = setTimeout(async () => {
            const content = pendingNote.current;
            pendingNote.current = null;
            if (content === null) return;
            try {
                await useNotesStore.getState().saveLessonNote(id, content, title);
                setNoteSaveState('saved');
            } catch {
                // Keep the text queued so the next keystroke (or leaving the lesson) retries it.
                pendingNote.current ??= content;
                setNoteSaveState('error');
            }
        }, NOTE_SAVE_DEBOUNCE_MS);
    };

    const handleSave = () => {
        if (onEdit) {
            onEdit(editedContent);
        }
        setIsEditing(false);
    };

    return (
        <div className="flex flex-col h-full bg-surface border-r border-line relative w-full mx-auto">
            {/* Header */}
            <div className="flex items-start justify-between p-6 pb-4 border-b border-line bg-surface sticky top-0 z-10 shadow-sm shrink-0">
                <div>
                    <div className="flex items-center gap-2 text-accent mb-2">
                        <BookOpen size={20} />
                        <span className="text-sm font-bold uppercase tracking-wide">Current Lesson</span>
                    </div>
                    <h1 className="text-2xl font-extrabold text-ink leading-tight">{title}</h1>
                </div>
                <div className="flex items-center gap-2">
                    {onEdit && !isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="px-3 py-1.5 text-xs font-medium text-ink bg-card hover:bg-card-hover rounded-md transition-colors"
                        >
                            Edit Lesson
                        </button>
                    )}
                    {isEditing && (
                        <button
                            onClick={handleSave}
                            className="px-3 py-1.5 text-xs font-medium text-canvas bg-success hover:bg-success/90 rounded-md transition-colors shadow-sm"
                        >
                            Save Changes
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="p-2 text-muted hover:text-ink hover:bg-card rounded-full transition-colors"
                        title="Close Lesson"
                    >
                        <X size={24} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Content */}
                <div className="prose dark:prose-invert prose-slate max-w-none prose-code:before:content-none prose-code:after:content-none">
                    {isEditing ? (
                        <textarea
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            className="w-full h-[500px] p-4 font-mono text-sm bg-surface border border-white/10 rounded-md focus:ring-2 focus:ring-accent outline-none resize-none"
                            placeholder="# Lesson Title\n\nWrite your lesson content here..."
                            autoFocus
                        />
                    ) : (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {content}
                        </ReactMarkdown>
                    )}
                </div>

                {!isEditing && challengeSlot}

                {/* Sample Query */}
                {!isEditing && defaultQuery && !hasChallenge && (
                    <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
                        <div className="flex items-center justify-between gap-3 mb-2">
                            <h3 className="font-bold text-accent">Try it out</h3>
                            {onRunSample && (
                                <button
                                    onClick={() => onRunSample(defaultQuery)}
                                    className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent/90 text-canvas text-xs font-semibold px-3 py-1.5 rounded shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                                >
                                    {runsSample && <Play size={12} aria-hidden="true" />}
                                    {runsSample ? 'Run it' : 'Load into editor'}
                                </button>
                            )}
                        </div>
                        <p className="text-sm text-accent mb-3">
                            {runsSample
                                ? <>This query is already in the editor. Change it and press Run (⌘↵), or run it as-is.</>
                                : <>Load this example into the editor, then press Run.</>}
                        </p>
                        <pre className="bg-card text-ink p-3 rounded-md text-sm overflow-x-auto font-mono">
                            {defaultQuery}
                        </pre>
                    </div>
                )}

                {/* Quiz Section */}
                {!isEditing && quiz && quiz.length > 0 && (
                    <div className="border border-white/10 rounded-lg overflow-hidden">
                        {!showQuiz && !quizCompleted ? (
                            <div className="p-6 text-center bg-gradient-to-b from-accent/10 to-surface">
                                <h3 className="font-bold text-lg mb-2 flex items-center justify-center gap-2 text-ink">
                                    <ListChecks className="w-5 h-5 text-accent" aria-hidden="true" /> Lesson quiz
                                </h3>
                                <p className="text-sm text-muted mb-4">
                                    Test your understanding with {quiz.length} question{quiz.length > 1 ? 's' : ''}.
                                </p>
                                <button
                                    onClick={() => setShowQuiz(true)}
                                    className="px-4 py-2 bg-accent hover:bg-accent/90 text-canvas rounded-lg text-sm font-medium transition-colors"
                                >
                                    Start Quiz
                                </button>
                            </div>
                        ) : showQuiz ? (
                            <Quiz
                                title={`${title} Quiz`}
                                questions={quiz}
                                completesLesson={!hasChallenge && Boolean(moduleId)}
                                onComplete={(score) => {
                                    // Record now; the quiz stays open on its results screen.
                                    recordQuizScore(id, score);
                                    if (score >= 70 && moduleId && !hasChallenge) {
                                        markLessonComplete(id, moduleId);
                                    }
                                }}
                                onContinue={() => {
                                    setShowQuiz(false);
                                    setQuizCompleted(true);
                                }}
                            />
                        ) : (
                            <div className="p-4 bg-success/10 text-center">
                                <CheckCircle className="w-6 h-6 text-success mx-auto mb-2" />
                                <p className="text-sm font-medium text-success">
                                    Quiz completed{bestQuizScore !== undefined ? ` · best score ${bestQuizScore}%` : ''}
                                </p>
                                <button
                                    onClick={() => { setQuizCompleted(false); setShowQuiz(true); }}
                                    className="text-xs text-muted hover:text-ink mt-2 underline"
                                >
                                    Retake quiz
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Mark Complete Button */}
                {!isEditing && moduleId && (isComplete || !hasChallenge) && (
                    <div className="flex justify-end" aria-live="polite">
                        {isComplete ? (
                            <p className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-success">
                                <CheckCircle className="w-4 h-4" aria-hidden="true" /> Lesson complete
                            </p>
                        ) : (
                            <button
                                onClick={() => markLessonComplete(id, moduleId)}
                                className="flex items-center gap-2 px-4 py-2 bg-success hover:bg-success/90 text-canvas rounded-lg text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-success"
                            >
                                <CheckCircle className="w-4 h-4" aria-hidden="true" /> Mark as complete
                            </button>
                        )}
                    </div>
                )}

                {/* Notes Section */}
                <div className="pt-6 border-t border-line">
                    <h3 id={`lesson-notes-${id}`} className="flex items-center gap-2 font-bold text-ink mb-3">
                        <StickyNote size={18} aria-hidden="true" />
                        My Notes
                    </h3>
                    {notesReady ? (
                        <textarea
                            value={note}
                            onChange={handleNoteChange}
                            aria-labelledby={`lesson-notes-${id}`}
                            placeholder="Type your notes here… they save as you type."
                            className="w-full h-32 p-3 text-sm text-ink placeholder:text-faint bg-card border border-white/10 rounded-md focus:ring-2 focus:ring-accent focus:border-transparent outline-none resize-y transition-all shadow-sm"
                        />
                    ) : (
                        <div className="w-full h-32 bg-card rounded-md animate-pulse" aria-hidden="true"></div>
                    )}
                    <p className="text-xs text-muted mt-2 text-right" aria-live="polite">
                        {noteSaveState === 'saving' && 'Saving…'}
                        {noteSaveState === 'saved' && 'Saved in this browser.'}
                        {noteSaveState === 'error' && (
                            <span className="text-danger">
                                Couldn&apos;t save. Your text is still here; keep typing to retry.
                            </span>
                        )}
                        {noteSaveState === 'idle' && 'Notes save automatically in this browser.'}
                    </p>
                </div>
            </div>
        </div>
    );
};
