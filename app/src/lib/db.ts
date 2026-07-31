/**
 * IndexedDB wrapper — the local source of truth during an appointment.
 *
 * Deliberately dependency-free and tiny. Blobs live in their own store keyed
 * by storage path, so a photo taken with no signal is immediately renderable
 * from disk and stays renderable after a refresh, long before it reaches
 * Supabase Storage.
 */

const DB_NAME = 'wd-visualizer';
const DB_VERSION = 1;

export type StoreName =
  | 'customers' | 'projects' | 'photos' | 'detections'
  | 'selections' | 'versions' | 'blobs' | 'outbox' | 'meta';

const STORES: { name: StoreName; keyPath: string; indexes?: [string, string][] }[] = [
  { name: 'customers', keyPath: 'id' },
  { name: 'projects', keyPath: 'id', indexes: [['customerId', 'customerId']] },
  { name: 'photos', keyPath: 'id', indexes: [['projectId', 'projectId']] },
  { name: 'detections', keyPath: 'id', indexes: [['photoId', 'photoId']] },
  { name: 'selections', keyPath: 'id', indexes: [['projectId', 'projectId']] },
  { name: 'versions', keyPath: 'id', indexes: [['projectId', 'projectId']] },
  { name: 'blobs', keyPath: 'path' },
  { name: 'outbox', keyPath: 'id' },
  { name: 'meta', keyPath: 'key' },
];

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const store of STORES) {
        if (db.objectStoreNames.contains(store.name)) continue;
        const os = db.createObjectStore(store.name, { keyPath: store.keyPath });
        for (const [name, path] of store.indexes ?? []) os.createIndex(name, path);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function run<T>(store: StoreName, mode: IDBTransactionMode, fn: (os: IDBObjectStore) => IDBRequest): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const req = fn(tx.objectStore(store));
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error);
      }),
  );
}

export function put<T>(store: StoreName, value: T): Promise<void> {
  return run<void>(store, 'readwrite', (os) => os.put(value));
}

export async function putMany<T>(store: StoreName, values: T[]): Promise<void> {
  if (!values.length) return;
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const os = tx.objectStore(store);
    for (const v of values) os.put(v);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function get<T>(store: StoreName, key: string): Promise<T | undefined> {
  return run<T | undefined>(store, 'readonly', (os) => os.get(key));
}

export function all<T>(store: StoreName): Promise<T[]> {
  return run<T[]>(store, 'readonly', (os) => os.getAll());
}

export function byIndex<T>(store: StoreName, index: string, value: string): Promise<T[]> {
  return run<T[]>(store, 'readonly', (os) => os.index(index).getAll(value));
}

export function remove(store: StoreName, key: string): Promise<void> {
  return run<void>(store, 'readwrite', (os) => os.delete(key));
}

// ------------------------------------------------------------------ blobs

export async function putBlob(path: string, blob: Blob): Promise<void> {
  await put('blobs', { path, blob });
}

export async function getBlob(path: string): Promise<Blob | undefined> {
  const row = await get<{ path: string; blob: Blob }>('blobs', path);
  return row?.blob;
}

/**
 * Object URLs are cached because revoking and recreating them on every render
 * makes <img> flicker, and because the same photo is shown on five screens.
 */
const urlCache = new Map<string, string>();

export async function blobUrl(path: string): Promise<string | null> {
  const cached = urlCache.get(path);
  if (cached) return cached;
  const blob = await getBlob(path);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urlCache.set(path, url);
  return url;
}

export function forgetBlobUrl(path: string): void {
  const url = urlCache.get(path);
  if (url) {
    URL.revokeObjectURL(url);
    urlCache.delete(path);
  }
}

// ------------------------------------------------------------------- meta

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const row = await get<{ key: string; value: T }>('meta', key);
  return row?.value;
}

export async function setMeta<T>(key: string, value: T): Promise<void> {
  await put('meta', { key, value });
}
