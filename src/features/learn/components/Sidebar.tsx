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
}

export interface Module {
    id: string;
    title: string;
    lessons: Lesson[];
    engine?: EngineType;
}

interface SidebarProps {
    modules: Module[];
    activeLessonId?: string;
    onAddModule: (title: string) => void;
    onAddLesson: (moduleId: string, title: string) => void;
    onSelectLesson: (lesson: Lesson, moduleId: string) => void;
    onRemoveModule?: (moduleId: string) => void;
    onRemoveLesson?: (moduleId: string, lessonId: string) => void;
}

export function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

const Sidebar: React.FC<SidebarProps> = ({ modules, activeLessonId, onAddModule, onAddLesson, onSelectLesson, onRemoveModule, onRemoveLesson }) => {
    const [isAddingModule, setIsAddingModule] = useState(false);
    const [newModuleTitle, setNewModuleTitle] = useState('');
    const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set(modules.map(m => m.id)));
    const [hoveredModuleId, setHoveredModuleId] = useState<string | null>(null);
    const [hoveredLessonId, setHoveredLessonId] = useState<string | null>(null);

    // We track which module acts as the active input for a new lesson
    const [addingLessonToModuleId, setAddingLessonToModuleId] = useState<string | null>(null);
    const [newLessonTitle, setNewLessonTitle] = useState('');

    const toggleModule = (id: string) => {
        const newSet = new Set(expandedModules);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setExpandedModules(newSet);
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
                            className="flex items-center justify-between mb-2 px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                            onClick={() => toggleModule(module.id)}
                            onMouseEnter={() => setHoveredModuleId(module.id)}
                            onMouseLeave={() => setHoveredModuleId(null)}
                        >
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                {expandedModules.has(module.id) ? (
                                    <ChevronDown size={16} />
                                ) : (
                                    <ChevronRight size={16} />
                                )}
                                <span className="uppercase tracking-wider text-xs">{module.title}</span>
                            </div>
                            <div className={cn(
                                "flex items-center gap-0.5 transition-opacity",
                                hoveredModuleId === module.id ? "opacity-100" : "opacity-0"
                            )}>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setAddingLessonToModuleId(module.id);
                                        if (!expandedModules.has(module.id)) toggleModule(module.id);
                                    }}
                                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                                    title="Add Lesson"
                                >
                                    <Plus size={14} />
                                </button>
                                {onRemoveModule && (
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
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {expandedModules.has(module.id) && (
                            <div className="space-y-1 ml-2 pl-2 border-l border-slate-200 dark:border-slate-800">
                                {module.lessons.map(lesson => {
                                    const isActive = activeLessonId === lesson.id;
                                    const isHovered = hoveredLessonId === lesson.id;
                                    return (
                                        <div
                                            key={lesson.id}
                                            onClick={() => onSelectLesson(lesson, module.id)}
                                            onMouseEnter={() => setHoveredLessonId(lesson.id)}
                                            onMouseLeave={() => setHoveredLessonId(null)}
                                            className={cn(
                                                "flex items-center gap-3 px-3 py-2 text-sm rounded-md cursor-pointer transition-all",
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
                                            <span className="truncate flex-1">{lesson.title}</span>
                                            {onRemoveLesson && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onRemoveLesson(module.id, lesson.id);
                                                    }}
                                                    className={cn(
                                                        "p-0.5 rounded transition-all text-slate-400 shrink-0",
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

export default Sidebar;
