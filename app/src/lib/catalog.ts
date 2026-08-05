/**
 * The product catalogue, as editable data.
 *
 * It used to be a frozen constant in data.ts, which meant adding a colour or
 * correcting a price took a deploy. It is now seeded from that constant on
 * first run and owned by the rep from then on — which is also what makes
 * detection widen automatically, since the detect route builds its schema enum
 * from whatever categories exist here.
 *
 * Swatch images are stored as blobs in IndexedDB alongside photos and renders,
 * so an uploaded texture is available offline and reaches the renderer through
 * the same reference pipeline as catalogue art.
 */

import { useCallback, useEffect, useState } from 'react';
import { PANEL, type PanelOption, type PanelSpec, type ProductLine, type Swatch } from '../data';
import { getMeta, putBlob, setMeta } from './db';

export type CatalogSwatch = Swatch & {
  /** Storage path of an uploaded texture, resolved through the blob store. */
  imagePath?: string;
};

export type CatalogLine = ProductLine & {
  /** Price per `unit`, carried from the price book. */
  unitPrice?: number;
  unit?: string;
};

export type CatalogCategory = Omit<PanelSpec, 'lines' | 'colors'> & {
  lines: CatalogLine[];
  colors: CatalogSwatch[];
  /** Exterior categories are detectable on a photo; interior ones are quote-only. */
  visualizable: boolean;
};

export type Catalog = {
  categories: Record<string, CatalogCategory>;
  updatedAt: string;
};

const KEY = 'catalog';

/**
 * Interior work cannot be found on a photograph of an elevation, so it is
 * carried for quoting but kept out of detection.
 */
const INTERIOR = new Set(['Bathrooms', 'Flooring']);

export function seedCatalog(): Catalog {
  const categories: Record<string, CatalogCategory> = {};
  for (const [name, spec] of Object.entries(PANEL)) {
    categories[name] = {
      ...spec,
      lines: spec.lines.map((l) => ({ ...l })),
      colors: spec.colors.map((c) => ({ ...c })),
      visualizable: !INTERIOR.has(name),
    };
  }
  return { categories, updatedAt: new Date().toISOString() };
}

/**
 * The catalogue in memory.
 *
 * `store.ts`, `derived.ts` and `lib/reference.ts` are plain modules, not
 * components — they need the rep's catalogue synchronously, in the middle of
 * building a prompt. Reading it through a React hook would mean threading it
 * through every call site for no gain, so the loaded catalogue is cached here
 * and primed once at startup. It starts as the seed, which is what shipped
 * before this was editable, so a read before the prime is correct rather than
 * empty.
 */
let active: Catalog = seedCatalog();

export function activeCatalog(): Catalog {
  return active;
}

/** The spec for one category, or undefined if the rep deleted it. */
export function categorySpec(name: string): CatalogCategory | undefined {
  return active.categories[name];
}

export function categoryNames(): string[] {
  return Object.keys(active.categories);
}

export async function loadCatalog(): Promise<Catalog> {
  const stored = await getMeta<Catalog>(KEY);
  if (stored?.categories && Object.keys(stored.categories).length) {
    active = stored;
    return stored;
  }
  const seeded = seedCatalog();
  await setMeta(KEY, seeded);
  active = seeded;
  return seeded;
}

export function stamp(catalog: Catalog): Catalog {
  return { ...catalog, updatedAt: new Date().toISOString() };
}

/**
 * The cache is updated synchronously and the write awaited afterwards, so a
 * caller that saves again immediately — the editor does, on every keystroke —
 * builds its next version on top of this one rather than on whatever was there
 * before the write started.
 */
export async function saveCatalog(catalog: Catalog): Promise<void> {
  active = catalog;
  await setMeta(KEY, catalog);
}

/** Categories detection may return — the visualizable ones only. */
export function detectableCategories(catalog: Catalog): string[] {
  return Object.entries(catalog.categories)
    .filter(([, c]) => c.visualizable)
    .map(([name]) => name);
}

// ------------------------------------------------------------- import

/**
 * A price-book row as the older app stored it. Categories arrive in snake_case
 * (`entry_door`) and carry no colour data, so an import fills in structure and
 * pricing while leaving existing swatches untouched.
 */
export type PriceBookRow = {
  category: string;
  series: string;
  style?: string;
  unit?: string;
  unitPrice?: number;
};

const CATEGORY_LABELS: Record<string, string> = {
  windows: 'Windows',
  siding: 'Siding',
  roofing: 'Roofing',
  entry_door: 'Entry doors',
  patio_door: 'Patio doors',
  gutters: 'Gutters, soffit & fascia',
  bathroom: 'Bathrooms',
  flooring: 'Flooring',
  glass_package: 'Glass packages',
  hardware: 'Hardware',
};

export function labelForCategory(raw: string): string {
  return CATEGORY_LABELS[raw]
    ?? raw.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

/**
 * Folds price-book rows into the catalogue. Existing colours and options are
 * preserved — the price book has neither, and silently dropping a rep's
 * swatches because a pricing import ran would be the worst kind of data loss.
 */
export function mergePriceBook(catalog: Catalog, rows: PriceBookRow[]): { catalog: Catalog; added: number; updated: number } {
  const categories = { ...catalog.categories };
  let added = 0;
  let updated = 0;

  for (const row of rows) {
    if (!row?.category || !row?.series) continue;
    const name = labelForCategory(row.category);
    const existing = categories[name];

    const line: CatalogLine = {
      name: row.series,
      note: row.style ?? '',
      tier: '',
      unit: row.unit,
      unitPrice: row.unitPrice,
    };

    if (!existing) {
      categories[name] = {
        title: name,
        brand: '',
        lines: [line],
        line: line.name,
        colors: [],
        color: '',
        optionLabel: 'Options',
        options: [],
        visualizable: !INTERIOR.has(name),
      };
      added += 1;
      continue;
    }

    const at = existing.lines.findIndex((l) => l.name === row.series);
    if (at === -1) {
      existing.lines = [...existing.lines, line];
      added += 1;
    } else {
      // Keep the tier and note a rep may have written; take the price.
      existing.lines[at] = {
        ...existing.lines[at],
        unit: row.unit ?? existing.lines[at].unit,
        unitPrice: row.unitPrice ?? existing.lines[at].unitPrice,
      };
      updated += 1;
    }
    categories[name] = { ...existing };
  }

  return { catalog: { categories, updatedAt: new Date().toISOString() }, added, updated };
}

const HEADER_ALIASES: Record<string, keyof PriceBookRow> = {
  category: 'category',
  series: 'series',
  line: 'series',
  product: 'series',
  style: 'style',
  note: 'style',
  unit: 'unit',
  uom: 'unit',
  unitprice: 'unitPrice',
  price: 'unitPrice',
  unit_price: 'unitPrice',
};

/** Splits one CSV line, honouring quoted fields containing commas. */
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { cells.push(cell); cell = ''; }
    else cell += ch;
  }
  cells.push(cell);
  return cells.map((c) => c.trim());
}

/**
 * Reads a price book from whatever the rep pastes in — the JSON the older app
 * exported, or a CSV out of a spreadsheet. Header names are matched loosely
 * because "price", "unit_price" and "unitPrice" all turn up in practice.
 */
export function parsePriceBook(text: string): PriceBookRow[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    const parsed: unknown = JSON.parse(trimmed);
    const rows = Array.isArray(parsed)
      ? parsed
      : (parsed as { items?: unknown[]; rows?: unknown[] })?.items
        ?? (parsed as { rows?: unknown[] })?.rows
        ?? [];
    return (rows as Record<string, unknown>[])
      .map((r) => ({
        category: String(r.category ?? ''),
        series: String(r.series ?? r.line ?? r.product ?? ''),
        style: r.style === undefined || r.style === null ? undefined : String(r.style),
        unit: r.unit === undefined || r.unit === null ? undefined : String(r.unit),
        unitPrice: Number(r.unitPrice ?? r.unit_price ?? r.price) || undefined,
      }))
      .filter((r) => r.category && r.series);
  }

  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((h) => HEADER_ALIASES[h.toLowerCase().replace(/\s+/g, '')]);

  return lines.slice(1)
    .map((line) => {
      const cells = splitCsvLine(line);
      const row: Record<string, string> = {};
      headers.forEach((key, i) => { if (key) row[key] = cells[i] ?? ''; });
      return {
        category: row.category ?? '',
        series: row.series ?? '',
        style: row.style || undefined,
        unit: row.unit || undefined,
        unitPrice: Number(String(row.unitPrice ?? '').replace(/[^0-9.-]/g, '')) || undefined,
      };
    })
    .filter((r) => r.category && r.series);
}

/** Stores an uploaded swatch texture and returns its blob path. */
export async function storeSwatchImage(category: string, colorName: string, blob: Blob): Promise<string> {
  const slug = `${category}-${colorName}`.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const path = `catalog/${slug}-${crypto.randomUUID().slice(0, 8)}.png`;
  await putBlob(path, blob);
  return path;
}

// --------------------------------------------------------------- hook

/** A new category with enough structure that the editor has fields to fill. */
export function blankCategory(name: string): CatalogCategory {
  return {
    title: name,
    brand: '',
    lines: [{ name: 'Standard', note: '', tier: 'Good' }],
    line: 'Standard',
    colors: [{ name: 'White', hex: '#f4f2ee' }],
    color: 'White',
    optionLabel: 'Options',
    options: [],
    visualizable: !INTERIOR.has(name),
  };
}

export function useCatalog() {
  const [catalog, setCatalog] = useState<Catalog>(activeCatalog);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void loadCatalog().then((loaded) => {
      setCatalog(loaded);
      setReady(true);
    });
  }, []);

  const commit = useCallback(async (next: Catalog) => {
    const saved = stamp(next);
    setCatalog(saved);
    await saveCatalog(saved);
    return saved;
  }, []);

  const updateCategory = useCallback(async (name: string, patch: Partial<CatalogCategory>) => {
    const current = catalog.categories[name];
    if (!current) return catalog;
    return commit({
      ...catalog,
      categories: { ...catalog.categories, [name]: { ...current, ...patch } },
    });
  }, [catalog, commit]);

  const addCategory = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || catalog.categories[trimmed]) return catalog;
    return commit({
      ...catalog,
      categories: { ...catalog.categories, [trimmed]: blankCategory(trimmed) },
    });
  }, [catalog, commit]);

  const removeCategory = useCallback(async (name: string) => {
    const categories = { ...catalog.categories };
    delete categories[name];
    return commit({ ...catalog, categories });
  }, [catalog, commit]);

  const reseed = useCallback(async () => commit(seedCatalog()), [commit]);

  return { catalog, ready, commit, updateCategory, addCategory, removeCategory, reseed };
}

export type { PanelOption };
