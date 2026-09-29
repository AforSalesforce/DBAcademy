'use client';

import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Plus, CheckCircle, Circle, Folder, Trash2 } from 'lucide-react';
import { EngineType } from '@/db-engines/types';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface Lesson {
    id: string;
    title: string;
    completed: boolean;
    /** Part of the shipped curriculum: can't be deleted. */
    builtIn?: boolean;
}

export interface Module {
    id: string;
    title: string;
    lessons: Lesson[];
    engine?: EngineType;
    /** Part of the shipped curriculum: can't be deleted. */
    builtIn?: boolean;
    /** Position in the learning path (built-in modules only). */
    number?: number;
}

const ENGINE_BADGE: Partial<Record<EngineType, { label: string; color: string }>> = {
    sqlite: { label: 'SQLite', color: '#F59E0B' },
    postgres: { label: 'Postgres', color: '#00C7BE' },
    nosql: { label: 'NoSQL', color: '#22C55E' },
};

interface SidebarProps {
    modules: Module[];
    activeLessonId?: string;
    onAddModule: (title: string) => void;
    onAddLesson: (moduleId: string, title: string) => void;
    onSelectLesson: (lesson: Lesson, moduleId: string) => void;
    onRemoveModule?: (moduleId: string) => void;
    onRemoveLesson?: (moduleId: string, lessonId: string) => void;
    /** Module to show open (the one with the current or next lesson); others start collapsed. */
    focusModuleId?: string;
}

export function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

/** Enter / Space activate a non-button element that acts as one. */
function activateOnKey(e: React.KeyboardEvent, action: () => void) {
    if (e.target !== e.currentTarget) return; // let nested buttons handle their own keys
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        action();
    }
}

const Sidebar: React.FC<SidebarProps> = ({ modules, activeLessonId, onAddModule, onAddLesson, onSelectLesson, onRemoveModule, onRemoveLesson, focusModuleId }) => {
    const [isAddingModule, setIsAddingModule] = useState(false);
    const [newModuleTitle, setNewModuleTitle] = useState('');
    // Modules the learner opened or closed by hand; everything else follows
    // the default (only the focus module open, or all open without one).
    const [toggled, setToggled] = useState<Set<string>>(new Set());
    const isExpanded = (id: string) => (!focusModuleId || id === focusModuleId) !== toggled.has(id);
    const [hoveredModuleId, setHoveredModuleId] = useState<string | null>(null);
    const [hoveredLessonId, setHoveredLessonId] = useState<string | null>(null);

    // We track which module acts as the active input for a new lesson
    const [addingLessonToModuleId, setAddingLessonToModuleId] = useState<string | null>(null);
    const [newLessonTitle, setNewLessonTitle] = useState('');

    const toggleModule = (id: string) => {
        const next = new Set(toggled);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setToggled(next);
    };

    const handleSubmitModule = (e: React.FormEvent) => {
        e.preventDefault();
        if (newModuleTitle.trim()) {
            onAddModule(newModuleTitle);
            setNewModuleTitle('');
            setIsAddingModule(false);
        }
    };

    const handleSubmitLesson = (e: React.FormEvent, moduleId: string) => {
        e.preventDefault();
        if (newLessonTitle.trim()) {
            onAddLesson(moduleId, newLessonTitle);
            setNewLessonTitle('');
            setAddingLessonToModuleId(null);
        }
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {modules.map(module => (
                    <div key={module.id}>
                        <div
                            className="flex items-center justify-between mb-2 px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-400"
                            onClick={() => toggleModule(module.id)}
                            onKeyDown={e => activateOnKey(e, () => toggleModule(module.id))}
                            role="button"
                            tabIndex={0}
                            aria-expanded={isExpanded(module.id)}
                            onMouseEnter={() => setHoveredModuleId(module.id)}
                            onMouseLeave={() => setHoveredModuleId(null)}
                        >
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                {isExpanded(module.id) ? (
                                    <ChevronDown size={16} />
                                ) : (
                                    <ChevronRight size={16} />
                                )}
                                <span className="uppercase tracking-wider text-xs">
                                    {module.number ? `${module.number}. ` : ''}{module.title}
                                </span>
                            </div>
                            <ModuleMeta module={module} />
                            <div className={cn(
                                "flex items-center gap-0.5 transition-opacity focus-within:opacity-100",
                                hoveredModuleId === module.id ? "opacity-100" : "opacity-0"
                            )}>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setAddingLessonToModuleId(module.id);
                                        if (!isExpanded(module.id)) toggleModule(module.id);
                                    }}
                                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                                    title="Add Lesson"
                                    aria-label={`Add a lesson to ${module.title}`}
                                >
                                    <Plus size={14} />
                                </button>
                                {onRemoveModule && !module.builtIn && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (module.lessons.length > 0) {
                                                if (!window.confirm(`Delete "${module.title}" and its ${module.lessons.length} lesson${module.lessons.length !== 1 ? 's' : ''}?`)) return;
                                            }
                                            onRemoveModule(module.id);
                                        }}
                                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors text-slate-400"
                                        title="Delete Module"
                                        aria-label={`Delete ${module.title}`}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {isExpanded(module.id) && (
                            <div className="space-y-1 ml-2 pl-2 border-l border-slate-200 dark:border-slate-800">
                                {module.lessons.map(lesson => {
                                    const isActive = activeLessonId === lesson.id;
                                    const isHovered = hoveredLessonId === lesson.id;
                                    return (
                                        <div
                                            key={lesson.id}
                                            onClick={() => onSelectLesson(lesson, module.id)}
                                            onKeyDown={e => activateOnKey(e, () => onSelectLesson(lesson, module.id))}
                                            role="button"
                                            tabIndex={0}
                                            aria-current={isActive ? 'true' : undefined}
                                            onMouseEnter={() => setHoveredLessonId(lesson.id)}
                                            onMouseLeave={() => setHoveredLessonId(null)}
                                            className={cn(
                                                "flex items-center gap-3 px-3 py-2 text-sm rounded-md cursor-pointer transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-400",
                                                isActive
                                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium"
                                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                            )}
                                        >
                                            {lesson.completed ? (
                                                <CheckCircle size={16} className="text-green-500 shrink-0" />
                                            ) : (
                                                <Circle size={16} className={cn("text-slate-400 shrink-0", isActive && "text-blue-500")} />
                                            )}
                                            <span className="truncate flex-1" title={lesson.title}>{lesson.title}</span>
                                            {lesson.completed && <span className="sr-only">(completed)</span>}
                                            {onRemoveLesson && !lesson.builtIn && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (!window.confirm(`Delete the lesson "${lesson.title}"? This can't be undone.`)) return;
                                                        onRemoveLesson(module.id, lesson.id);
                                                    }}
                                                    aria-label={`Delete ${lesson.title}`}
                                                    className={cn(
                                                        "p-0.5 rounded transition-all text-slate-400 shrink-0 focus:opacity-100",
                                                        "hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400",
                                                        isHovered ? "opacity-100" : "opacity-0"
                                                    )}
                                                    title="Delete Lesson"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Inline Add Lesson Input */}
                                {addingLessonToModuleId === module.id ? (
                                    <form onSubmit={(e) => handleSubmitLesson(e, module.id)} className="px-2 py-1">
                                        <input
                                            autoFocus
                                            type="text"
                                            placeholder="Lesson Title..."
                                            value={newLessonTitle}
                                            onChange={e => setNewLessonTitle(e.target.value)}
                                            onBlur={() => {
                                                if (!newLessonTitle.trim()) setAddingLessonToModuleId(null);
                                            }}
                                            className="w-full px-2 py-1 text-sm bg-white dark:bg-slate-900 border border-blue-400 rounded focus:outline-none"
                                        />
                                    </form>
                                ) : null}

                                {module.lessons.length === 0 && !addingLessonToModuleId && (
                                    <div className="px-3 py-2 text-xs text-slate-400 italic">
                                        No lessons yet
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {modules.length === 0 && (
                    <div className="text-center py-8 text-slate-500 text-sm">
                        <Folder className="mx-auto mb-2 opacity-50" size={32} />
                        No curriculum found for this engine.
                    </div>
                )}

                {/* Inline Add Module */}
                {isAddingModule && (
                    <div className="mb-4 animate-in fade-in slide-in-from-top-2">
                        <form onSubmit={handleSubmitModule}>
                            <input
                                autoFocus
                                type="text"
                                placeholder="Module Title..."
                                value={newModuleTitle}
                                onChange={e => setNewModuleTitle(e.target.value)}
                                onBlur={() => {
                                    if (!newModuleTitle.trim()) setIsAddingModule(false);
                                }}
                                className="w-full p-2 text-sm bg-white dark:bg-slate-900 border border-blue-500 rounded font-semibold focus:outline-none shadow-sm"
                            />
                        </form>
                    </div>
                )}

            </div>

            {!isAddingModule && (
                <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                        onClick={() => setIsAddingModule(true)}
                        className="w-full flex items-center justify-center gap-2 p-2 text-sm font-medium text-slate-600 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        <Plus size={16} /> Add Module
                    </button>
                </div>
            )}
        </div>
    )
}

/** Engine badge and "2/4" progress on a module header. */
function ModuleMeta({ module }: { module: Module }) {
    const badge = module.engine ? ENGINE_BADGE[module.engine] : undefined;
    const done = module.lessons.filter(l => l.completed).length;
    const total = module.lessons.length;
    return (
        <div className="flex items-center gap-2 ml-auto mr-1 shrink-0">
            {badge && (
                <span
                    className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                    style={{ color: badge.color, background: `${badge.color}14`, border: `1px solid ${badge.color}33` }}
                >
                    {badge.label}
                </span>
            )}
            {total > 0 && (
                <span
                    className="text-[11px] tabular-nums"
                    style={{ color: done === total ? '#22C55E' : '#8A97B3' }}
                    aria-label={`${done} of ${total} lessons complete`}
                >
                    {done}/{total}
                </span>
            )}
        </div>
    );
}

export default Sidebar;
