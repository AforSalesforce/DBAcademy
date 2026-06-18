'use client';

import { create } from 'zustand';
import { localGetAll, localPut, localDelete } from '@/lib/persistence/local-db';
import { mergeById, pullRemote, pushUpsert, pushDelete } from './sync/supabase-sync';

export interface Note {
  id: string;
  /** At most one anchor; all null = global note. */
  projectId: string | null;
  lessonId: string | null;
  queryId: string | null;
  title: string;
  contentMd: string;
  pinned: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface NotesStore {
  notes: Note[];
  hydrated: boolean;
  isDrawerOpen: boolean;
  /** Context filter: if set, the drawer focuses notes anchored here. */
  drawerContext: { type: 'lesson'; id: string } | { type: 'project'; id: string } | null;

  hydrate(): Promise<void>;
  upsertNote(partial: Partial<Note> & Pick<Note, 'contentMd'>): Promise<Note>;
  deleteNote(id: string): Promise<void>;
  togglePin(id: string): Promise<void>;
  openDrawer(context?: NotesStore['drawerContext']): void;
  closeDrawer(): void;
  toggleDrawer(): void;
  migrateFromLocalStorage(): Promise<void>;
}

export const useNotesStore = create<NotesStore>((set, get) => ({
  notes: [],
  hydrated: false,
  isDrawerOpen: false,
  drawerContext: null,

  async hydrate() {
    if (get().hydrated) return;
    try {
      const local = await localGetAll<Note>('notes');
      set({ notes: local, hydrated: true });

      const remote = await pullRemote('notes', (r: any): Note => ({
        id: r.id,
        projectId: r.project_id ?? null,
        lessonId: r.lesson_id ?? null,
        queryId: r.query_id ?? null,
        title: r.title ?? '',
        contentMd: r.content_md ?? '',
        pinned: r.pinned ?? false,
        tags: r.tags ?? [],
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
      if (remote) {
        const merged = mergeById(local, remote);
        set({ notes: merged });
        for (const n of merged) await localPut('notes', n);
      }
    } catch (e) {
      console.error('notes hydrate error', e);
      set({ hydrated: true });
    }
  },

  async upsertNote(partial) {
    const existing = partial.id ? get().notes.find(n => n.id === partial.id) : undefined;
    const now = new Date().toISOString();
    const note: Note = {
      id: partial.id ?? crypto.randomUUID(),
      projectId: partial.projectId ?? existing?.projectId ?? null,
      lessonId: partial.lessonId ?? existing?.lessonId ?? null,
      queryId: partial.queryId ?? existing?.queryId ?? null,
      title: partial.title ?? existing?.title ?? '',
      contentMd: partial.contentMd,
      pinned: partial.pinned ?? existing?.pinned ?? false,
      tags: partial.tags ?? existing?.tags ?? [],
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    await localPut('notes', note);
    set(s => ({
      notes: existing
        ? s.notes.map(n => (n.id === note.id ? note : n))
        : [...s.notes, note],
    }));

    await pushUpsert('notes', {
      id: note.id,
      project_id: note.projectId,
      lesson_id: note.lessonId,
      query_id: note.queryId,
      title: note.title,
      content_md: note.contentMd,
      pinned: note.pinned,
      tags: note.tags,
      created_at: note.createdAt,
      updated_at: note.updatedAt,
    });

    return note;
  },

  async deleteNote(id) {
    set(s => ({ notes: s.notes.filter(n => n.id !== id) }));
    await localDelete('notes', id);
    await pushDelete('notes', id);
  },

  async togglePin(id) {
    const note = get().notes.find(n => n.id === id);
    if (!note) return;
    await get().upsertNote({ ...note, pinned: !note.pinned });
  },

  openDrawer(context = null) {
    set({ isDrawerOpen: true, drawerContext: context });
  },
  closeDrawer() {
    set({ isDrawerOpen: false });
  },
  toggleDrawer() {
    set(s => ({ isDrawerOpen: !s.isDrawerOpen }));
  },

  async migrateFromLocalStorage() {
    if (typeof window === 'undefined') return;
    const keysToMigrate = Object.keys(localStorage).filter(k =>
      k.startsWith('lesson_note_')
    );
    for (const key of keysToMigrate) {
      const content = localStorage.getItem(key);
      if (!content?.trim()) continue;
      const lessonId = key.replace('lesson_note_', '');
      await get().upsertNote({
        lessonId,
        contentMd: content,
        title: '',
      });
      localStorage.removeItem(key);
    }
  },
}));
