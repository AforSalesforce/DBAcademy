'use client';

import { create } from 'zustand';
import { localGetAll, localPut, localDelete, localClear } from './local-db';

export interface QueryRun {
  id: string;
  projectId: string;
  engine: 'postgres' | 'sqlite' | 'nosql';
  body: string;
  status: 'ok' | 'error';
  errorMessage?: string;
  rowCount: number;
  durationMs: number;
  ranAt: string;
}

const MAX_HISTORY = 200;

interface RunHistoryStore {
  runs: QueryRun[];
  hydrated: boolean;

  hydrate(): Promise<void>;
  addRun(run: Omit<QueryRun, 'id' | 'ranAt'>): Promise<void>;
  clearHistory(): Promise<void>;
}

export const useRunHistoryStore = create<RunHistoryStore>((set, get) => ({
  runs: [],
  hydrated: false,

  async hydrate() {
    if (get().hydrated) return;
    try {
      const all = await localGetAll<QueryRun>('run-history');
      // Sort newest-first; keep only the last MAX_HISTORY entries.
      const sorted = all
        .sort((a, b) => b.ranAt.localeCompare(a.ranAt))
        .slice(0, MAX_HISTORY);
      set({ runs: sorted, hydrated: true });
    } catch (e) {
      console.error('run-history hydrate error', e);
      set({ hydrated: true });
    }
  },

  async addRun(run) {
    const entry: QueryRun = {
      ...run,
      id: crypto.randomUUID(),
      ranAt: new Date().toISOString(),
    };

    await localPut('run-history', entry);

    set(s => {
      const updated = [entry, ...s.runs].slice(0, MAX_HISTORY);
      return { runs: updated };
    });

    // Prune the oldest entry from IDB if over the limit.
    const current = get().runs;
    if (current.length === MAX_HISTORY) {
      const oldest = current[current.length - 1];
      if (oldest) await localDelete('run-history', oldest.id);
    }
  },

  async clearHistory() {
    await localClear('run-history');
    set({ runs: [] });
  },
}));
