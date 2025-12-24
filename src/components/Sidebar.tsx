'use client';

import React, { useState } from 'react';

export interface Lesson {
    id: string;
    title: string;
    completed: boolean;
}

export interface Module {
    id: string;
    title: string;
    lessons: Lesson[];
    engine?: 'postgres' | 'sqlite' | 'nosql';
}

interface SidebarProps {
    modules: Module[];
    onAddModule: (title: string) => void;
    onAddLesson: (moduleId: string, title: string) => void;
    onSelectLesson: (lesson: Lesson) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ modules, onAddModule, onAddLesson, onSelectLesson }) => {
    const [isAddingModule, setIsAddingModule] = useState(false);
    const [newModuleTitle, setNewModuleTitle] = useState('');

    // We track which module acts as the active input for a new lesson
    const [addingLessonToModuleId, setAddingLessonToModuleId] = useState<string | null>(null);
    const [newLessonTitle, setNewLessonTitle] = useState('');

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
        <div className="sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '1rem', flex: 1, overflowY: 'auto' }}>
                {modules.map(module => (
                    <div key={module.id} style={{ marginBottom: '1.5rem' }}>
                        <div style={{
                            marginBottom: '0.5rem',
                            color: 'var(--text-secondary)',
                            textTransform: 'uppercase',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <span>{module.title}</span>
                            <button
                                onClick={() => setAddingLessonToModuleId(module.id)}
                                title="Add Lesson"
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    fontSize: '1rem',
                                    padding: '0 4px'
                                }}
                            >
                                +
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {module.lessons.map(lesson => (
                                <div
                                    key={lesson.id}
                                    onClick={() => onSelectLesson(lesson)}
                                    style={{
                                        padding: '0.5rem',
                                        borderRadius: '0.375rem',
                                        backgroundColor: 'var(--bg-tertiary)',
                                        color: 'var(--text-primary)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        fontWeight: 500,
                                        border: '1px solid transparent',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--accent)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = 'transparent';
                                    }}
                                >
                                    <span style={{ color: lesson.completed ? 'var(--success)' : 'var(--accent)' }}>
                                        {lesson.completed ? '✓' : '●'}
                                    </span>
                                    {lesson.title}
                                </div>
                            ))}

                            {/* Inline Add Lesson Input */}
                            {addingLessonToModuleId === module.id ? (
                                <form onSubmit={(e) => handleSubmitLesson(e, module.id)} style={{ padding: '0.5rem 0' }}>
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Lesson Title..."
                                        value={newLessonTitle}
                                        onChange={e => setNewLessonTitle(e.target.value)}
                                        onBlur={() => {
                                            // Optional: cancel on blur if empty, or keep open. 
                                            // Let's keep it simple: cancel if empty and blurring
                                            if (!newLessonTitle.trim()) setAddingLessonToModuleId(null);
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            borderRadius: '0.25rem',
                                            border: '1px solid var(--accent)',
                                            background: 'var(--bg-tertiary)',
                                            color: 'var(--text-primary)',
                                            fontSize: '0.875rem'
                                        }}
                                    />
                                </form>
                            ) : null}

                            {module.lessons.length === 0 && !addingLessonToModuleId && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', paddingLeft: '0.5rem' }}>
                                    No lessons yet
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {modules.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        No curriculum found for this engine. <br /> Click below to start!
                    </div>
                )}

                {/* Inline Add Module Input (appended to list) */}
                {isAddingModule && (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <form onSubmit={handleSubmitModule}>
                            <input
                                autoFocus
                                type="text"
                                placeholder="Module Title... (e.g. Advanced SQL)"
                                value={newModuleTitle}
                                onChange={e => setNewModuleTitle(e.target.value)}
                                onBlur={() => {
                                    if (!newModuleTitle.trim()) setIsAddingModule(false);
                                }}
                                style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    borderRadius: '0.25rem',
                                    border: '1px solid var(--accent)',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.875rem',
                                    fontWeight: 'bold'
                                }}
                            />
                        </form>
                    </div>
                )}

            </div>

            {!isAddingModule && (
                <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
                    <button
                        onClick={() => setIsAddingModule(true)}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            background: 'var(--bg-secondary)',
                            border: '1px dashed var(--border)',
                            color: 'var(--text-secondary)',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 500
                        }}
                    >
                        + Add Curriculum Module
                    </button>
                </div>
            )}
        </div>
    )
}
export default Sidebar;
