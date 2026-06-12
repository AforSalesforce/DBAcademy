'use client';

const DB_NAME = 'dbacademy-workspace';
const DB_VERSION = 2;

export type EntityStore =
  | 'projects'
  | 'saved-queries'
  | 'notes'
  | 'schema-designs'
  | 'run-history'
  | 'code-history';

let _db: IDBDatabase | null = null;

function openDb(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      const entityStores: EntityStore[] = [
        'projects',
        'saved-queries',
        'notes',
        'schema-designs',
        'run-history',
        'code-history',
      ];
      for (const name of entityStores) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: 'id' });
        }
      }
      // Snapshot store uses out-of-line keys (projectId strings).
      if (!db.objectStoreNames.contains('snapshots')) {
        db.createObjectStore('snapshots');
      }
    };

    req.onsuccess = () => {
      _db = req.result;
      resolve(_db!);
    };
    req.onerror = () => reject(req.error);
  });
}

async function store(name: string, mode: IDBTransactionMode): Promise<IDBObjectStore> {
  const db = await openDb();
  return db.transaction(name, mode).objectStore(name);
}

export async function localGet<T>(s: EntityStore, id: string): Promise<T | undefined> {
  const os = await store(s, 'readonly');
  return new Promise((resolve, reject) => {
    const req = os.get(id);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function localGetAll<T>(s: EntityStore): Promise<T[]> {
  const os = await store(s, 'readonly');
  return new Promise((resolve, reject) => {
    const req = os.getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function localPut<T>(s: EntityStore, value: T): Promise<void> {
  const os = await store(s, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = os.put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function localDelete(s: EntityStore, id: string): Promise<void> {
  const os = await store(s, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = os.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function localClear(s: EntityStore): Promise<void> {
  const os = await store(s, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = os.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── Binary snapshots (project DB state) ─────────────────────────────────────

export async function saveSnapshot(projectId: string, data: Uint8Array): Promise<void> {
  const os = await store('snapshots', 'readwrite');
  return new Promise((resolve, reject) => {
    const req = os.put(data, projectId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function loadSnapshot(projectId: string): Promise<Uint8Array | null> {
  const os = await store('snapshots', 'readonly');
  return new Promise((resolve, reject) => {
    const req = os.get(projectId);
    req.onsuccess = () => resolve((req.result as Uint8Array) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteSnapshot(projectId: string): Promise<void> {
  const os = await store('snapshots', 'readwrite');
  return new Promise((resolve, reject) => {
    const req = os.delete(projectId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
