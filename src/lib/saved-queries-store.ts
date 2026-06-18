'use client';

import { create } from 'zustand';
import { localGetAll, localPut, localDelete } from './local-db';
import { mergeById, pullRemote, pushUpsert, pushDelete } from './sync/supabase-sync';
import { EngineType } from './db/types';

export interface SavedQuery {
  id: string;
  /** null = global snippet, not tied to a project */
  projectId: string | null;
  title: string;
  body: string;
  engine: EngineType;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SavedQueriesStore {
  queries: SavedQuery[];
  hydrated: boolean;

  hydrate(): Promise<void>;
  saveQuery(
    params: Pick<SavedQuery, 'title' | 'body' | 'engine'> & Partial<Pick<SavedQuery, 'projectId' | 'id'>>
  ): Promise<SavedQuery>;
  updateQuery(
    id: string,
    updates: Partial<Pick<SavedQuery, 'title' | 'body' | 'favorite'>>
  ): Promise<void>;
  deleteQuery(id: string): Promise<void>;
  toggleFavorite(id: string): Promise<void>;
}

export const useSavedQueriesStore = create<SavedQueriesStore>((set, get) => ({
  queries: [],
  hydrated: false,

  async hydrate() {
    if (get().hydrated) return;
    try {
      const local = await localGetAll<SavedQuery>('saved-queries');
      set({ queries: local, hydrated: true });

      const remote = await pullRemote('saved_queries', (r: any): SavedQuery => ({
        id: r.id,
        projectId: r.project_id ?? null,
        title: r.title,
        body: r.body,
        engine: r.engine,
        favorite: r.favorite,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
      if (remote) {
        const merged = mergeById(local, remote);
        set({ queries: merged });
        for (const q of merged) await localPut('saved-queries', q);
      }
    } catch (e) {
      console.error('saved-queries hydrate error', e);
      set({ hydrated: true });
    }
  },

  async saveQuery({ title, body, engine, projectId = null, id }) {
    const existing = id ? get().queries.find(q => q.id === id) : undefined;
    const now = new Date().toISOString();
    const query: SavedQuery = {
      id: id ?? crypto.randomUUID(),
      projectId,
      title,
      body,
      engine,
      favorite: existing?.favorite ?? false,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    await localPut('saved-queries', query);
    set(s => ({
      queries: existing
        ? s.queries.map(q => (q.id === query.id ? query : q))
        : [...s.queries, query],
    }));

    await pushUpsert('saved_queries', {
      id: query.id,
      project_id: projectId,
      title,
      body,
      engine,
      favorite: query.favorite,
      updated_at: now,
      created_at: query.createdAt,
    });

    return query;
  },

  async updateQuery(id, updates) {
    const now = new Date().toISOString();
    set(s => ({
      queries: s.queries.map(q =>
        q.id === id ? { ...q, ...updates, updatedAt: now } : q
      ),
    }));
    const updated = get().queries.find(q => q.id === id);
    if (updated) await localPut('saved-queries', updated);
  },

  async deleteQuery(id) {
    set(s => ({ queries: s.queries.filter(q => q.id !== id) }));
    await localDelete('saved-queries', id);
    await pushDelete('saved_queries', id);
  },

  async toggleFavorite(id) {
    const q = get().queries.find(q => q.id === id);
    if (!q) return;
    await get().updateQuery(id, { favorite: !q.favorite });
  },
}));
