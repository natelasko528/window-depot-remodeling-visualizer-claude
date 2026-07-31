import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

type Transform = { scale: number; x: number; y: number };

const IDENTITY: Transform = { scale: 1, x: 0, y: 0 };
const MIN_SCALE = 1;
const MAX_SCALE = 6;

/**
 * Pan/zoom viewport for the render canvas.
 *
 * Pointer events (not touch events) so one implementation covers mouse, pen
 * and multi-touch — a tablet is the primary device but reps demo on laptops.
 * Zoom is clamped at 1x on the low end: below that the photo would float in
 * dead space, which reads as broken rather than zoomed out.
 */
export function Canvas({
  src,
  alt,
  overlay,
  onHoldChange,
  fitSignal,
}: {
  src: string;
  alt: string;
  overlay?: React.ReactNode;
  /** Fires while the user holds to compare against the original photo. */
  onHoldChange?: (holding: boolean) => void;
  /** Increment to reset the viewport from outside (the "Fit" button). */
  fitSignal?: number;
}) {
  const [t, setT] = useState<Transform>(IDENTITY);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; scale: number } | null>(null);
  const lastTap = useRef(0);
  const holdTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => setT(IDENTITY), [fitSignal, src]);

  const clamp = useCallback((next: Transform): Transform => {
    const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next.scale));
    // Keep the image covering the frame: at scale s the image may be panned by
    // at most half the overflow in each direction.
    const limit = (scale - 1) / 2;
    return {
      scale,
      x: Math.min(limit, Math.max(-limit, next.x)),
      y: Math.min(limit, Math.max(-limit, next.y)),
    };
  }, []);

  const endHold = useCallback(() => {
    clearTimeout(holdTimer.current);
    onHoldChange?.(false);
  }, [onHoldChange]);

  useEffect(() => () => clearTimeout(holdTimer.current), []);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 1) {
      const now = Date.now();
      if (now - lastTap.current < 280) {
        // Double-tap toggles between fit and 2x.
        setT((prev) => (prev.scale > 1 ? IDENTITY : clamp({ scale: 2, x: 0, y: 0 })));
        lastTap.current = 0;
      } else {
        lastTap.current = now;
        // A press that isn't a drag reveals the original underneath.
        holdTimer.current = setTimeout(() => onHoldChange?.(true), 350);
      }
    } else {
      endHold();
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(e.pointerId);
    if (!previous) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const points = [...pointers.current.values()];

    if (points.length >= 2) {
      const [a, b] = points;
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (!pinch.current) {
        pinch.current = { distance, scale: t.scale };
        return;
      }
      const ratio = distance / (pinch.current.distance || 1);
      setT((prev) => clamp({ ...prev, scale: pinch.current!.scale * ratio }));
      return;
    }

    const dx = e.clientX - previous.x;
    const dy = e.clientY - previous.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) endHold();

    const rect = e.currentTarget.getBoundingClientRect();
    setT((prev) =>
      prev.scale <= 1 ? prev : clamp({ ...prev, x: prev.x + dx / rect.width, y: prev.y + dy / rect.height }),
    );
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) endHold();
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    setT((prev) => clamp({ ...prev, scale: prev.scale * (e.deltaY < 0 ? 1.12 : 0.89) }));
  };

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      style={{
        position: 'relative',
        maxWidth: '100%',
        maxHeight: '100%',
        overflow: 'hidden',
        touchAction: 'none',
        cursor: t.scale > 1 ? 'grab' : 'default',
        lineHeight: 0,
      }}
    >
      <div
        style={{
          transform: `translate(${t.x * 100}%, ${t.y * 100}%) scale(${t.scale})`,
          transformOrigin: 'center',
          transition: pointers.current.size ? 'none' : 'transform .18s ease-out',
        }}
      >
        <img src={src} alt={alt} style={{ maxWidth: '100%', maxHeight: '62vh', objectFit: 'contain', display: 'block' }} />
        {overlay}
      </div>
    </div>
  );
}
