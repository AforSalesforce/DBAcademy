'use client';

import React from 'react';
import { Terminal, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { CodeResult } from '@/db-engines/types';

interface CodeOutputProps {
  result: CodeResult | null;
  running: boolean;
}

export function CodeOutput({ result, running }: CodeOutputProps) {
  if (running) {
    return (
      <div className="flex items-center gap-3 h-full px-4" style={{ background: '#07090F' }}>
        <div className="w-4 h-4 rounded-full border-2 animate-spin shrink-0"
          style={{ borderColor: 'rgba(245,158,11,0.25)', borderTopColor: '#F59E0B' }} />
        <span className="text-sm font-mono" style={{ color: '#5C6B8A' }}>Running…</span>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex items-center gap-2 h-full px-4" style={{ background: '#07090F' }}>
        <Terminal className="w-4 h-4 shrink-0" style={{ color: '#2E3A52' }} />
        <span className="text-sm font-mono" style={{ color: '#2E3A52' }}>Press Run (⌘↵) to execute</span>
      </div>
    );
  }

  const success = result.exitCode === 0;
  const hasStdout = Boolean(result.stdout);
  const hasStderr = Boolean(result.stderr);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#07090F' }}>
      {/* Status bar */}
      <div className="flex items-center gap-2.5 px-3 py-1.5 shrink-0"
        style={{ background: '#0C1018', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {success
          ? <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: '#22C55E' }} />
          : <XCircle    className="w-3.5 h-3.5 shrink-0" style={{ color: '#EF4444' }} />}
        <span className="text-xs font-mono font-semibold"
          style={{ color: success ? '#22C55E' : '#EF4444' }}>
          Exit {result.exitCode}
        </span>
        {result.durationMs !== undefined && (
          <>
            <span style={{ color: 'rgba(255,255,255,0.12)' }}>·</span>
            <Clock className="w-3 h-3 shrink-0" style={{ color: '#5C6B8A' }} />
            <span className="text-xs font-mono" style={{ color: '#5C6B8A' }}>
              {result.durationMs}ms
            </span>
          </>
        )}
      </div>

      {/* Output area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 text-sm leading-relaxed"
        style={{ fontFamily: "'Fira Code','Droid Sans Mono',monospace" }}>
        {!hasStdout && !hasStderr && (
          <span style={{ color: '#2E3A52' }}>No output.</span>
        )}
        {hasStdout && (
          <pre className="whitespace-pre-wrap break-all" style={{ color: '#EDF1FA' }}>
            {result.stdout}
          </pre>
        )}
        {hasStderr && (
          <pre className="whitespace-pre-wrap break-all" style={{ color: '#EF4444', marginTop: hasStdout ? '0.75rem' : 0 }}>
            {result.stderr}
          </pre>
        )}
      </div>
    </div>
  );
}
