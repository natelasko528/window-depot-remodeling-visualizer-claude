/**
 * Outbox drain.
 *
 * Every mutation is written locally and queued here. This module is the only
 * place that pushes to Supabase, which keeps the "what happens when the tablet
 * has no signal" question answerable in one file.
 *
 * Conflict policy is last-write-wins per row. For a tool where one rep owns
 * one appointment on one device, concurrent edits to the same row essentially
 * do not happen, and anything fancier would cost more than it earns.
 */

import * as db from './db';
import { supabase } from './supabase';
import type { OutboxEntry } from './types';

const MAX_ATTEMPTS = 6;

type Listener = (status: SyncStatus) => void;

export type SyncStatus = {
  online: boolean;
  pending: number;
  syncing: boolean;
  lastSyncAt: number | null;
  lastError: string | null;
};

let status: SyncStatus = {
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  pending: 0,
  syncing: false,
  lastSyncAt: null,
  lastError: null,
};

const listeners = new Set<Listener>();

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  fn(status);
  return () => listeners.delete(fn);
}

function emit(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch };
  for (const fn of listeners) fn(status);
}

export function getStatus(): SyncStatus {
  return status;
}

async function pendingCount(): Promise<number> {
  return (await db.all<OutboxEntry>('outbox')).length;
}

export async function enqueue(entry: Omit<OutboxEntry, 'id' | 'queuedAt' | 'attempts'>): Promise<void> {
  const row: OutboxEntry = {
    ...entry,
    id: crypto.randomUUID(),
    queuedAt: Date.now(),
    attempts: 0,
  };
  await db.put('outbox', row);
  emit({ pending: await pendingCount() });
  void drain();
}

/**
 * Uploads a blob already sitting in IndexedDB. Paths are prefixed with the
 * user id because the storage policies use the first folder segment as the
 * ownership check.
 */
async function syncStorage(entry: OutboxEntry, userId: string): Promise<void> {
  const client = supabase;
  if (!client) throw new Error('Supabase is not configured.');

  const bucket = entry.payload.bucket as string;
  const path = entry.payload.path as string;
  const key = `${userId}/${path}`;

  if (entry.op === 'delete') {
    const { error } = await client.storage.from(bucket).remove([key]);
    if (error) throw new Error(error.message);
    return;
  }

  const blob = await db.getBlob(path);
  // The local blob is the only copy; if it is gone the row it belonged to was
  // deleted, so the upload is moot rather than an error worth retrying.
  if (!blob) return;

  const { error } = await client.storage
    .from(bucket)
    .upload(key, blob, { upsert: true, contentType: blob.type || 'image/jpeg' });
  if (error) throw new Error(error.message);
}

let draining = false;

/**
 * Drains oldest-first and stops at the first failure, because entries can
 * depend on each other (a photo row is meaningless before its project). A
 * retry of the blocked entry happens on the next drain rather than skipping
 * ahead and creating an orphan.
 */
export async function drain(): Promise<void> {
  if (draining || !supabase || !status.online) return;

  const session = await supabase.auth.getSession();
  const userId = session.data.session?.user.id;
  if (!userId) return;

  draining = true;
  emit({ syncing: true, lastError: null });

  try {
    const queue = (await db.all<OutboxEntry>('outbox')).sort((a, b) => a.queuedAt - b.queuedAt);

    for (const entry of queue) {
      try {
        if (entry.table === 'storage') {
          await syncStorage(entry, userId);
        } else if (entry.op === 'delete') {
          const { error } = await supabase.from(entry.table).delete().eq('id', entry.payload.id as string);
          if (error) throw new Error(error.message);
        } else {
          const { error } = await supabase
            .from(entry.table)
            .upsert({ ...entry.payload, user_id: userId }, { onConflict: 'id' });
          if (error) throw new Error(error.message);
        }
        await db.remove('outbox', entry.id);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const attempts = entry.attempts + 1;

        // A row that keeps failing is poison — it would block every entry
        // behind it forever. Drop it after a bounded number of tries and
        // surface the reason rather than stalling the whole queue silently.
        if (attempts >= MAX_ATTEMPTS) {
          await db.remove('outbox', entry.id);
          emit({ lastError: `Dropped ${entry.table} after ${attempts} attempts: ${message}` });
          continue;
        }

        await db.put('outbox', { ...entry, attempts, lastError: message });
        emit({ lastError: message });
        break;
      }
    }

    emit({ pending: await pendingCount(), lastSyncAt: Date.now() });
  } finally {
    draining = false;
    emit({ syncing: false });
  }
}

let started = false;

export function startSync(): void {
  if (started || typeof window === 'undefined') return;
  started = true;

  window.addEventListener('online', () => {
    emit({ online: true });
    void drain();
  });
  window.addEventListener('offline', () => emit({ online: false }));

  // A periodic nudge covers the cases the online event misses: captive
  // portals, flaky cell handoff, and a token that only refreshes on demand.
  setInterval(() => void drain(), 30_000);

  void pendingCount().then((pending) => emit({ pending }));
  void drain();
}
