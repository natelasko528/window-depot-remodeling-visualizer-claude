import { describe, expect, it } from 'vitest';
import { coveredArea } from '../store';
import { referenceClause } from '../lib/reference';
import { MAX_IMAGES, MAX_REFERENCES } from '../lib/limits';
import type { Detection } from '../lib/types';

function box(size: number): Detection {
  return {
    id: crypto.randomUUID(),
    photoId: 'photo-1',
    category: 'Siding',
    label: 'Wall',
    polygon: [
      { x: 0, y: 0 }, { x: size, y: 0 }, { x: size, y: size }, { x: 0, y: size },
    ],
    approxSqft: null,
    confidence: null,
    source: 'manual',
    selected: true,
  };
}

describe('coveredArea', () => {
  it('measures a unit square as the whole photo', () => {
    expect(coveredArea([box(1)])).toBeCloseTo(1, 6);
  });

  it('sums the surfaces in a category', () => {
    expect(coveredArea([box(0.5), box(0.5)])).toBeCloseTo(0.5, 6);
  });

  it('is unsigned, so winding order cannot rank a surface below zero', () => {
    const clockwise = box(0.5);
    const counter = { ...clockwise, polygon: [...clockwise.polygon].reverse() };
    expect(coveredArea([counter])).toBeCloseTo(coveredArea([clockwise]), 6);
  });

  it('ranks the biggest surface first, which is what the slot budget spends on', () => {
    const roof = { ...box(0.6), category: 'Roofing' };
    const gutter = { ...box(0.05), category: 'Gutters, soffit & fascia' };
    const ranked = [gutter, roof].sort((a, b) => coveredArea([b]) - coveredArea([a]));
    expect(ranked[0].category).toBe('Roofing');
  });

  it('treats a degenerate polygon as no area', () => {
    expect(coveredArea([{ ...box(1), polygon: [] }])).toBe(0);
  });
});

describe('referenceClause', () => {
  it('is 1-based, matching how the prompt counts the images after the photo', () => {
    expect(referenceClause(0, 'swatch')).toContain('reference image 1');
    expect(referenceClause(3, 'swatch')).toContain('reference image 4');
  });

  it('promises texture only when the reference is real catalogue art', () => {
    expect(referenceClause(0, 'catalogue')).toContain('colour and texture');
    // A flat tile from a hex cannot show a grain, so it must not claim to.
    expect(referenceClause(0, 'swatch')).not.toContain('texture');
  });
});

describe('image budget', () => {
  it('leaves every slot but the photograph for references', () => {
    expect(MAX_REFERENCES).toBe(MAX_IMAGES - 1);
  });
});
