'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { X, Pin, Trash2, Plus, Eye, Pencil } from 'lucide-react';
import { useNotesStore, Note } from '@/stores/notes-store';

interface Props {
  lessonId?: string | null;
  projectId?: string | null;
}

export function NotesDrawer({ lessonId, projectId }: Props) {
  const { notes, isDrawerOpen, closeDrawer, upsertNote, deleteNote, togglePin } = useNotesStore();
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [draft, setDraft] = useState('');
  const [draftTitle, setDraftTitle] = useState('');

  // Filter notes by current context; pinned ones always float to top.
  const contextNotes = notes.filter(n => {
    if (lessonId) return n.lessonId === lessonId;
    if (projectId) return n.projectId === projectId || n.lessonId === null;
    return true;
  });
  const sorted = [
    ...contextNotes.filter(n => n.pinned),
    ...contextNotes.filter(n => !n.pinned),
  ];

  const activeNote = sorted.find(n => n.id === activeNoteId) ?? null;

  // When drawer opens, select the first note or clear.
  useEffect(() => {
    if (isDrawerOpen && sorted.length > 0 && !activeNoteId) {
      selectNote(sorted[0]);
    }
    if (!isDrawerOpen) setActiveNoteId(null);
  }, [isDrawerOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectNote = (n: Note) => {
    setActiveNoteId(n.id);
    setDraft(n.contentMd);
    setDraftTitle(n.title);
    setPreview(false);
  };

  const handleDraftChange = useCallback(
    (value: string) => {
      setDraft(value);
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(() => {
        if (!activeNoteId) return;
        upsertNote({
          id: activeNoteId,
          contentMd: value,
          title: draftTitle,
          lessonId: lessonId ?? null,
          projectId: projectId ?? null,
        });
      }, 1000);
    },
    [activeNoteId, draftTitle, lessonId, projectId, upsertNote]
  );

  const handleTitleChange = (value: string) => {
    setDraftTitle(value);
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      if (!activeNoteId) return;
      upsertNote({ id: activeNoteId, contentMd: draft, title: value });
    }, 1000);
  };

  const handleNewNote = async () => {
    const note = await upsertNote({
      contentMd: '',
      title: 'Untitled note',
      lessonId: lessonId ?? null,
      projectId: projectId ?? null,
    });
    selectNote(note);
  };

  const handleDelete = async (id: string) => {
    await deleteNote(id);
    if (activeNoteId === id) {
      const next = sorted.find(n => n.id !== id);
      if (next) selectNote(next);
      else setActiveNoteId(null);
    }
  };

  if (!isDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 pointer-events-auto"
        onClick={closeDrawer}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 flex flex-col shadow-xl pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">Notes</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleNewNote}
              title="New note"
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> New
            </button>
            <button onClick={closeDrawer} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Note list */}
          <div className="w-40 flex-shrink-0 border-r border-slate-200 dark:border-slate-700 overflow-y-auto">
            {sorted.length === 0 ? (
              <p className="p-3 text-xs text-slate-400 text-center">No notes</p>
            ) : (
              <ul>
                {sorted.map(n => (
                  <li key={n.id}>
                    <button
                      className={`group w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                        n.id === activeNoteId
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                      onClick={() => selectNote(n)}
                    >
                      <div className="flex items-center gap-1">
                        {n.pinned && <Pin className="w-2.5 h-2.5 text-blue-400 shrink-0" />}
                        <span className="truncate">{n.title || 'Untitled'}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Editor pane */}
          {activeNote ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Note toolbar */}
              <div className="flex items-center gap-1 px-3 py-1.5 border-b border-slate-200 dark:border-slate-700">
                <input
                  value={draftTitle}
                  onChange={e => handleTitleChange(e.target.value)}
                  placeholder="Note title…"
                  className="flex-1 text-sm font-medium bg-transparent border-none focus:outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400"
                />
                <button
                  onClick={() => setPreview(p => !p)}
                  title={preview ? 'Edit' : 'Preview'}
                  className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {preview ? <Pencil className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => togglePin(activeNote.id)}
                  title={activeNote.pinned ? 'Unpin' : 'Pin'}
                  className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 ${
                    activeNote.pinned ? 'text-blue-500' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Pin className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(activeNote.id)}
                  title="Delete"
                  className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Content */}
              {preview ? (
                <div className="flex-1 overflow-y-auto p-4 prose prose-sm dark:prose-invert max-w-none">
                  {draft.trim() ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{draft}</ReactMarkdown>
                  ) : (
                    <p className="text-slate-400 italic">Nothing to preview.</p>
                  )}
                </div>
              ) : (
                <textarea
                  value={draft}
                  onChange={e => handleDraftChange(e.target.value)}
                  placeholder="Write in Markdown…"
                  className="flex-1 resize-none p-4 text-sm bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none font-mono"
                />
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
              {sorted.length > 0 ? 'Select a note' : 'Click "New" to create a note'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
