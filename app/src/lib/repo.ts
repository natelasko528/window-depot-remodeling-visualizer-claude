/**
 * The repository every screen reads and writes through. No screen touches
 * Supabase or IndexedDB directly.
 *
 * Writes land in IndexedDB synchronously-ish and enqueue an outbox entry; the
 * sync worker drains it. That ordering is what makes the app usable with no
 * signal — the UI never waits on the network to show the rep their own edit.
 *
 * IDs are minted client-side (crypto.randomUUID) so rows created offline keep
 * a stable identity, and sync is a plain idempotent upsert rather than an
 * insert that has to be reconciled with a server-assigned key.
 */

import * as db from './db';
import { enqueue } from './sync';
import type {
  Customer, Detection, OutboxEntry, Photo, Project, Selection, Version,
} from './types';

const nowIso = () => new Date().toISOString();
const newId = () => crypto.randomUUID();

async function persist<T extends { id: string }>(
  store: db.StoreName,
  table: OutboxEntry['table'],
  row: T,
  remote: Record<string, unknown>,
): Promise<T> {
  await db.put(store, row);
  await enqueue({ table, op: 'upsert', payload: { id: row.id, ...remote } });
  return row;
}

// -------------------------------------------------------------- customers

export async function listCustomers(): Promise<Customer[]> {
  const rows = await db.all<Customer>('customers');
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/**
 * Search runs against the local cache rather than the network so it stays
 * instant and keeps working offline. Supabase holds the same rows behind a
 * trigram index for the day this outgrows a tablet-sized customer list.
 */
export async function searchCustomers(query: string): Promise<Customer[]> {
  const all = await listCustomers();
  const q = query.trim().toLowerCase();
  if (!q) return all;
  const terms = q.split(/\s+/);
  return all.filter((c) => {
    const hay = `${c.name} ${c.address} ${c.phone} ${c.email}`.toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
}

export function getCustomer(id: string): Promise<Customer | undefined> {
  return db.get<Customer>('customers', id);
}

export async function saveCustomer(input: Partial<Customer> & { name: string }): Promise<Customer> {
  const existing = input.id ? await getCustomer(input.id) : undefined;
  const row: Customer = {
    id: input.id ?? newId(),
    name: input.name,
    address: input.address ?? existing?.address ?? '',
    phone: input.phone ?? existing?.phone ?? '',
    email: input.email ?? existing?.email ?? '',
    notes: input.notes ?? existing?.notes ?? '',
    badge: input.badge ?? existing?.badge ?? '',
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  };
  return persist('customers', 'customers', row, {
    name: row.name, address: row.address, phone: row.phone, email: row.email,
    notes: row.notes, badge: row.badge, created_at: row.createdAt, updated_at: row.updatedAt,
  });
}

export async function deleteCustomer(id: string): Promise<void> {
  await db.remove('customers', id);
  await enqueue({ table: 'customers', op: 'delete', payload: { id } });
}

// --------------------------------------------------------------- projects

export async function projectsForCustomer(customerId: string): Promise<Project[]> {
  const rows = await db.byIndex<Project>('projects', 'customerId', customerId);
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getProject(id: string): Promise<Project | undefined> {
  return db.get<Project>('projects', id);
}

export async function createProject(customerId: string, name = 'Exterior remodel'): Promise<Project> {
  const row: Project = {
    id: newId(), customerId, name, status: 'active',
    createdAt: nowIso(), updatedAt: nowIso(),
  };
  return persist('projects', 'projects', row, {
    customer_id: row.customerId, name: row.name, status: row.status,
    created_at: row.createdAt, updated_at: row.updatedAt,
  });
}

/** Opens the customer's most recent project, or starts their first one. */
export async function openOrCreateProject(customerId: string): Promise<Project> {
  const [latest] = await projectsForCustomer(customerId);
  return latest ?? createProject(customerId);
}

// ----------------------------------------------------------------- photos

export async function photosForProject(projectId: string): Promise<Photo[]> {
  const rows = await db.byIndex<Photo>('photos', 'projectId', projectId);
  return rows.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
}

export async function activePhoto(projectId: string): Promise<Photo | undefined> {
  const rows = await photosForProject(projectId);
  return rows.find((p) => p.isActive) ?? rows[0];
}

export async function addPhoto(
  projectId: string,
  blob: Blob,
  meta: { width: number; height: number; label?: string },
): Promise<Photo> {
  const id = newId();
  const storagePath = `${projectId}/${id}.jpg`;
  await db.putBlob(storagePath, blob);
  await enqueue({ table: 'storage', op: 'upsert', payload: { bucket: 'photos', path: storagePath } });

  const existing = await photosForProject(projectId);
  const row: Photo = {
    id, projectId, storagePath,
    label: meta.label ?? `Elevation ${existing.length + 1}`,
    width: meta.width, height: meta.height,
    isActive: existing.length === 0,
    capturedAt: nowIso(),
  };
  return persist('photos', 'photos', row, {
    project_id: projectId, storage_path: storagePath, label: row.label,
    width: row.width, height: row.height, is_active: row.isActive,
    captured_at: row.capturedAt,
  });
}

export async function setActivePhoto(projectId: string, photoId: string): Promise<void> {
  const rows = await photosForProject(projectId);
  for (const p of rows) {
    const isActive = p.id === photoId;
    if (p.isActive === isActive) continue;
    const next = { ...p, isActive };
    await db.put('photos', next);
    await enqueue({ table: 'photos', op: 'upsert', payload: { id: p.id, is_active: isActive } });
  }
}

export async function deletePhoto(photoId: string): Promise<void> {
  const photo = await db.get<Photo>('photos', photoId);
  if (photo) db.forgetBlobUrl(photo.storagePath);
  await db.remove('photos', photoId);
  await enqueue({ table: 'photos', op: 'delete', payload: { id: photoId } });
}

/** Resolves a storage path to something an <img> can use, local blob first. */
export async function imageUrl(storagePath: string): Promise<string | null> {
  return db.blobUrl(storagePath);
}

// ------------------------------------------------------------- detections

export function detectionsForPhoto(photoId: string): Promise<Detection[]> {
  return db.byIndex<Detection>('detections', 'photoId', photoId);
}

export async function replaceDetections(photoId: string, items: Omit<Detection, 'id' | 'photoId'>[]): Promise<Detection[]> {
  const previous = await detectionsForPhoto(photoId);
  for (const d of previous) {
    await db.remove('detections', d.id);
    await enqueue({ table: 'detections', op: 'delete', payload: { id: d.id } });
  }
  const rows: Detection[] = items.map((item) => ({ ...item, id: newId(), photoId }));
  await db.putMany('detections', rows);
  for (const row of rows) {
    await enqueue({
      table: 'detections', op: 'upsert',
      payload: {
        id: row.id, photo_id: photoId, category: row.category, label: row.label,
        polygon: row.polygon, approx_sqft: row.approxSqft, confidence: row.confidence,
        source: row.source, selected: row.selected,
      },
    });
  }
  return rows;
}

export async function saveDetection(detection: Detection): Promise<Detection> {
  return persist('detections', 'detections', detection, {
    photo_id: detection.photoId, category: detection.category, label: detection.label,
    polygon: detection.polygon, approx_sqft: detection.approxSqft,
    confidence: detection.confidence, source: detection.source, selected: detection.selected,
  });
}

export async function deleteDetection(id: string): Promise<void> {
  await db.remove('detections', id);
  await enqueue({ table: 'detections', op: 'delete', payload: { id } });
}

// ------------------------------------------------------------- selections

export function selectionsForProject(projectId: string): Promise<Selection[]> {
  return db.byIndex<Selection>('selections', 'projectId', projectId);
}

export async function saveSelection(
  projectId: string,
  category: string,
  patch: { line?: string; color?: string; options?: Record<string, string> },
): Promise<Selection> {
  const existing = (await selectionsForProject(projectId)).find((s) => s.category === category);
  const row: Selection = {
    id: existing?.id ?? newId(),
    projectId, category,
    line: patch.line ?? existing?.line ?? '',
    color: patch.color ?? existing?.color ?? '',
    options: patch.options ?? existing?.options ?? {},
  };
  return persist('selections', 'selections', row, {
    project_id: projectId, category, line: row.line, color: row.color,
    options: row.options, updated_at: nowIso(),
  });
}

// --------------------------------------------------------------- versions

export async function versionsForProject(projectId: string): Promise<Version[]> {
  const rows = await db.byIndex<Version>('versions', 'projectId', projectId);
  return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function addVersion(
  version: Omit<Version, 'id' | 'createdAt'> & { id?: string; blob?: Blob },
): Promise<Version> {
  const { blob, ...rest } = version;
  const row: Version = { ...rest, id: version.id ?? newId(), createdAt: nowIso() };
  if (blob) {
    await db.putBlob(row.storagePath, blob);
    await enqueue({ table: 'storage', op: 'upsert', payload: { bucket: 'renders', path: row.storagePath } });
  }
  return persist('versions', 'versions', row, {
    project_id: row.projectId, photo_id: row.photoId, name: row.name, meta: row.meta,
    storage_path: row.storagePath, instructions: row.instructions,
    is_favorite: row.isFavorite, created_at: row.createdAt,
  });
}

export async function setFavorite(projectId: string, versionId: string): Promise<void> {
  for (const v of await versionsForProject(projectId)) {
    const isFavorite = v.id === versionId;
    if (v.isFavorite === isFavorite) continue;
    await db.put('versions', { ...v, isFavorite });
    await enqueue({ table: 'versions', op: 'upsert', payload: { id: v.id, is_favorite: isFavorite } });
  }
}

export async function deleteVersion(id: string): Promise<void> {
  const version = await db.get<Version>('versions', id);
  if (version) db.forgetBlobUrl(version.storagePath);
  await db.remove('versions', id);
  await enqueue({ table: 'versions', op: 'delete', payload: { id } });
}

// --------------------------------------------------------------- feedback

export async function reportFeedback(versionId: string | null, note: string): Promise<void> {
  await enqueue({
    table: 'feedback', op: 'upsert',
    payload: { id: newId(), version_id: versionId, note, created_at: nowIso() },
  });
}
