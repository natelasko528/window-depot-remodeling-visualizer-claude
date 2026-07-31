import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { PANEL } from './data';
import { generateVisualization } from './api';
import { blobToDataUrl, polygonMask } from './lib/image';
import { getBlob } from './lib/db';
import type { SessionActions, SessionData } from './session';
import type { Detection } from './lib/types';

export type Screen =
  | 'home' | 'customers' | 'photos' | 'areas'
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
  panelTab: string;
  activeVersionId: string | null;
  genStage: number;
  /** Live stage labels for the current run, one per category pass. */
  stages: string[];
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
  panelTab: 'Siding',
  activeVersionId: null,
  genStage: -1,
  stages: [],
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
 * Render order: the biggest background surfaces first, so smaller edits land on
 * a settled backdrop rather than being partly overwritten by the wall behind
 * them. Anything not listed renders last, in catalogue order.
 */
const RENDER_ORDER = ['Roofing', 'Siding', 'Gutters, soffit & fascia', 'Windows', 'Entry doors', 'Patio doors'];

export type RenderPass = {
  category: string;
  detections: Detection[];
  instruction: string;
};

/** The sentence describing one category's change, naming where it applies. */
export function instructionFor(session: SessionData, category: string, detections: Detection[]): string {
  const spec = PANEL[category];
  const { line, color } = resolveSelection(session, category);
  const product = line.startsWith(spec.brand) ? line : `${spec.brand} ${line}`;
  const detail = spec.options.map((o) => `${o.label}: ${o.value}`).join('; ');
  const places = detections.map((d) => d.label.toLowerCase()).join(' and ');
  return `${category} on the ${places} — ${product} in ${color} (${detail}).`;
}

/**
 * Groups the confirmed surfaces into one pass per product category.
 *
 * Each pass is rendered separately against a mask of only its own polygons,
 * which is what stops a siding colour from creeping onto the roof. Categories
 * with no catalogue entry are dropped here rather than silently ignored later.
 */
export function planPasses(session: SessionData): RenderPass[] {
  const byCategory = new Map<string, Detection[]>();
  for (const detection of session.detections) {
    if (!detection.selected || !PANEL[detection.category]) continue;
    if (!detection.polygon.length) continue;
    const list = byCategory.get(detection.category) ?? [];
    list.push(detection);
    byCategory.set(detection.category, list);
  }

  return [...byCategory]
    .sort(([a], [b]) => {
      const ai = RENDER_ORDER.indexOf(a);
      const bi = RENDER_ORDER.indexOf(b);
      return (ai === -1 ? RENDER_ORDER.length : ai) - (bi === -1 ? RENDER_ORDER.length : bi);
    })
    .map(([category, detections]) => ({
      category,
      detections,
      instruction: instructionFor(session, category, detections),
    }));
}

/** Flat instruction list — used by the PDF and the version record. */
export function buildInstructions(session: SessionData): string[] {
  return planPasses(session).map((pass) => pass.instruction);
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
   * Renders the confirmed selections against the active photo, one masked pass
   * per product category.
   *
   * Sequential rather than one combined call because the image API takes a
   * single mask: rendering each category against a mask of only its own
   * polygons is what keeps a siding colour off the roof. Each pass feeds its
   * result to the next, and each is its own request — which also keeps every
   * call inside the serverless function's 60s ceiling.
   *
   * `only` restricts the run to specific categories, used by per-area re-render.
   */
  const runGen = useCallback(async (versionName: string, only?: string[]) => {
    const current = sessionRef.current;
    const photo = current.photos.find((p) => p.id === current.activePhotoId);

    if (!photo) {
      flash('Take or choose a photo first — there is nothing to render.');
      return;
    }

    const all = planPasses(current);
    const passes = only?.length ? all.filter((p) => only.includes(p.category)) : all;
    if (!passes.length) {
      flash('Confirm at least one area on the photo before rendering.');
      return;
    }

    stopGeneration();
    patch({ generating: true, genStage: 0, stages: passes.map((p) => `Applying ${p.category.toLowerCase()}`) });

    const controller = new AbortController();
    abort.current = controller;

    // Whatever has rendered so far. On a mid-sequence failure this is still a
    // real improvement on the original photo, so it is saved rather than lost.
    let base: Blob | null = null;
    const applied: string[] = [];
    let failure = '';

    try {
      const source = await getBlob(photo.storagePath);
      if (!source) throw new Error('That photo is no longer on this tablet.');
      base = source;

      for (const [index, pass] of passes.entries()) {
        if (controller.signal.aborted) return;
        patch({ genStage: index });

        const maskBlob = await polygonMask(
          photo.width,
          photo.height,
          pass.detections.map((d) => d.polygon),
        );

        try {
          const result = await generateVisualization(
            await blobToDataUrl(base),
            [pass.instruction],
            controller.signal,
            await blobToDataUrl(maskBlob),
          );
          if (controller.signal.aborted) return;
          base = await (await fetch(result)).blob();
          applied.push(pass.category);
        } catch (err) {
          if (controller.signal.aborted) return;
          failure = err instanceof Error ? err.message : String(err);
          break;
        }
      }

      if (!applied.length) {
        patch({ generating: false, genStage: -1 });
        flash(failure || 'The render failed.');
        return;
      }

      const meta = applied
        .map((category) => resolveSelection(current, category).color)
        .filter(Boolean)
        .join(' / ');

      const version = await sessionActions.addVersion({
        name: versionName,
        meta: meta || applied.join(', '),
        instructions: passes.filter((p) => applied.includes(p.category)).map((p) => p.instruction),
        blob: base!,
      });

      patch({ generating: false, genStage: -1, activeVersionId: version.id });
      flash(
        failure
          ? `Saved with ${applied.join(', ').toLowerCase()} applied — ${passes.length - applied.length} step(s) failed: ${failure}`
          : `${versionName} saved to this project.`,
      );
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
