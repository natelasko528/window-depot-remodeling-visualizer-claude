/**
 * Material reference images.
 *
 * The image model has never heard of "ASCEND Alabaster" or "Endure in wood
 * laminate" — naming a product gets a plausible invention, not the material.
 * Sending the material as a reference image is what makes the render match what
 * the homeowner is actually buying.
 *
 * References carry no text. A label rendered into a swatch is liable to be
 * painted onto the house, so each reference is pure material and the prompt
 * binds it by position instead. The same caution applies to real product art:
 * prefer a clean material crop over a marketing image with a watermark.
 */

import { categorySpec } from './catalog';
import { getBlob } from './db';
import type { SessionData } from '../session';
import { resolveSelection } from '../store';

const TILE = 512;

export type MaterialReference = {
  category: string;
  /** Where the reference came from, for the toast and the version record. */
  source: 'catalogue' | 'swatch';
  blob: Blob;
};

/**
 * A flat tile of the chosen colour. Precise for solid finishes and honest about
 * its limits: it cannot express a grain or a shingle profile, which is what the
 * catalogue's real texture art is for.
 */
export async function solidTile(hex: string, size = TILE): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get a 2D canvas context.');
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, size, size);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Could not encode the swatch.');
  return blob;
}

async function fetchAsset(url: string): Promise<Blob | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return blob.type.startsWith('image/') ? blob : null;
  } catch {
    return null;
  }
}

/**
 * Builds one reference per category, preferring real catalogue art and falling
 * back to a tile of the selected colour.
 */
export async function buildReferences(
  session: SessionData,
  categories: string[],
): Promise<MaterialReference[]> {
  const references: MaterialReference[] = [];

  for (const category of categories) {
    const spec = categorySpec(category);
    if (!spec) continue;

    const { line, color } = resolveSelection(session, category);
    const swatch = spec.colors.find((c) => c.name === color);
    const productLine = spec.lines.find((l) => l.name === line);

    // An uploaded texture is stored on this tablet, so it works in a basement
    // with no signal — try it before anything that needs the network.
    if (swatch?.imagePath) {
      const blob = await getBlob(swatch.imagePath);
      if (blob) {
        references.push({ category, source: 'catalogue', blob });
        continue;
      }
    }

    // A colour-specific texture beats a generic product shot: the colour is
    // what the rep just chose, and the geometry is already in the photograph.
    const assetUrl = swatch?.image ?? productLine?.image;
    if (assetUrl) {
      const blob = await fetchAsset(assetUrl);
      if (blob) {
        references.push({ category, source: 'catalogue', blob });
        continue;
      }
    }

    if (swatch?.hex) {
      references.push({ category, source: 'swatch', blob: await solidTile(swatch.hex) });
    }
  }

  return references;
}

/**
 * The sentence fragment binding a category's instruction to its reference.
 * Ordinals are 1-based over the reference list, which the prompt describes as
 * the images following the photograph.
 */
export function referenceClause(index: number, source: MaterialReference['source']): string {
  const what = source === 'catalogue'
    ? 'The exact colour and texture to use are shown in reference image'
    : 'The exact colour to use is shown in reference image';
  return `${what} ${index + 1}.`;
}
