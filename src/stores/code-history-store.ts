'use client';

import { create } from 'zustand';
import { localGetAll, localPut, localDelete, localClear } from '@/lib/persistence/local-db';

export interface CodeRun {
  id: string;
  language: string;
  code: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  ranAt: string;
}

const MAX_HISTORY = 200;

interface CodeHistoryStore {
  runs: CodeRun[];
  hydrated: boolean;

  hydrate(): Promise<void>;
  addRun(run: Omit<CodeRun, 'id' | 'ranAt'>): Promise<void>;
  clearHistory(): Promise<void>;
}

export const useCodeHistoryStore = create<CodeHistoryStore>((set, get) => ({
  runs: [],
  hydrated: false,

  async hydrate() {
    if (get().hydrated) return;
    try {
      const all = await localGetAll<CodeRun>('code-history');
      const sorted = all
        .sort((a, b) => b.ranAt.localeCompare(a.ranAt))
        .slice(0, MAX_HISTORY);
      set({ runs: sorted, hydrated: true });
    } catch (e) {
      console.error('code-history hydrate error', e);
      set({ hydrated: true });
    }
  },

  async addRun(run) {
    const entry: CodeRun = {
      ...run,
      id: crypto.randomUUID(),
      ranAt: new Date().toISOString(),
    };

    await localPut('code-history', entry);

    set(s => {
      const updated = [entry, ...s.runs].slice(0, MAX_HISTORY);
      return { runs: updated };
    });

    // Prune the oldest entry once the ring-buffer is full.
    const current = get().runs;
    if (current.length === MAX_HISTORY) {
      const oldest = current[current.length - 1];
      if (oldest) await localDelete('code-history', oldest.id);
    }
  },

  async clearHistory() {
    await localClear('code-history');
    set({ runs: [] });
  },
}));
