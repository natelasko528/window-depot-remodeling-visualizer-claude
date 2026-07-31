import { describe, expect, it } from 'vitest';
import { buildInstructions, instructionFor, planPasses, resolveSelection } from '../store';
import { selectionsFor } from '../derived';
import { PANEL } from '../data';
import type { SessionData } from '../session';
import type { Detection } from '../lib/types';

const square = [
  { x: 0.1, y: 0.1 }, { x: 0.9, y: 0.1 }, { x: 0.9, y: 0.9 }, { x: 0.1, y: 0.9 },
];

function detection(over: Partial<Detection> = {}): Detection {
  return {
    id: over.id ?? crypto.randomUUID(),
    photoId: 'photo-1',
    category: 'Siding',
    label: 'Rear wall',
    polygon: square,
    approxSqft: null,
    confidence: 0.9,
    source: 'auto',
    selected: true,
    ...over,
  };
}

function session(over: Partial<SessionData> = {}): SessionData {
  return {
    customer: null, project: null, photos: [], activePhotoId: 'photo-1',
    detections: [], selections: [], versions: [], urls: {}, loading: false,
    ...over,
  };
}

describe('planPasses', () => {
  it('makes one pass per category, not one per surface', () => {
    const passes = planPasses(session({
      detections: [
        detection({ category: 'Siding', label: 'Rear wall' }),
        detection({ category: 'Siding', label: 'Second story' }),
        detection({ category: 'Roofing', label: 'Garage roof' }),
      ],
    }));

    expect(passes.map((p) => p.category)).toEqual(['Roofing', 'Siding']);
    expect(passes.find((p) => p.category === 'Siding')!.detections).toHaveLength(2);
  });

  it('renders big background surfaces before the openings on top of them', () => {
    const passes = planPasses(session({
      detections: [
        detection({ category: 'Patio doors', label: 'Slider' }),
        detection({ category: 'Windows', label: 'Garage windows' }),
        detection({ category: 'Roofing', label: 'Main roof' }),
        detection({ category: 'Siding', label: 'Rear wall' }),
      ],
    }));

    expect(passes.map((p) => p.category)).toEqual(['Roofing', 'Siding', 'Windows', 'Patio doors']);
  });

  it('drops unconfirmed areas', () => {
    const passes = planPasses(session({
      detections: [
        detection({ category: 'Roofing', selected: false }),
        detection({ category: 'Siding', selected: true }),
      ],
    }));
    expect(passes.map((p) => p.category)).toEqual(['Siding']);
  });

  it('drops a category the catalogue cannot price rather than rendering nothing for it', () => {
    const passes = planPasses(session({
      detections: [
        detection({ category: 'Bathrooms', label: 'Ensuite' }),
        detection({ category: 'Siding' }),
      ],
    }));
    expect(passes.map((p) => p.category)).toEqual(['Siding']);
  });

  it('drops a degenerate polygon that would mask nothing', () => {
    expect(planPasses(session({ detections: [detection({ polygon: [] })] }))).toHaveLength(0);
  });

  it('names every surface in the category in its instruction', () => {
    const [pass] = planPasses(session({
      detections: [
        detection({ category: 'Siding', label: 'Rear wall' }),
        detection({ category: 'Siding', label: 'Second story' }),
      ],
    }));
    expect(pass.instruction).toContain('rear wall and second story');
  });

  it('buildInstructions stays in step with the passes', () => {
    const data = session({
      detections: [detection({ category: 'Roofing' }), detection({ category: 'Siding' })],
    });
    expect(buildInstructions(data)).toEqual(planPasses(data).map((p) => p.instruction));
  });
});

describe('resolveSelection', () => {
  it('prefers the rep’s choice over the catalogue default', () => {
    const data = session({
      selections: [{ id: 's1', projectId: 'p', category: 'Siding', line: 'Custom line', color: 'Sage', options: {} }],
    });
    expect(resolveSelection(data, 'Siding')).toEqual({ line: 'Custom line', color: 'Sage' });
  });

  it('falls back to the catalogue default', () => {
    expect(resolveSelection(session(), 'Siding')).toEqual({
      line: PANEL.Siding.line,
      color: PANEL.Siding.color,
    });
  });

  it('does not throw for a category with no catalogue entry', () => {
    expect(resolveSelection(session(), 'Nonexistent')).toEqual({ line: '', color: '' });
  });
});

describe('instructionFor', () => {
  it('does not repeat the brand when the line already carries it', () => {
    const data = session({
      selections: [{ id: 's', projectId: 'p', category: 'Siding', line: 'CertainTeed MainStreet', color: 'Sage', options: {} }],
    });
    const text = instructionFor(data, 'Siding', [detection()]);
    expect(text.match(/CertainTeed/g)).toHaveLength(1);
  });
});

describe('selectionsFor', () => {
  it('marks a chosen category with no confirmed area as quoted-only', () => {
    const rows = selectionsFor(session({
      selections: [{ id: 's', projectId: 'p', category: 'Windows', line: 'Endure', color: 'White', options: {} }],
    }));
    expect(rows.find((r) => r.cat === 'Windows')!.where).toBe('Quoted, not visualized');
  });

  it('lists where a category was actually confirmed', () => {
    const rows = selectionsFor(session({
      detections: [detection({ category: 'Siding', label: 'Rear wall' })],
    }));
    expect(rows.find((r) => r.cat === 'Siding')!.where).toBe('Rear wall');
  });
});
