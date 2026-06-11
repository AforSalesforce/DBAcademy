'use client';

import React from 'react';
import { Play, Bookmark, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { useRunHistoryStore, QueryRun } from '@/lib/run-history-store';

interface Props {
  activeProjectId: string;
  onLoad: (body: string) => void;
  onRun: (body: string) => void;
  /** Promote a history entry to a saved query. */
  onSave: (body: string, engine: QueryRun['engine']) => void;
}

export function RunHistory({ activeProjectId, onLoad, onRun, onSave }: Props) {
  const { runs, clearHistory } = useRunHistoryStore();
  const visible = runs.filter(r => r.projectId === activeProjectId);

  if (visible.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-slate-400 dark:text-slate-500">
        No history yet. Run a query to get started.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-end px-3 py-1.5 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={clearHistory}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-3 h-3" /> Clear
        </button>
      </div>

      <ul className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
        {visible.map(run => (
          <RunRow
            key={run.id}
            run={run}
            onLoad={onLoad}
            onRun={onRun}
            onSave={onSave}
          />
        ))}
      </ul>
    </div>
  );
}

function RunRow({
  run,
  onLoad,
  onRun,
  onSave,
}: {
  run: QueryRun;
  onLoad: (body: string) => void;
  onRun: (body: string) => void;
  onSave: (body: string, engine: QueryRun['engine']) => void;
}) {
  const relativeTime = formatRelative(run.ranAt);
  const preview = run.body.replace(/\s+/g, ' ').trim().slice(0, 80);

  return (
    <li
      className="group flex flex-col px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer gap-0.5"
      onClick={() => onLoad(run.body)}
    >
      <div className="flex items-center gap-2">
        {run.status === 'ok' ? (
          <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
        ) : (
          <XCircle className="w-3 h-3 text-red-500 shrink-0" />
        )}
        <span className="text-xs text-slate-500 dark:text-slate-400 truncate flex-1">
          {preview}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
          <IconBtn title="Re-run" onClick={() => onRun(run.body)}><Play className="w-3 h-3 text-blue-500" /></IconBtn>
          <IconBtn title="Save as query" onClick={() => onSave(run.body, run.engine)}><Bookmark className="w-3 h-3 text-slate-400" /></IconBtn>
        </div>
      </div>
      <div className="flex items-center gap-3 pl-5">
        <span className="text-[10px] text-slate-400">{relativeTime}</span>
        {run.status === 'ok' && (
          <>
            <span className="text-[10px] text-slate-400">{run.rowCount} rows</span>
            <span className="text-[10px] text-slate-400">{run.durationMs} ms</span>
          </>
        )}
        {run.status === 'error' && run.errorMessage && (
          <span className="text-[10px] text-red-400 truncate max-w-[160px]">{run.errorMessage}</span>
        )}
      </div>
    </li>
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

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
}
