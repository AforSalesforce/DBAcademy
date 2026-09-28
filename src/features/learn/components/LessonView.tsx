import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookOpen, AlertCircle, X, StickyNote, CheckCircle } from 'lucide-react';
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
    onClose: () => void;
    onEdit?: (newContent: string) => void;
}

export const LessonView: React.FC<LessonViewProps> = ({ id, title, content, defaultQuery, quiz, moduleId, onRunSample, onClose, onEdit }) => {
    const [note, setNote] = useState('');
    const [notesReady, setNotesReady] = useState(false);
    const [noteSaveState, setNoteSaveState] = useState<NoteSaveState>('idle');
    const pendingNote = useRef<string | null>(null);
    const noteSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(content);
    const [showQuiz, setShowQuiz] = useState(false);
    const [quizCompleted, setQuizCompleted] = useState(false);
    const { markLessonComplete, recordQuizScore } = useProgressStore();

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
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 relative w-full mx-auto">
            {/* Header */}
            <div className="flex items-start justify-between p-6 pb-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10 shadow-sm shrink-0">
                <div>
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                        <BookOpen size={20} />
                        <span className="text-sm font-bold uppercase tracking-wide">Current Lesson</span>
                    </div>
                    <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 leading-tight">{title}</h1>
                </div>
                <div className="flex items-center gap-2">
                    {onEdit && !isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
                        >
                            Edit Lesson
                        </button>
                    )}
                    {isEditing && (
                        <button
                            onClick={handleSave}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors shadow-sm"
                        >
                            Save Changes
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                        title="Close Lesson"
                    >
                        <X size={24} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Content */}
                <div className="prose dark:prose-invert prose-slate max-w-none">
                    {isEditing ? (
                        <textarea
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            className="w-full h-[500px] p-4 font-mono text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                            placeholder="# Lesson Title\n\nWrite your lesson content here..."
                            autoFocus
                        />
                    ) : (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {content}
                        </ReactMarkdown>
                    )}
                </div>

                {/* Sample Query */}
                {!isEditing && defaultQuery && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <h3 className="flex items-center gap-2 font-bold text-blue-800 dark:text-blue-200 mb-2">
                            <AlertCircle size={18} />
                            Try it out
                        </h3>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                            Copy this query to the editor or click &ldquo;Run&rdquo; to see it in action.
                        </p>
                        <div className="relative group">
                            <pre className="bg-slate-800 text-slate-100 p-3 rounded-md text-sm overflow-x-auto font-mono">
                                {defaultQuery}
                            </pre>
                            {onRunSample && (
                                <button
                                    onClick={() => onRunSample(defaultQuery)}
                                    className="absolute top-2 right-2 bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    Run Query
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Quiz Section */}
                {!isEditing && quiz && quiz.length > 0 && (
                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        {!showQuiz && !quizCompleted ? (
                            <div className="p-6 text-center bg-gradient-to-b from-indigo-50 to-white dark:from-indigo-900/20 dark:to-slate-900">
                                <h3 className="font-bold text-lg mb-2">📝 Lesson Quiz</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                                    Test your understanding with {quiz.length} question{quiz.length > 1 ? 's' : ''}.
                                </p>
                                <button
                                    onClick={() => setShowQuiz(true)}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                    Start Quiz
                                </button>
                            </div>
                        ) : showQuiz ? (
                            <Quiz
                                title={`${title} Quiz`}
                                questions={quiz}
                                onComplete={(score) => {
                                    setQuizCompleted(true);
                                    setShowQuiz(false);
                                    recordQuizScore(id, score);
                                    if (score >= 70 && moduleId) {
                                        markLessonComplete(id, moduleId);
                                    }
                                }}
                            />
                        ) : (
                            <div className="p-4 bg-green-50 dark:bg-green-900/20 text-center">
                                <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
                                <p className="text-sm font-medium text-green-700 dark:text-green-300">Quiz completed!</p>
                                <button
                                    onClick={() => { setQuizCompleted(false); setShowQuiz(true); }}
                                    className="text-xs text-slate-500 hover:text-slate-700 mt-2 underline"
                                >
                                    Retry
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Mark Complete Button */}
                {!isEditing && moduleId && (
                    <div className="flex justify-end">
                        <button
                            onClick={() => markLessonComplete(id, moduleId)}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            <CheckCircle className="w-4 h-4" /> Mark as Complete
                        </button>
                    </div>
                )}

                {/* Notes Section */}
                <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
                    <h3 id={`lesson-notes-${id}`} className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 mb-3">
                        <StickyNote size={18} aria-hidden="true" />
                        My Notes
                    </h3>
                    {notesReady ? (
                        <textarea
                            value={note}
                            onChange={handleNoteChange}
                            aria-labelledby={`lesson-notes-${id}`}
                            placeholder="Type your notes here… they save as you type."
                            className="w-full h-32 p-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y transition-all shadow-sm"
                        />
                    ) : (
                        <div className="w-full h-32 bg-slate-100 dark:bg-slate-800 rounded-md animate-pulse" aria-hidden="true"></div>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-right" aria-live="polite">
                        {noteSaveState === 'saving' && 'Saving…'}
                        {noteSaveState === 'saved' && 'Saved in this browser.'}
                        {noteSaveState === 'error' && (
                            <span className="text-red-600 dark:text-red-400">
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
