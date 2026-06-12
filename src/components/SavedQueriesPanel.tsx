'use client';

import React, { useState } from 'react';
import { Star, Trash2, Play, Pencil, Check, X } from 'lucide-react';
import { useSavedQueriesStore, SavedQuery } from '@/lib/saved-queries-store';
import { EngineType } from '@/lib/db/types';

interface Props {
  activeEngine: EngineType;
  activeProjectId: string | null;
  onLoad: (body: string) => void;
  onRun: (body: string) => void;
}

export function SavedQueriesPanel({ activeEngine, activeProjectId, onLoad, onRun }: Props) {
  const { queries, toggleFavorite, deleteQuery, updateQuery } = useSavedQueriesStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const engineQueries = queries.filter(q => q.engine === activeEngine);
  const favorites = engineQueries.filter(q => q.favorite);
  const projectQueries = activeProjectId
    ? engineQueries.filter(q => q.projectId === activeProjectId && !q.favorite)
    : [];
  const allOthers = engineQueries.filter(
    q => !q.favorite && q.projectId !== activeProjectId
  );

  const startEdit = (q: SavedQuery) => {
    setEditingId(q.id);
    setEditTitle(q.title);
  };

  const commitEdit = async () => {
    if (editingId && editTitle.trim()) {
      await updateQuery(editingId, { title: editTitle.trim() });
    }
    setEditingId(null);
  };

  if (engineQueries.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-slate-400 dark:text-slate-500">
        <p>No saved queries yet.</p>
        <p className="mt-1 text-xs">Press <kbd className="px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">Cmd+S</kbd> in the editor to save.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-2">
      <Section
        title="Favorites"
        queries={favorites}
        editingId={editingId}
        editTitle={editTitle}
        setEditTitle={setEditTitle}
        onLoad={onLoad}
        onRun={onRun}
        onFavorite={toggleFavorite}
        onDelete={deleteQuery}
        onStartEdit={startEdit}
        onCommitEdit={commitEdit}
        onCancelEdit={() => setEditingId(null)}
      />
      {activeProjectId && (
        <Section
          title="This project"
          queries={projectQueries}
          editingId={editingId}
          editTitle={editTitle}
          setEditTitle={setEditTitle}
          onLoad={onLoad}
          onRun={onRun}
          onFavorite={toggleFavorite}
          onDelete={deleteQuery}
          onStartEdit={startEdit}
          onCommitEdit={commitEdit}
          onCancelEdit={() => setEditingId(null)}
        />
      )}
      <Section
        title="All"
        queries={allOthers}
        editingId={editingId}
        editTitle={editTitle}
        setEditTitle={setEditTitle}
        onLoad={onLoad}
        onRun={onRun}
        onFavorite={toggleFavorite}
        onDelete={deleteQuery}
        onStartEdit={startEdit}
        onCommitEdit={commitEdit}
        onCancelEdit={() => setEditingId(null)}
      />
    </div>
  );
}

interface SectionProps {
  title: string;
  queries: SavedQuery[];
  editingId: string | null;
  editTitle: string;
  setEditTitle: (v: string) => void;
  onLoad: (body: string) => void;
  onRun: (body: string) => void;
  onFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onStartEdit: (q: SavedQuery) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
}

function Section({
  title, queries, editingId, editTitle, setEditTitle,
  onLoad, onRun, onFavorite, onDelete, onStartEdit, onCommitEdit, onCancelEdit,
}: SectionProps) {
  if (queries.length === 0) return null;
  return (
    <div>
      <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
        {title}
      </p>
      <ul className="flex flex-col gap-0.5">
        {queries.map(q => (
          <li
            key={q.id}
            className="group flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            onClick={() => onLoad(q.body)}
          >
            {editingId === q.id ? (
              <input
                autoFocus
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') onCommitEdit();
                  if (e.key === 'Escape') onCancelEdit();
                }}
                onClick={e => e.stopPropagation()}
                className="flex-1 text-sm bg-white dark:bg-slate-700 border border-blue-400 rounded px-1 py-0.5 focus:outline-none"
              />
            ) : (
              <span className="flex-1 text-sm truncate text-slate-700 dark:text-slate-200">
                {q.title}
              </span>
            )}

            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
              {editingId === q.id ? (
                <>
                  <IconBtn title="Save" onClick={onCommitEdit}><Check className="w-3 h-3 text-green-500" /></IconBtn>
                  <IconBtn title="Cancel" onClick={onCancelEdit}><X className="w-3 h-3 text-slate-400" /></IconBtn>
                </>
              ) : (
                <>
                  <IconBtn title="Run" onClick={() => onRun(q.body)}><Play className="w-3 h-3 text-blue-500" /></IconBtn>
                  <IconBtn title={q.favorite ? 'Unfavorite' : 'Favorite'} onClick={() => onFavorite(q.id)}>
                    <Star className={`w-3 h-3 ${q.favorite ? 'fill-yellow-400 text-yellow-400' : 'text-slate-400'}`} />
                  </IconBtn>
                  <IconBtn title="Rename" onClick={() => onStartEdit(q)}><Pencil className="w-3 h-3 text-slate-400" /></IconBtn>
                  <IconBtn title="Delete" onClick={() => onDelete(q.id)}><Trash2 className="w-3 h-3 text-red-400" /></IconBtn>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function IconBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
    >
      {children}
    </button>
  );
}
