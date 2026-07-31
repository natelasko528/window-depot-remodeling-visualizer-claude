import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { GEN_STAGES, PANEL } from './data';
import { generateVisualization } from './api';
import { blobToDataUrl, polygonMask } from './lib/image';
import { getBlob } from './lib/db';
import type { SessionActions, SessionData } from './session';
import type { Detection } from './lib/types';

export type Screen =
  | 'home' | 'customers' | 'setup' | 'photos' | 'areas'
  | 'visualizer' | 'compare' | 'selections' | 'summary' | 'library';

export type CompareMode = 'original' | 'slider' | 'side';

/** One point in the undo stack: the product choice per category. */
type Snapshot = { category: string; line: string; color: string }[];

/**
 * Transient UI state only. Anything that must survive a refresh lives in
 * session.ts and is persisted through the repository.
 */
export type State = {
  screen: Screen;
  cats: string[];
  tool: string;
  panelTab: string;
  activeVersionId: string | null;
  genStage: number;
  generating: boolean;
  detecting: boolean;
  compare: CompareMode;
  sliderPct: number;
  dragging: boolean;
  presenting: boolean;
  sheet: boolean;
  advanced: boolean;
  toast: string;
  vw: number;
};

const INITIAL: State = {
  screen: 'home',
  cats: ['Roofing', 'Siding', 'Patio doors'],
  tool: 'Select',
  panelTab: 'Siding',
  activeVersionId: null,
  genStage: -1,
  generating: false,
  detecting: false,
  compare: 'slider',
  sliderPct: 52,
  dragging: false,
  presenting: false,
  sheet: false,
  advanced: false,
  toast: '',
  vw: typeof window === 'undefined' ? 1366 : window.innerWidth,
};

/**
 * Resolves the product line and colour for a category: the rep's saved choice
 * if there is one, otherwise the catalogue default.
 */
export function resolveSelection(session: SessionData, category: string) {
  const spec = PANEL[category];
  const saved = session.selections.find((s) => s.category === category);
  return {
    line: saved?.line || spec?.line || '',
    color: saved?.color || spec?.color || '',
  };
}

/**
 * Turns the confirmed surfaces into the sentences the image model is given.
 *
 * Driven by real detections on the active photo rather than a fixed list, so
 * the prompt names the surfaces that genuinely exist in this photograph.
 */
export function buildInstructions(session: SessionData): string[] {
  const byCategory = new Map<string, string[]>();
  for (const detection of session.detections) {
    if (!detection.selected || !PANEL[detection.category]) continue;
    const list = byCategory.get(detection.category) ?? [];
    list.push(detection.label.toLowerCase());
    byCategory.set(detection.category, list);
  }

  return [...byCategory].map(([category, places]) => {
    const spec = PANEL[category];
    const { line, color } = resolveSelection(session, category);
    const product = line.startsWith(spec.brand) ? line : `${spec.brand} ${line}`;
    const detail = spec.options.map((o) => `${o.label}: ${o.value}`).join('; ');
    return `${category} on the ${places.join(' and ')} — ${product} in ${color} (${detail}).`;
  });
}

export function useVisualizer(session: SessionData, sessionActions: SessionActions) {
  const [state, setState] = useState<State>(INITIAL);
  const stateRef = useRef(state);
  stateRef.current = state;

  const sessionRef = useRef(session);
  sessionRef.current = session;

  const patch = useCallback((next: Partial<State>) => setState((prev) => ({ ...prev, ...next })), []);

  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abort = useRef<AbortController>(undefined);

  const flash = useCallback((toast: string) => {
    clearTimeout(toastTimer.current);
    patch({ toast });
    toastTimer.current = setTimeout(() => patch({ toast: '' }), 3600);
  }, [patch]);

  useEffect(() => {
    const onResize = () => patch({ vw: window.innerWidth });
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      clearTimeout(toastTimer.current);
      abort.current?.abort();
    };
  }, [patch]);

  // Keep the selected version pointing at something that still exists.
  useEffect(() => {
    const versions = session.versions;
    if (!versions.length) {
      if (stateRef.current.activeVersionId) patch({ activeVersionId: null });
      return;
    }
    if (!versions.some((v) => v.id === stateRef.current.activeVersionId)) {
      patch({ activeVersionId: versions[versions.length - 1].id });
    }
  }, [session.versions, patch]);

  const go = useCallback((screen: Screen) => () => patch({ screen, presenting: false }), [patch]);

  const stopGeneration = useCallback(() => {
    abort.current?.abort();
    abort.current = undefined;
  }, []);

  /**
   * Renders the current selections against the active photo.
   *
   * `maskFor` limits the edit to specific surfaces — used by "revert area" and
   * by per-area re-renders. Omitted, the whole photo is offered to the model
   * and the prompt alone constrains what changes.
   */
  const runGen = useCallback(async (versionName: string, maskFor?: Detection[]) => {
    const current = sessionRef.current;
    const photo = current.photos.find((p) => p.id === current.activePhotoId);

    if (!photo) {
      flash('Take or choose a photo first — there is nothing to render.');
      return;
    }
    const instructions = buildInstructions(current);
    if (!instructions.length) {
      flash('Confirm at least one area on the photo before rendering.');
      return;
    }

    stopGeneration();
    patch({ generating: true, genStage: 0 });

    const controller = new AbortController();
    abort.current = controller;

    try {
      const blob = await getBlob(photo.storagePath);
      if (!blob) throw new Error('That photo is no longer on this tablet.');

      patch({ genStage: 1 });
      const image = await blobToDataUrl(blob);

      let mask: string | undefined;
      if (maskFor?.length) {
        patch({ genStage: 2 });
        const maskBlob = await polygonMask(photo.width, photo.height, maskFor.map((d) => d.polygon));
        mask = await blobToDataUrl(maskBlob);
      }

      patch({ genStage: 3 });
      const result = await generateVisualization(image, instructions, controller.signal, mask);
      if (controller.signal.aborted) return;

      patch({ genStage: GEN_STAGES.length - 1 });
      const rendered = await (await fetch(result)).blob();

      const summary = [...new Set(current.detections.filter((d) => d.selected).map((d) => d.category))]
        .map((category) => resolveSelection(current, category).color)
        .join(' / ');

      const version = await sessionActions.addVersion({
        name: versionName,
        meta: summary || 'Custom selection',
        instructions,
        blob: rendered,
      });

      patch({ generating: false, genStage: -1, activeVersionId: version.id });
      flash(`${versionName} saved to this project.`);
    } catch (err) {
      if (controller.signal.aborted) return;
      patch({ generating: false, genStage: -1 });
      flash(err instanceof Error ? err.message : 'The render failed.');
    } finally {
      abort.current = undefined;
    }
  }, [flash, patch, sessionActions, stopGeneration]);

  const cancelGen = useCallback(() => {
    stopGeneration();
    patch({ generating: false, genStage: -1 });
    flash('Cancelled. Your selections are untouched.');
  }, [flash, patch, stopGeneration]);

  /**
   * Starts another option from the current selections. Unlike the prototype
   * this does not invent colours — the rep changes what they want and renders
   * again, and the result is a genuinely separate image.
   */
  const newVersion = useCallback(() => {
    const count = sessionRef.current.versions.length;
    const name = `Option ${String.fromCharCode(65 + count)}`;
    void runGen(name);
  }, [runGen]);

  const moveSlider = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(2, Math.min(98, ((e.clientX - rect.left) / rect.width) * 100));
    patch({ sliderPct: Math.round(pct) });
  }, [patch]);

  const slider = useMemo(() => ({
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      patch({ dragging: true });
      moveSlider(e);
    },
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
      if (stateRef.current.dragging) moveSlider(e);
    },
    onPointerUp: (e: ReactPointerEvent<HTMLElement>) => {
      e.currentTarget.releasePointerCapture(e.pointerId);
      patch({ dragging: false });
    },
  }), [moveSlider, patch]);

  const activePanelKey = useMemo(() => {
    const key = state.panelTab;
    return PANEL[key] ? key : 'Siding';
  }, [state.panelTab]);

  /**
   * Undo/redo over product choices.
   *
   * Only selection edits are tracked. Renders are not undoable — they are
   * saved versions the rep switches between, and folding them into the same
   * stack would make "undo" mean two different things on the same screen.
   */
  const history = useRef<{ past: Snapshot[]; future: Snapshot[] }>({ past: [], future: [] });

  const snapshot = useCallback((): Snapshot => {
    return sessionRef.current.selections.map((s) => ({
      category: s.category,
      line: s.line,
      color: s.color,
    }));
  }, []);

  const applySnapshot = useCallback(async (entry: Snapshot) => {
    for (const s of entry) {
      await sessionActions.saveSelection(s.category, { line: s.line, color: s.color });
    }
  }, [sessionActions]);

  const record = useCallback(() => {
    history.current.past.push(snapshot());
    history.current.future = [];
  }, [snapshot]);

  const undo = useCallback(() => {
    const entry = history.current.past.pop();
    if (!entry) {
      flash('Nothing to undo.');
      return;
    }
    history.current.future.push(snapshot());
    void applySnapshot(entry);
    flash('Undid the last change.');
  }, [applySnapshot, flash, snapshot]);

  const redo = useCallback(() => {
    const entry = history.current.future.pop();
    if (!entry) {
      flash('Nothing to redo.');
      return;
    }
    history.current.past.push(snapshot());
    void applySnapshot(entry);
    flash('Redid the change.');
  }, [applySnapshot, flash, snapshot]);

  const actions = useMemo(() => ({
    patch,
    flash,
    go,
    runGen,
    cancelGen,
    newVersion,
    slider,
    undo,
    redo,
    canUndo: () => history.current.past.length > 0,
    canRedo: () => history.current.future.length > 0,
    toggleCategory: (name: string) => setState((prev) => ({
      ...prev,
      cats: prev.cats.includes(name) ? prev.cats.filter((c) => c !== name) : prev.cats.concat([name]),
    })),
    pickLine: (category: string, line: string) => {
      record();
      void sessionActions.saveSelection(category, { line });
    },
    pickColor: (category: string, color: string) => {
      record();
      void sessionActions.saveSelection(category, { color });
    },
  }), [cancelGen, flash, go, newVersion, patch, record, redo, runGen, sessionActions, slider, undo]);

  return { state, actions, activePanelKey };
}

export type Actions = ReturnType<typeof useVisualizer>['actions'];
