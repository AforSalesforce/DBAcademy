import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Mocks: in-memory IndexedDB stand-in, no network sync ─────────────────────

const idb = new Map<string, unknown>();

vi.mock('@/lib/persistence/local-db', () => ({
  localGetAll: async () => [...idb.values()],
  localPut: async (_store: string, value: { id: string }) => {
    idb.set(value.id, structuredClone(value));
  },
  localDelete: async (_store: string, id: string) => {
    idb.delete(id);
  },
}));

vi.mock('@/stores/sync/supabase-sync', async importOriginal => ({
  ...(await importOriginal<typeof import('@/stores/sync/supabase-sync')>()),
  pullRemote: async () => null,
  pushUpsert: async () => {},
  pushDelete: async () => {},
}));

function stubLocalStorage(entries: Record<string, string>) {
  const data = new Map(Object.entries(entries));
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    keys: () => [...data.keys()],
  };
  // Object.keys(localStorage) must list the stored keys, as in a browser.
  const proxy = new Proxy(storage, { ownKeys: () => [...data.keys()], getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }) });
  vi.stubGlobal('window', {});
  vi.stubGlobal('localStorage', proxy);
  return data;
}

/** Fresh store module per test: its in-flight hydration/migration promises are module state. */
async function freshStore() {
  vi.resetModules();
  return import('@/stores/notes-store');
}

const note = (over: Record<string, unknown>) => ({
  id: 'n', projectId: null, lessonId: null, queryId: null, title: '', contentMd: '',
  pinned: false, tags: [], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  ...over,
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('notes store — lesson notes', () => {
  beforeEach(() => {
    idb.clear();
    vi.unstubAllGlobals();
    stubLocalStorage({});
  });

  it('latestLessonNote picks the most recently updated note for that lesson', async () => {
    const { latestLessonNote } = await freshStore();
    const notes = [
      note({ id: 'old', lessonId: 'fib', updatedAt: '2026-01-01T00:00:00Z' }),
      note({ id: 'new', lessonId: 'fib', updatedAt: '2026-03-01T00:00:00Z' }),
      note({ id: 'other', lessonId: 'fizz', updatedAt: '2026-09-01T00:00:00Z' }),
    ];
    expect(latestLessonNote(notes as never, 'fib')?.id).toBe('new');
    expect(latestLessonNote(notes as never, 'nope')).toBeUndefined();
  });

  it('rapid saves for one lesson update a single note instead of creating duplicates', async () => {
    const { useNotesStore } = await freshStore();
    const store = useNotesStore.getState();
    await store.hydrate();

    // Fired without awaiting, like debounced keystrokes overlapping.
    await Promise.all([
      store.saveLessonNote('fib', 'a', 'Fibonacci'),
      store.saveLessonNote('fib', 'ab', 'Fibonacci'),
      store.saveLessonNote('fib', 'abc', 'Fibonacci'),
    ]);

    const fibNotes = useNotesStore.getState().notes.filter(n => n.lessonId === 'fib');
    expect(fibNotes).toHaveLength(1);
    expect(fibNotes[0]).toMatchObject({ contentMd: 'abc', title: 'Fibonacci' });
    expect(idb.size).toBe(1);
  });

  it('migrates a legacy localStorage note and removes the old copy', async () => {
    const ls = stubLocalStorage({ lesson_note_fib: 'my old note', unrelated: 'keep' });
    const { useNotesStore } = await freshStore();

    await useNotesStore.getState().migrateFromLocalStorage();

    const fib = useNotesStore.getState().notes.filter(n => n.lessonId === 'fib');
    expect(fib.map(n => n.contentMd)).toEqual(['my old note']);
    expect(ls.has('lesson_note_fib')).toBe(false);
    expect(ls.get('unrelated')).toBe('keep');
  });

  it('merges into the existing lesson note instead of duplicating or overwriting it', async () => {
    idb.set('existing', note({ id: 'existing', lessonId: 'fib', contentMd: 'written in the drawer' }));
    stubLocalStorage({ lesson_note_fib: 'typed in the lesson panel' });
    const { useNotesStore } = await freshStore();

    await useNotesStore.getState().migrateFromLocalStorage();

    const fib = useNotesStore.getState().notes.filter(n => n.lessonId === 'fib');
    expect(fib).toHaveLength(1);
    expect(fib[0].contentMd).toBe('written in the drawer\n\ntyped in the lesson panel');
  });

  it('does not re-append text that is already in the note', async () => {
    idb.set('existing', note({ id: 'existing', lessonId: 'fib', contentMd: 'same text' }));
    stubLocalStorage({ lesson_note_fib: 'same text' });
    const { useNotesStore } = await freshStore();

    await useNotesStore.getState().migrateFromLocalStorage();

    expect(useNotesStore.getState().notes.find(n => n.lessonId === 'fib')?.contentMd).toBe('same text');
  });

  it('concurrent callers (the /learn page and every lesson panel) migrate only once', async () => {
    stubLocalStorage({ lesson_note_fib: 'once' });
    const { useNotesStore } = await freshStore();
    const s = useNotesStore.getState();

    await Promise.all([s.migrateFromLocalStorage(), s.migrateFromLocalStorage(), s.hydrate()]);

    expect(useNotesStore.getState().notes.filter(n => n.lessonId === 'fib')).toHaveLength(1);
  });
});
