import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { AFTER, AREAS, BEFORE, GEN_STAGES, OPTION_B_FILTER, PANEL } from './data';
import { fetchAsDataUrl, generateVisualization } from './api';

export type Screen =
  | 'home' | 'customers' | 'setup' | 'photos' | 'areas'
  | 'visualizer' | 'compare' | 'selections' | 'summary' | 'library';

export type VersionId = 'A' | 'B';

export type Version = {
  id: VersionId;
  name: string;
  meta: string;
  image: string;
  filter: string;
  simulated: boolean;
};

export type CompareMode = 'original' | 'slider' | 'side';

export type State = {
  screen: Screen;
  cats: string[];
  areas: string[];
  areaId: string;
  tool: string;
  panelTab: string;
  picks: Record<string, string>;
  lines: Record<string, string>;
  versions: Version[];
  activeVersion: VersionId | null;
  genStage: number;
  generating: boolean;
  compare: CompareMode;
  sliderPct: number;
  dragging: boolean;
  favorite: VersionId | null;
  presenting: boolean;
  sheet: boolean;
  offline: boolean;
  advanced: boolean;
  toast: string;
  vw: number;
};

const INITIAL: State = {
  screen: 'home',
  cats: ['Roofing', 'Siding', 'Patio doors'],
  areas: ['roof-awning', 'roof-main', 'siding-right', 'siding-upper', 'door-patio'],
  areaId: 'siding-right',
  tool: 'Select',
  panelTab: 'Siding',
  picks: { Roofing: 'Weathered Wood', Siding: 'Alabaster', 'Patio doors': 'White', Windows: 'White', 'Gutters, soffit & fascia': 'White' },
  lines: {},
  versions: [],
  activeVersion: null,
  genStage: -1,
  generating: false,
  compare: 'slider',
  sliderPct: 52,
  dragging: false,
  favorite: null,
  presenting: false,
  sheet: false,
  offline: false,
  advanced: false,
  toast: '',
  vw: typeof window === 'undefined' ? 1366 : window.innerWidth,
};

const VERSION_META: Record<VersionId, { name: string; meta: string; filter: string }> = {
  A: { name: 'Option A', meta: 'Alabaster / Weathered Wood', filter: 'none' },
  B: { name: 'Option B', meta: 'Sandcastle / Moiré Black', filter: OPTION_B_FILTER },
};

function chosenLine(state: State, key: string) {
  return state.lines[key] || PANEL[key].line;
}

export function buildInstructions(state: State): string[] {
  const byCategory = new Map<string, string[]>();
  for (const area of AREAS) {
    if (!state.areas.includes(area.id) || !PANEL[area.cat]) continue;
    const list = byCategory.get(area.cat) ?? [];
    list.push(area.name.toLowerCase());
    byCategory.set(area.cat, list);
  }
  return [...byCategory].map(([cat, places]) => {
    const spec = PANEL[cat];
    const line = chosenLine(state, cat);
    const product = line.startsWith(spec.brand) ? line : `${spec.brand} ${line}`;
    const color = state.picks[cat] || spec.color;
    const detail = spec.options.map((o) => `${o.label}: ${o.value}`).join('; ');
    return `${cat} on the ${places.join(' and ')} — ${product} in ${color} (${detail}).`;
  });
}

export function useVisualizer() {
  const [state, setState] = useState<State>(INITIAL);
  const stateRef = useRef(state);
  stateRef.current = state;

  const patch = useCallback((next: Partial<State>) => setState((prev) => ({ ...prev, ...next })), []);

  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const stageTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abort = useRef<AbortController>(undefined);

  const flash = useCallback((toast: string) => {
    clearTimeout(toastTimer.current);
    patch({ toast });
    toastTimer.current = setTimeout(() => patch({ toast: '' }), 3200);
  }, [patch]);

  useEffect(() => {
    const onResize = () => patch({ vw: window.innerWidth });
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      clearTimeout(toastTimer.current);
      clearTimeout(stageTimer.current);
      abort.current?.abort();
    };
  }, [patch]);

  const go = useCallback((screen: Screen) => () => patch({ screen, presenting: false }), [patch]);

  const stopGeneration = useCallback(() => {
    clearTimeout(stageTimer.current);
    abort.current?.abort();
    abort.current = undefined;
  }, []);

  const runGen = useCallback(async (versionId: VersionId) => {
    const meta = VERSION_META[versionId];
    stopGeneration();
    patch({ generating: true, genStage: 0 });

    const advance = (i: number) => {
      stageTimer.current = setTimeout(() => {
        if (!stateRef.current.generating) return;
        if (i < GEN_STAGES.length - 1) {
          patch({ genStage: i });
          advance(i + 1);
        } else {
          patch({ genStage: GEN_STAGES.length - 1 });
        }
      }, i === 1 ? 500 : 850);
    };
    advance(1);

    const controller = new AbortController();
    abort.current = controller;

    let image = AFTER;
    let simulated = true;
    let note = '';
    try {
      const source = await fetchAsDataUrl(BEFORE);
      image = await generateVisualization(source, buildInstructions(stateRef.current), controller.signal);
      simulated = false;
    } catch (err) {
      if (controller.signal.aborted) return;
      note = err instanceof Error ? err.message : String(err);
    }

    if (controller.signal.aborted) return;
    clearTimeout(stageTimer.current);
    abort.current = undefined;

    const version: Version = {
      id: versionId,
      name: meta.name,
      meta: meta.meta,
      image,
      filter: simulated ? meta.filter : 'none',
      simulated,
    };
    setState((prev) => ({
      ...prev,
      generating: false,
      genStage: -1,
      versions: prev.versions.filter((v) => v.id !== versionId).concat([version]),
      activeVersion: versionId,
    }));
    if (simulated) flash(`Live render unavailable — showing the saved ${meta.name} preview. (${note})`);
    else flash(versionId === 'B' ? 'Option B saved. Compare is ready.' : 'Option A saved to this project.');
  }, [flash, patch, stopGeneration]);

  const cancelGen = useCallback(() => {
    stopGeneration();
    patch({ generating: false, genStage: -1 });
    flash('Cancelled. Your selections are untouched.');
  }, [flash, patch, stopGeneration]);

  const duplicateVersion = useCallback(() => {
    const s = stateRef.current;
    if (!s.versions.length) {
      flash('Generate Option A first, then duplicate it to try another color.');
      return;
    }
    setState((prev) => ({ ...prev, picks: { ...prev.picks, Siding: 'Sandcastle', Roofing: 'Moiré Black' } }));
    void runGen('B');
  }, [flash, runGen]);

  const setFavorite = useCallback((id: VersionId, message: string) => {
    patch({ favorite: id });
    flash(message);
  }, [flash, patch]);

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
    const area = AREAS.find((a) => a.id === state.areaId);
    const key = state.panelTab || area?.cat || 'Siding';
    return PANEL[key] ? key : 'Siding';
  }, [state.areaId, state.panelTab]);

  const actions = useMemo(() => ({
    patch,
    flash,
    go,
    runGen,
    cancelGen,
    duplicateVersion,
    setFavorite,
    slider,
    noop: () => flash('Prototype — this control is illustrative.'),
    toggleCategory: (name: string) => setState((prev) => ({
      ...prev,
      cats: prev.cats.includes(name) ? prev.cats.filter((c) => c !== name) : prev.cats.concat([name]),
    })),
    pickArea: (id: string) => setState((prev) => {
      const area = AREAS.find((a) => a.id === id)!;
      const on = prev.areas.includes(id);
      return {
        ...prev,
        areaId: id,
        panelTab: PANEL[area.cat] ? area.cat : prev.panelTab,
        areas: on && prev.screen === 'areas' ? prev.areas.filter((x) => x !== id) : (on ? prev.areas : prev.areas.concat([id])),
      };
    }),
    pickLine: (key: string, name: string) => setState((prev) => ({ ...prev, lines: { ...prev.lines, [key]: name } })),
    pickColor: (key: string, name: string) => setState((prev) => ({ ...prev, picks: { ...prev.picks, [key]: name } })),
    toggleOffline: () => {
      const offline = !stateRef.current.offline;
      patch({ offline, sheet: false });
      flash(offline ? 'Offline. Work continues on this tablet.' : 'Back online. Queued changes uploaded.');
    },
  }), [cancelGen, duplicateVersion, flash, go, patch, runGen, setFavorite, slider]);

  return { state, actions, activePanelKey };
}

export type Actions = ReturnType<typeof useVisualizer>['actions'];
