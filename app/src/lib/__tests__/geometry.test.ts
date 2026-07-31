import { describe, expect, it } from 'vitest';
import { coverCrop, nearestRenderSize } from '../image';

/**
 * These two functions decide the render space. Every mask, base image and
 * rendered result share it, so a regression here silently misaligns overlays
 * or breaks the second pass of a per-category render.
 */
describe('nearestRenderSize', () => {
  it('picks landscape for a 4:3 photo', () => {
    expect(nearestRenderSize(4032, 3024)).toEqual({ width: 1536, height: 1024 });
  });

  it('picks landscape for 16:9', () => {
    expect(nearestRenderSize(1920, 1080)).toEqual({ width: 1536, height: 1024 });
  });

  it('picks portrait for a phone held upright', () => {
    expect(nearestRenderSize(3024, 4032)).toEqual({ width: 1024, height: 1536 });
  });

  it('picks square for a square photo', () => {
    expect(nearestRenderSize(2000, 2000)).toEqual({ width: 1024, height: 1024 });
  });

  it('always returns a size the image API supports', () => {
    const supported = ['1024x1024', '1536x1024', '1024x1536'];
    for (const [w, h] of [[100, 3000], [3000, 100], [1, 1], [1600, 1200]]) {
      const size = nearestRenderSize(w, h);
      expect(supported).toContain(`${size.width}x${size.height}`);
    }
  });
});

describe('coverCrop', () => {
  it('fills the target without letterboxing', () => {
    const crop = coverCrop({ width: 4032, height: 3024 }, { width: 1536, height: 1024 });
    // 4:3 source into 3:2 target crops the top and bottom, never the sides.
    expect(crop.sx).toBe(0);
    expect(crop.sWidth).toBe(4032);
    expect(crop.sy).toBeGreaterThan(0);
    expect(crop.sHeight).toBeLessThan(3024);
  });

  it('centres what it removes', () => {
    const source = { width: 2000, height: 1000 };
    const crop = coverCrop(source, { width: 1024, height: 1024 });
    expect(crop.sy).toBe(0);
    expect(crop.sx).toBeCloseTo((source.width - crop.sWidth) / 2, 6);
  });

  it('is a no-op when the aspect already matches', () => {
    const crop = coverCrop({ width: 3072, height: 2048 }, { width: 1536, height: 1024 });
    expect(crop).toMatchObject({ sx: 0, sy: 0, sWidth: 3072, sHeight: 2048 });
  });

  it('keeps the cropped region inside the source', () => {
    for (const source of [{ width: 800, height: 2400 }, { width: 2400, height: 800 }]) {
      for (const target of [{ width: 1024, height: 1024 }, { width: 1536, height: 1024 }]) {
        const crop = coverCrop(source, target);
        expect(crop.sx).toBeGreaterThanOrEqual(0);
        expect(crop.sy).toBeGreaterThanOrEqual(0);
        expect(crop.sx + crop.sWidth).toBeLessThanOrEqual(source.width + 1e-6);
        expect(crop.sy + crop.sHeight).toBeLessThanOrEqual(source.height + 1e-6);
      }
    }
  });
});
