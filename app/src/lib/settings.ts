/**
 * App configuration the rep can change without a deploy.
 *
 * Deliberately does NOT hold provider API keys. This app runs on a tablet that
 * sits on kitchen tables; a key in IndexedDB is readable by anyone holding the
 * device or opening devtools, and it bills to the account that owns it. Keys
 * stay in server-side environment variables, and the settings screen reports
 * their status through `/api/settings` without ever receiving their values.
 *
 * Every field here changes behaviour somewhere. Model names and the render size
 * are shown on that screen too, but read-only: the model is a server secret's
 * companion and the size is derived from the photo, so neither is the browser's
 * to decide.
 */

import { useCallback, useEffect, useState } from 'react';
import { getMeta, setMeta } from './db';
import { MAX_REFERENCES } from './limits';

export type Settings = {
  rep: {
    name: string;
    market: string;
    repId: string;
    phone: string;
    email: string;
  };
  render: {
    /** Client-side ceiling for a render, independent of the function timeout. */
    timeoutMs: number;
    /** How many material references may ride along, up to the API's cap. */
    maxReferences: number;
  };
  updatedAt: string;
};

export type SettingsPatch = {
  rep?: Partial<Settings['rep']>;
  render?: Partial<Settings['render']>;
};

export const TIMEOUT_BOUNDS = { min: 15_000, max: 300_000 } as const;

export const DEFAULT_SETTINGS: Settings = {
  rep: { name: '', market: '', repId: '', phone: '', email: '' },
  render: {
    timeoutMs: 180_000,
    maxReferences: MAX_REFERENCES,
  },
  updatedAt: new Date(0).toISOString(),
};

const KEY = 'settings';

function clamp(n: number, min: number, max: number, fallback: number): number {
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

/**
 * Merges stored settings over the defaults so a new field is never undefined,
 * and clamps the numbers — a hand-edited or half-synced record must not be able
 * to set a zero-millisecond timeout that aborts every render instantly.
 */
export function hydrate(stored: Partial<Settings> | undefined): Settings {
  const render = { ...DEFAULT_SETTINGS.render, ...stored?.render };
  return {
    rep: { ...DEFAULT_SETTINGS.rep, ...stored?.rep },
    render: {
      timeoutMs: clamp(Number(render.timeoutMs), TIMEOUT_BOUNDS.min, TIMEOUT_BOUNDS.max, DEFAULT_SETTINGS.render.timeoutMs),
      maxReferences: clamp(Math.round(Number(render.maxReferences)), 0, MAX_REFERENCES, MAX_REFERENCES),
    },
    updatedAt: stored?.updatedAt ?? DEFAULT_SETTINGS.updatedAt,
  };
}

/**
 * Cached for the same reason as the catalogue: `api.ts` needs the timeout while
 * assembling a request, and it is not a component.
 */
let active: Settings = DEFAULT_SETTINGS;

export function activeSettings(): Settings {
  return active;
}

export async function loadSettings(): Promise<Settings> {
  active = hydrate(await getMeta<Partial<Settings>>(KEY));
  return active;
}

/**
 * The cache is updated synchronously and the write awaited afterwards, so the
 * settings fields — which save on every keystroke — build each edit on the
 * previous one rather than on whatever was stored before the write started.
 */
export async function saveSettings(settings: Settings): Promise<Settings> {
  active = hydrate({ ...settings, updatedAt: new Date().toISOString() });
  const saved = active;
  await setMeta(KEY, saved);
  return saved;
}

/** Initials for the header badge — "Alex Reyes" becomes AR. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'WD';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(activeSettings);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void loadSettings().then((loaded) => {
      setSettings(loaded);
      setReady(true);
    });
  }, []);

  /**
   * Patches merge into the *cached* settings, not into the copy this component
   * rendered with. A field that saves on every keystroke would otherwise build
   * each edit on a snapshot taken before the previous write resolved, and drop
   * characters typed quickly.
   */
  const update = useCallback(async (patch: SettingsPatch) => {
    const base = activeSettings();
    const next = hydrate({
      rep: { ...base.rep, ...patch.rep },
      render: { ...base.render, ...patch.render },
      updatedAt: new Date().toISOString(),
    });
    setSettings(next);
    await saveSettings(next);
    return next;
  }, []);

  const reset = useCallback(async () => {
    const cleared = await saveSettings(DEFAULT_SETTINGS);
    setSettings(cleared);
  }, []);

  return { settings, ready, update, reset };
}

// ------------------------------------------------------------ key status

export type ProviderStatus = {
  /** Whether the server has a usable key. Never the key itself. */
  configured: boolean;
  /** Last four characters, so a rep can tell which key is loaded. */
  hint: string | null;
  model: string | null;
};

export type ServerStatus = {
  render: ProviderStatus;
  detect: ProviderStatus;
  /** How the output size is decided; informational, not a knob. */
  imageSize: string;
  /** The server's own render budget, which caps the client's. */
  timeoutMs: number;
};

export async function fetchServerStatus(): Promise<ServerStatus | null> {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return null;
    return (await res.json()) as ServerStatus;
  } catch {
    return null;
  }
}

export type TestResult = { ok: boolean; message: string };

/** Asks the server to make a real, free call against a provider. */
export async function testProvider(provider: 'render' | 'detect'): Promise<TestResult> {
  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ test: provider }),
    });
    const payload = await res.json().catch(() => null);
    return {
      ok: res.ok && payload?.ok === true,
      message: payload?.message || `The server returned ${res.status}.`,
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'The check could not be run.' };
  }
}
