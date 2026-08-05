import { describe, expect, it } from 'vitest';
import {
  detectableCategories,
  labelForCategory,
  mergePriceBook,
  parsePriceBook,
  seedCatalog,
  type Catalog,
} from '../lib/catalog';
import { PANEL } from '../data';

describe('seedCatalog', () => {
  it('starts as exactly what the app shipped with', () => {
    const catalog = seedCatalog();
    expect(Object.keys(catalog.categories)).toEqual(Object.keys(PANEL));
    expect(catalog.categories.Siding.colors).toEqual(PANEL.Siding.colors);
  });

  it('copies rather than aliases, so editing the catalogue cannot mutate the constant', () => {
    const catalog = seedCatalog();
    catalog.categories.Siding.colors[0].name = 'Changed';
    expect(PANEL.Siding.colors[0].name).toBe('Alabaster');
  });
});

describe('detectableCategories', () => {
  it('offers every exterior category to the vision model', () => {
    expect(detectableCategories(seedCatalog())).toEqual(Object.keys(PANEL));
  });

  it('withholds interior work, which cannot be found on a photo of an elevation', () => {
    const catalog = seedCatalog();
    const { catalog: withBath } = mergePriceBook(catalog, [{ category: 'bathroom', series: 'Samuel Mueller' }]);
    expect(Object.keys(withBath.categories)).toContain('Bathrooms');
    expect(detectableCategories(withBath)).not.toContain('Bathrooms');
  });
});

describe('labelForCategory', () => {
  it('translates the older app’s snake_case keys', () => {
    expect(labelForCategory('entry_door')).toBe('Entry doors');
    expect(labelForCategory('gutters')).toBe('Gutters, soffit & fascia');
  });

  it('makes something readable out of a key it has never seen', () => {
    expect(labelForCategory('garage_door')).toBe('Garage door');
  });
});

describe('mergePriceBook', () => {
  const catalog = (): Catalog => seedCatalog();

  it('prices an existing line without disturbing it', () => {
    const before = catalog();
    const { catalog: after, updated } = mergePriceBook(before, [
      { category: 'siding', series: 'ASCEND Composite Cladding', unit: 'sq ft', unitPrice: 18.4 },
    ]);
    const line = after.categories.Siding.lines.find((l) => l.name === 'ASCEND Composite Cladding');
    expect(updated).toBe(1);
    expect(line?.unitPrice).toBe(18.4);
    // The note and tier a rep reads out loud are not in the price book, and
    // must survive an import that has nothing to say about them.
    expect(line?.note).toBe(PANEL.Siding.lines[2].note);
    expect(line?.tier).toBe('Best');
  });

  it('never drops colours — a pricing import must not delete a rep’s swatches', () => {
    const { catalog: after } = mergePriceBook(catalog(), [
      { category: 'siding', series: 'A line that did not exist', unitPrice: 9 },
    ]);
    expect(after.categories.Siding.colors).toHaveLength(PANEL.Siding.colors.length);
  });

  it('adds a category the app did not know about', () => {
    const { catalog: after, added } = mergePriceBook(catalog(), [
      { category: 'entry_door', series: 'Signet', unit: 'each', unitPrice: 3200 },
    ]);
    expect(added).toBe(1);
    expect(after.categories['Entry doors'].lines[0].unitPrice).toBe(3200);
  });

  it('ignores rows with nothing to key on rather than creating a blank category', () => {
    const { catalog: after, added, updated } = mergePriceBook(catalog(), [
      { category: '', series: 'Orphan' },
      { category: 'siding', series: '' },
    ]);
    expect([added, updated]).toEqual([0, 0]);
    expect(Object.keys(after.categories)).toEqual(Object.keys(PANEL));
  });
});

describe('parsePriceBook', () => {
  it('reads a CSV out of a spreadsheet', () => {
    const rows = parsePriceBook('category,series,unit,unitPrice\nwindows,Endure,each,742.00');
    expect(rows).toEqual([{ category: 'windows', series: 'Endure', style: undefined, unit: 'each', unitPrice: 742 }]);
  });

  it('accepts the header names people actually use', () => {
    const rows = parsePriceBook('Category,Line,UOM,Price\nsiding,ASCEND,sq ft,$18.40');
    expect(rows[0].series).toBe('ASCEND');
    expect(rows[0].unit).toBe('sq ft');
    expect(rows[0].unitPrice).toBe(18.4);
  });

  it('keeps a quoted comma inside its own cell', () => {
    const rows = parsePriceBook('category,series,style\ngutters,"6"" K-style, seamless",Oversize');
    expect(rows[0].series).toBe('6" K-style, seamless');
    expect(rows[0].style).toBe('Oversize');
  });

  it('reads the JSON the older app exported, wrapped or bare', () => {
    expect(parsePriceBook('[{"category":"roofing","series":"Landmark"}]')).toHaveLength(1);
    expect(parsePriceBook('{"items":[{"category":"roofing","series":"Landmark"}]}')).toHaveLength(1);
  });

  it('returns nothing for an empty paste instead of throwing', () => {
    expect(parsePriceBook('   ')).toEqual([]);
    expect(parsePriceBook('category,series')).toEqual([]);
  });
});
