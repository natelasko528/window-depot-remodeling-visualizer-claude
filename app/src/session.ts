/**
 * Appointment session — the real data behind the screens.
 *
 * Split out from store.ts, which stays responsible for transient UI state
 * (which screen, which tab, slider position). This module owns everything
 * that must survive a refresh: the customer, their project, photos,
 * detections, selections and rendered versions.
 *
 * Every mutation goes through repo.ts, so it is written locally first and
 * synced afterwards.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as repo from './lib/repo';
import type { Customer, Detection, Photo, Project, Selection, Version } from './lib/types';
import { getMeta, setMeta } from './lib/db';

export type SessionData = {
  customer: Customer | null;
  project: Project | null;
  photos: Photo[];
  activePhotoId: string | null;
  detections: Detection[];
  selections: Selection[];
  versions: Version[];
  /** storagePath -> object URL, resolved lazily for whatever is on screen. */
  urls: Record<string, string>;
  loading: boolean;
};

const EMPTY: SessionData = {
  customer: null, project: null, photos: [], activePhotoId: null,
  detections: [], selections: [], versions: [], urls: {}, loading: true,
};

export function useSession() {
  const [data, setData] = useState<SessionData>(EMPTY);
  const dataRef = useRef(data);
  dataRef.current = data;

  const patch = useCallback((next: Partial<SessionData>) => {
    setData((prev) => ({ ...prev, ...next }));
  }, []);

  /** Resolves object URLs for any storage paths we do not have yet. */
  const resolveUrls = useCallback(async (paths: string[]) => {
    const known = dataRef.current.urls;
    const missing = paths.filter((p) => p && !known[p]);
    if (!missing.length) return;
    const entries = await Promise.all(
      missing.map(async (path) => [path, await repo.imageUrl(path)] as const),
    );
    const resolved = Object.fromEntries(entries.filter(([, url]) => url)) as Record<string, string>;
    if (Object.keys(resolved).length) {
      setData((prev) => ({ ...prev, urls: { ...prev.urls, ...resolved } }));
    }
  }, []);

  const reloadProject = useCallback(async (projectId: string) => {
    const [photos, selections, versions] = await Promise.all([
      repo.photosForProject(projectId),
      repo.selectionsForProject(projectId),
      repo.versionsForProject(projectId),
    ]);
    const active = photos.find((p) => p.isActive) ?? photos[0] ?? null;
    const detections = active ? await repo.detectionsForPhoto(active.id) : [];

    patch({
      photos, selections, versions,
      activePhotoId: active?.id ?? null,
      detections,
      loading: false,
    });
    void resolveUrls([...photos.map((p) => p.storagePath), ...versions.map((v) => v.storagePath)]);
  }, [patch, resolveUrls]);

  /** Opens a customer and their latest project, remembering it across reloads. */
  const openCustomer = useCallback(async (customerId: string) => {
    patch({ loading: true });
    const customer = await repo.getCustomer(customerId);
    if (!customer) {
      patch({ loading: false });
      return;
    }
    const project = await repo.openOrCreateProject(customerId);
    await setMeta('lastCustomerId', customerId);
    patch({ customer, project });
    await reloadProject(project.id);
  }, [patch, reloadProject]);

  // Restore the appointment that was open when the tablet last slept.
  useEffect(() => {
    void (async () => {
      const lastId = await getMeta<string>('lastCustomerId');
      if (lastId) {
        await openCustomer(lastId);
        return;
      }
      patch({ loading: false });
    })();
  }, [openCustomer, patch]);

  const activePhoto = useMemo(
    () => data.photos.find((p) => p.id === data.activePhotoId) ?? null,
    [data.photos, data.activePhotoId],
  );

  // ------------------------------------------------------------- photos

  const addPhoto = useCallback(async (blob: Blob, meta: { width: number; height: number; label?: string }) => {
    const project = dataRef.current.project;
    if (!project) throw new Error('Pick a customer before adding photos.');
    const photo = await repo.addPhoto(project.id, blob, meta);
    await reloadProject(project.id);
    return photo;
  }, [reloadProject]);

  const setActivePhoto = useCallback(async (photoId: string) => {
    const project = dataRef.current.project;
    if (!project) return;
    await repo.setActivePhoto(project.id, photoId);
    await reloadProject(project.id);
  }, [reloadProject]);

  const deletePhoto = useCallback(async (photoId: string) => {
    const project = dataRef.current.project;
    if (!project) return;
    await repo.deletePhoto(photoId);
    await reloadProject(project.id);
  }, [reloadProject]);

  // --------------------------------------------------------- selections

  const saveSelection = useCallback(async (
    category: string,
    patchValue: { line?: string; color?: string; options?: Record<string, string> },
  ) => {
    const project = dataRef.current.project;
    if (!project) return;
    await repo.saveSelection(project.id, category, patchValue);
    patch({ selections: await repo.selectionsForProject(project.id) });
  }, [patch]);

  // --------------------------------------------------------- detections

  const setDetections = useCallback(async (items: Omit<Detection, 'id' | 'photoId'>[]) => {
    const photoId = dataRef.current.activePhotoId;
    if (!photoId) return;
    const rows = await repo.replaceDetections(photoId, items);
    patch({ detections: rows });
  }, [patch]);

  const addDetection = useCallback(async (item: Omit<Detection, 'id' | 'photoId'>) => {
    const photoId = dataRef.current.activePhotoId;
    if (!photoId) return;
    const row = await repo.saveDetection({ ...item, id: crypto.randomUUID(), photoId });
    patch({ detections: [...dataRef.current.detections, row] });
    return row;
  }, [patch]);

  const updateDetection = useCallback(async (detection: Detection) => {
    await repo.saveDetection(detection);
    patch({
      detections: dataRef.current.detections.map((d) => (d.id === detection.id ? detection : d)),
    });
  }, [patch]);

  const removeDetection = useCallback(async (id: string) => {
    await repo.deleteDetection(id);
    patch({ detections: dataRef.current.detections.filter((d) => d.id !== id) });
  }, [patch]);

  // ----------------------------------------------------------- versions

  const addVersion = useCallback(async (
    input: { name: string; meta: string; instructions: string[]; blob: Blob },
  ) => {
    const { project, activePhotoId } = dataRef.current;
    if (!project || !activePhotoId) throw new Error('Nothing to attach this render to.');
    const id = crypto.randomUUID();
    const version = await repo.addVersion({
      id,
      projectId: project.id,
      photoId: activePhotoId,
      name: input.name,
      meta: input.meta,
      storagePath: `${project.id}/${id}.png`,
      instructions: input.instructions,
      isFavorite: false,
      blob: input.blob,
    });
    await reloadProject(project.id);
    return version;
  }, [reloadProject]);

  const favoriteVersion = useCallback(async (versionId: string) => {
    const project = dataRef.current.project;
    if (!project) return;
    await repo.setFavorite(project.id, versionId);
    patch({ versions: await repo.versionsForProject(project.id) });
  }, [patch]);

  const deleteVersion = useCallback(async (versionId: string) => {
    const project = dataRef.current.project;
    if (!project) return;
    await repo.deleteVersion(versionId);
    await reloadProject(project.id);
  }, [reloadProject]);

  const actions = useMemo(() => ({
    openCustomer, reloadProject, resolveUrls,
    addPhoto, setActivePhoto, deletePhoto,
    saveSelection,
    setDetections, addDetection, updateDetection, removeDetection,
    addVersion, favoriteVersion, deleteVersion,
  }), [
    openCustomer, reloadProject, resolveUrls,
    addPhoto, setActivePhoto, deletePhoto,
    saveSelection,
    setDetections, addDetection, updateDetection, removeDetection,
    addVersion, favoriteVersion, deleteVersion,
  ]);

  return { data, activePhoto, actions };
}

export type SessionActions = ReturnType<typeof useSession>['actions'];
