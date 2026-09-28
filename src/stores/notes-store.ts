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

/** The lesson's note: the most recently updated note anchored to it. */
export function latestLessonNote(notes: Note[], lessonId: string): Note | undefined {
  let latest: Note | undefined;
  for (const n of notes) {
    if (n.lessonId === lessonId && (!latest || n.updatedAt > latest.updatedAt)) latest = n;
  }
  return latest;
}

/**
 * Shared in-flight promises, so concurrent callers (the /learn page, every
 * LessonView) run hydration and migration once instead of racing each other.
 */
let hydration: Promise<void> | null = null;
let migration: Promise<void> | null = null;

interface NotesStore {
  notes: Note[];
  hydrated: boolean;
  isDrawerOpen: boolean;
  /** Context filter: if set, the drawer focuses notes anchored here. */
  drawerContext: { type: 'lesson'; id: string } | { type: 'project'; id: string } | null;

  hydrate(): Promise<void>;
  upsertNote(partial: Partial<Note> & Pick<Note, 'contentMd'>): Promise<Note>;
  /** Saves the one note for a lesson, creating it on first save. */
  saveLessonNote(lessonId: string, contentMd: string, title?: string): Promise<Note>;
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
    hydration ??= (async () => {
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
          // Merge with current state, not the snapshot above: notes saved
          // while the pull was in flight must not be dropped.
          const merged = mergeById(get().notes, remote);
          set({ notes: merged });
          for (const n of merged) await localPut('notes', n);
        }
      } catch (e) {
        console.error('notes hydrate error', e);
        set({ hydrated: true });
      }
    })();
    return hydration;
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

    // State first (synchronously), then persist: a second call made before
    // this one finishes must see the note, or it would create a duplicate.
    set(s => ({
      notes: existing
        ? s.notes.map(n => (n.id === note.id ? note : n))
        : [...s.notes, note],
    }));
    await localPut('notes', note);

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

  async saveLessonNote(lessonId, contentMd, title) {
    const existing = latestLessonNote(get().notes, lessonId);
    return get().upsertNote({
      id: existing?.id,
      lessonId,
      contentMd,
      // Name new notes after the lesson so they read well in the notes drawer.
      title: existing ? undefined : title,
    });
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

  /**
   * One-time move of legacy `lesson_note_<id>` localStorage entries into this
   * store. Waits for hydration so it can find the lesson's existing note,
   * merges into it instead of creating a duplicate, and only deletes the
   * localStorage copy once its text is safely in the store.
   */
  async migrateFromLocalStorage() {
    if (typeof window === 'undefined') return;
    migration ??= (async () => {
      await get().hydrate();
      const keys = Object.keys(localStorage).filter(k => k.startsWith('lesson_note_'));
      for (const key of keys) {
        const content = localStorage.getItem(key) ?? '';
        const lessonId = key.slice('lesson_note_'.length);
        if (content.trim()) {
          const existing = latestLessonNote(get().notes, lessonId);
          const current = existing?.contentMd ?? '';
          if (!current.includes(content.trim())) {
            const merged = current.trim() ? `${current}\n\n${content}` : content;
            await get().saveLessonNote(lessonId, merged);
          }
        }
        localStorage.removeItem(key);
      }
    })().catch(e => {
      console.error('lesson note migration failed', e);
      migration = null; // entries not yet saved stay in localStorage; retried next time
    });
    return migration;
  },
}));
