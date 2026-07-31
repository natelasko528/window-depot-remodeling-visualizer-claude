import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { PAPER, STEEL } from '../data';
import type { Detection, Point } from '../lib/types';

export type EditorMode = 'select' | 'draw';

const MIN_POINTS = 3;

export function toPoints(polygon: Point[]): string {
  return polygon.map((p) => `${(p.x * 100).toFixed(3)},${(p.y * 100).toFixed(3)}`).join(' ');
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Interactive overlay for the areas on a photo.
 *
 * The whole surface works in normalised 0..1 coordinates, matching what
 * detection returns and what the mask rasteriser consumes, so a hand-drawn
 * area and a detected one are the same kind of thing downstream — no separate
 * code path, and both mask identically.
 *
 * Rendered `aria-hidden`: pointer work here has no keyboard equivalent, so the
 * sidebar list beside it is the accessible control surface for the same data.
 */
export function AreaEditor({
  detections,
  mode,
  activeId,
  draft,
  onDraftChange,
  onCommitDraft,
  onToggle,
  onSelect,
  onMoveVertex,
  onDeleteVertex,
}: {
  detections: Detection[];
  mode: EditorMode;
  activeId: string | null;
  draft: Point[];
  onDraftChange: (points: Point[]) => void;
  onCommitDraft: () => void;
  onToggle: (detection: Detection) => void;
  onSelect: (id: string | null) => void;
  onMoveVertex: (id: string, index: number, point: Point) => void;
  onDeleteVertex: (id: string, index: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<{ id: string; index: number } | null>(null);

  /** Pointer position in normalised space, independent of rendered size. */
  const pointAt = useCallback((clientX: number, clientY: number): Point => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return { x: 0, y: 0 };
    return {
      x: clamp01((clientX - rect.left) / rect.width),
      y: clamp01((clientY - rect.top) / rect.height),
    };
  }, []);

  // Escape abandons an in-progress polygon; Enter closes it.
  useEffect(() => {
    if (mode !== 'draw') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDraftChange([]);
      if (e.key === 'Enter' && draft.length >= MIN_POINTS) onCommitDraft();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, draft.length, onDraftChange, onCommitDraft]);

  const onSurfaceDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (mode !== 'draw') return;
    const point = pointAt(e.clientX, e.clientY);

    // Clicking the first handle closes the shape, which is the gesture people
    // expect from every other polygon tool.
    if (draft.length >= MIN_POINTS) {
      const first = draft[0];
      if (Math.hypot(first.x - point.x, first.y - point.y) < 0.02) {
        onCommitDraft();
        return;
      }
    }
    onDraftChange([...draft, point]);
  };

  const onVertexDown = (e: ReactPointerEvent<SVGCircleElement>, id: string, index: number) => {
    e.stopPropagation();
    if (e.altKey) {
      onDeleteVertex(id, index);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging({ id, index });
  };

  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragging) return;
    onMoveVertex(dragging.id, dragging.index, pointAt(e.clientX, e.clientY));
  };

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      onPointerDown={onSurfaceDown}
      onPointerMove={onMove}
      onPointerUp={() => setDragging(null)}
      onPointerCancel={() => setDragging(null)}
      onDoubleClick={() => draft.length >= MIN_POINTS && onCommitDraft()}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        touchAction: 'none',
        cursor: mode === 'draw' ? 'crosshair' : 'default',
      }}
    >
      {detections.map((d) => {
        const active = d.id === activeId;
        return (
          <g key={d.id}>
            <polygon
              points={toPoints(d.polygon)}
              onPointerDown={(e) => {
                if (mode === 'draw') return;
                e.stopPropagation();
                onSelect(active ? null : d.id);
              }}
              onDoubleClick={(e) => { e.stopPropagation(); onToggle(d); }}
              style={{
                cursor: mode === 'draw' ? 'crosshair' : 'pointer',
                fill: d.selected ? 'rgba(89,128,166,.28)' : 'rgba(242,242,243,.08)',
                stroke: active ? '#fff' : d.selected ? PAPER : 'rgba(242,242,243,.7)',
                strokeWidth: active ? 1.1 : 0.5,
                strokeDasharray: d.selected ? undefined : '1.5 1',
                vectorEffect: 'non-scaling-stroke',
              }}
            />
            {/* Vertex handles only on the selected area, so the overlay stays
                readable when a house has eight surfaces on it. */}
            {active && mode === 'select' && d.polygon.map((p, i) => (
              <circle
                key={i}
                cx={p.x * 100}
                cy={p.y * 100}
                r={1.1}
                onPointerDown={(e) => onVertexDown(e, d.id, i)}
                style={{ fill: STEEL, stroke: '#fff', strokeWidth: 0.4, cursor: 'grab', vectorEffect: 'non-scaling-stroke' }}
              />
            ))}
          </g>
        );
      })}

      {draft.length > 0 && (
        <g>
          <polygon
            points={toPoints(draft)}
            style={{ fill: 'rgba(89,128,166,.2)', stroke: '#fff', strokeWidth: 0.8, strokeDasharray: '2 1', vectorEffect: 'non-scaling-stroke' }}
          />
          {draft.map((p, i) => (
            <circle
              key={i}
              cx={p.x * 100}
              cy={p.y * 100}
              r={i === 0 ? 1.5 : 1}
              style={{ fill: i === 0 ? '#fff' : STEEL, stroke: '#fff', strokeWidth: 0.4, vectorEffect: 'non-scaling-stroke' }}
            />
          ))}
        </g>
      )}
    </svg>
  );
}
