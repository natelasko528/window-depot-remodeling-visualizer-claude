import { categorySpec } from './lib/catalog';
import { resolveSelection } from './store';
import type { SessionData } from './session';
import type { Version } from './lib/types';

export type SelectionRow = {
  cat: string;
  line: string;
  config: string;
  color: string;
  hex: string;
  where: string;
  version: string;
  /** From the price book, when the catalogue carries one for this line. */
  price: string;
};

/** "$18.40 / sq ft", or empty when the line has no price on file. */
export function priceLabel(unitPrice: number | undefined, unit: string | undefined): string {
  if (typeof unitPrice !== 'number' || !Number.isFinite(unitPrice)) return '';
  const amount = unitPrice.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  return unit ? `${amount} / ${unit}` : amount;
}

/**
 * The quote-facing selection list.
 *
 * Built from the surfaces actually detected on the active photo, so it cannot
 * claim the homeowner is buying siding for a wall that was never in frame —
 * which the hardcoded version did by construction.
 */
export function selectionsFor(session: SessionData): SelectionRow[] {
  const favorite = session.versions.find((v) => v.isFavorite);

  const places = new Map<string, string[]>();
  for (const d of session.detections) {
    if (!d.selected) continue;
    const list = places.get(d.category) ?? [];
    list.push(d.label);
    places.set(d.category, list);
  }

  // A category belongs in the quote if it was seen on the photo, or the rep
  // explicitly chose products for it.
  const categories = new Set<string>([
    ...places.keys(),
    ...session.selections.map((s) => s.category),
  ]);

  return [...categories]
    .filter((cat) => categorySpec(cat))
    .map((cat) => {
      const spec = categorySpec(cat)!;
      const { line, color } = resolveSelection(session, cat);
      const chosen = spec.lines.find((l) => l.name === line);
      return {
        cat,
        line: !spec.brand || line.startsWith(spec.brand) ? line : `${spec.brand} ${line}`,
        config: spec.options.map((o) => `${o.label}: ${o.value}`).join(', '),
        color,
        hex: spec.colors.find((c) => c.name === color)?.hex ?? '#f4f2ee',
        where: places.get(cat)?.join(', ') ?? 'Quoted, not visualized',
        version: favorite ? favorite.name : session.versions.length ? 'All versions' : 'Not visualized',
        price: priceLabel(chosen?.unitPrice, chosen?.unit),
      };
    });
}

export function favoriteVersion(session: SessionData): Version | null {
  return (
    session.versions.find((v) => v.isFavorite)
    ?? session.versions[session.versions.length - 1]
    ?? null
  );
}

export function favName(session: SessionData): string {
  const version = favoriteVersion(session);
  return version ? `${version.name} — ${version.meta}` : 'No version rendered yet';
}
