/** Domain types shared by the local store, the repository and the API routes. */

export type Customer = {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  notes: string;
  badge: string;
  createdAt: string;
  updatedAt: string;
};

export type Project = {
  id: string;
  customerId: string;
  name: string;
  status: 'active' | 'quoted' | 'won' | 'lost' | 'archived';
  createdAt: string;
  updatedAt: string;
};

export type Photo = {
  id: string;
  projectId: string;
  storagePath: string;
  label: string;
  width: number;
  height: number;
  isActive: boolean;
  capturedAt: string;
};

/** A point in normalised photo space: 0..1 on both axes. */
export type Point = { x: number; y: number };

/**
 * One surface on one photo. `polygon` is normalised against the photo's own
 * dimensions so an overlay lands correctly at any render size — this is what
 * the old hardcoded percentage rectangles could never do across photos.
 */
export type Detection = {
  id: string;
  photoId: string;
  category: string;
  label: string;
  polygon: Point[];
  approxSqft: number | null;
  confidence: number | null;
  source: 'auto' | 'manual';
  selected: boolean;
};

export type Selection = {
  id: string;
  projectId: string;
  category: string;
  line: string;
  color: string;
  options: Record<string, string>;
};

export type Version = {
  id: string;
  projectId: string;
  photoId: string;
  name: string;
  meta: string;
  storagePath: string;
  instructions: string[];
  isFavorite: boolean;
  createdAt: string;
};

export type JobState = 'queued' | 'running' | 'done' | 'failed' | 'cancelled';

export type RenderJob = {
  id: string;
  projectId: string;
  photoId: string;
  versionId: string | null;
  versionName: string;
  state: JobState;
  stage: number;
  instructions: string[];
  maskPath: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OutboxTable =
  | 'customers' | 'projects' | 'photos' | 'detections'
  | 'selections' | 'versions' | 'feedback';

/**
 * Rows and binaries waiting to reach Supabase. Drained by lib/sync.ts.
 *
 * `storage` entries carry no bytes — only the path. The blob already lives in
 * IndexedDB, and duplicating a multi-megabyte photo into the queue would
 * double the storage cost of every capture for no benefit.
 */
export type OutboxEntry = {
  id: string;
  table: OutboxTable | 'storage';
  op: 'upsert' | 'delete';
  payload: Record<string, unknown>;
  queuedAt: number;
  attempts: number;
  lastError?: string;
};
