import { useEffect, useRef, useState } from 'react';
import { INK, PAPER, STEEL } from '../data';
import { detectSurfaces } from '../api';
import { getBlob } from '../lib/db';
import { blobToDataUrl } from '../lib/image';
import type { Detection } from '../lib/types';
import type { SessionActions, SessionData } from '../session';
import type { Actions, State } from '../store';

function toPoints(polygon: { x: number; y: number }[]): string {
  return polygon.map((p) => `${(p.x * 100).toFixed(2)},${(p.y * 100).toFixed(2)}`).join(' ');
}

/** Label anchor: the topmost point, so the tag sits above the shape. */
function anchor(polygon: { x: number; y: number }[]) {
  const top = polygon.reduce((a, b) => (b.y < a.y ? b : a), polygon[0]);
  return { left: `${top.x * 100}%`, top: `${top.y * 100}%` };
}

export function Areas({
  state,
  session,
  sessionActions,
  actions,
}: {
  state: State;
  session: SessionData;
  sessionActions: SessionActions;
  actions: Actions;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const abort = useRef<AbortController>(undefined);

  const photo = session.photos.find((p) => p.id === session.activePhotoId) ?? null;
  const url = photo ? session.urls[photo.storagePath] : null;
  const confirmed = session.detections.filter((d) => d.selected);

  useEffect(() => () => abort.current?.abort(), []);

  const detect = async () => {
    if (!photo) return;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    actions.patch({ detecting: true });
    try {
      const blob = await getBlob(photo.storagePath);
      if (!blob) throw new Error('That photo is no longer on this tablet.');
      const surfaces = await detectSurfaces(await blobToDataUrl(blob), controller.signal);
      if (controller.signal.aborted) return;

      if (!surfaces.length) {
        actions.flash('Nothing recognisable found. Draw the areas by hand.');
      } else {
        await sessionActions.setDetections(
          surfaces.map((s) => ({
            category: s.category,
            label: s.label,
            polygon: s.polygon,
            approxSqft: s.approxSqft,
            confidence: s.confidence,
            source: 'auto' as const,
            selected: true,
          })),
        );
        actions.flash(`${surfaces.length} area${surfaces.length === 1 ? '' : 's'} found. Check them before rendering.`);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      actions.flash(err instanceof Error ? err.message : 'Detection failed.');
    } finally {
      if (!controller.signal.aborted) actions.patch({ detecting: false });
      abort.current = undefined;
    }
  };

  const toggle = (detection: Detection) => {
    void sessionActions.updateDetection({ ...detection, selected: !detection.selected });
  };

  return (
    <section style={{ height: '100%', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 344px' }}>
      <div style={{ minWidth: 0, background: 'var(--color-accent-900)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', color: '#f2f2f3' }}>
          <button
            onClick={() => void detect()}
            disabled={!photo || state.detecting}
            className="btn btn-primary"
            style={{ height: 44, padding: '0 18px', opacity: photo && !state.detecting ? 1 : .5 }}
          >
            {state.detecting ? 'Looking at the photo…' : session.detections.length ? 'Detect again' : 'Detect areas'}
          </button>
          <div style={{ marginLeft: 'auto', fontSize: 13, color: 'rgba(242,242,243,.7)' }}>
            {session.detections.length
              ? `${session.detections.length} found · ${confirmed.length} confirmed`
              : 'No areas yet'}
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, display: 'grid', placeItems: 'center', padding: '0 16px 16px' }}>
          {url ? (
            <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%', lineHeight: 0 }}>
              <img src={url} alt={photo?.label ?? 'Elevation'} style={{ maxWidth: '100%', maxHeight: '68vh', objectFit: 'contain', display: 'block' }} />

              {/* preserveAspectRatio="none" makes the 0..1 coordinate space map
                  exactly onto the rendered image box at any size. */}
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
              >
                {session.detections.map((d) => (
                  <polygon
                    key={d.id}
                    points={toPoints(d.polygon)}
                    onClick={() => toggle(d)}
                    style={{
                      cursor: 'pointer',
                      fill: d.selected ? 'rgba(89,128,166,.28)' : 'rgba(242,242,243,.08)',
                      stroke: d.id === activeId ? '#fff' : d.selected ? PAPER : 'rgba(242,242,243,.7)',
                      strokeWidth: d.id === activeId ? 0.9 : 0.5,
                      strokeDasharray: d.selected ? undefined : '1.5 1',
                      vectorEffect: 'non-scaling-stroke',
                    }}
                  />
                ))}
              </svg>

              {session.detections.map((d) => (
                <span
                  key={d.id}
                  onClick={() => toggle(d)}
                  style={{
                    position: 'absolute',
                    ...anchor(d.polygon),
                    transform: 'translate(-2px, -100%)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 8px',
                    background: d.selected ? PAPER : 'rgba(29,45,61,.85)',
                    color: d.selected ? INK : PAPER,
                    fontFamily: 'var(--font-body)',
                    fontSize: 11.5,
                    letterSpacing: '.08em',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.4,
                  }}
                >
                  <span>{d.selected ? '✓' : '+'}</span>
                  <span>{d.label}</span>
                </span>
              ))}
            </div>
          ) : (
            <div style={{ color: '#f2f2f3', textAlign: 'center', maxWidth: 420 }}>
              <h3 style={{ color: '#f2f2f3' }}>No photo yet</h3>
              <p style={{ opacity: .7 }}>Take a photo of the elevation first — the areas are found on that photo.</p>
              <button onClick={actions.go('photos')} className="btn btn-primary" style={{ height: 50, padding: '0 20px', marginTop: 8 }}>
                Go to photos
              </button>
            </div>
          )}
        </div>
      </div>

      <aside style={{ borderLeft: '1px solid var(--color-divider)', background: 'var(--color-neutral-100)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
        <div>
          <div style={{ fontSize: 11.5, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--color-neutral-600)' }}>Detected areas</div>
          <h3 style={{ margin: '4px 0 0' }}>Confirm what we're changing</h3>
          <p style={{ fontSize: 13.5, color: 'var(--color-neutral-700)' }}>
            Tap an outline on the photo to include or exclude it. Only confirmed areas are described to the renderer.
          </p>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          {session.detections.map((d) => (
            <button
              key={d.id}
              onClick={() => toggle(d)}
              onPointerEnter={() => setActiveId(d.id)}
              onPointerLeave={() => setActiveId(null)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', padding: '12px 14px', minHeight: 56, cursor: 'pointer', fontFamily: 'var(--font-body)', background: d.selected ? '#fff' : 'transparent', border: `1px solid ${d.id === activeId ? STEEL : 'var(--color-divider)'}` }}
            >
              <span style={{ width: 22, height: 22, flex: 'none', border: '1px solid var(--color-neutral-500)', display: 'grid', placeItems: 'center', fontSize: 12, background: d.selected ? STEEL : 'transparent', color: d.selected ? PAPER : 'var(--color-text)' }}>
                {d.selected ? '✓' : '+'}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 15 }}>{d.label}</span>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--color-neutral-600)' }}>
                  {[
                    d.category,
                    d.approxSqft ? `~${Math.round(d.approxSqft).toLocaleString()} sq ft` : null,
                    d.confidence !== null && d.confidence < 0.5 ? 'low confidence' : null,
                  ].filter(Boolean).join(' · ')}
                </span>
              </span>
            </button>
          ))}
          {!session.detections.length && (
            <p style={{ fontSize: 13.5, color: 'var(--color-neutral-600)', margin: 0, lineHeight: 1.7 }}>
              {photo
                ? 'Run “Detect areas” to find the roof, siding, windows and doors in this photo.'
                : 'Add a photo first.'}
            </p>
          )}
        </div>

        <button
          onClick={actions.go('visualizer')}
          disabled={!confirmed.length}
          className="btn btn-primary"
          style={{ marginTop: 'auto', height: 60, fontSize: 17, fontFamily: 'var(--font-heading)', letterSpacing: '.06em', textTransform: 'uppercase', justifyContent: 'center', opacity: confirmed.length ? 1 : .45 }}
        >
          Confirm areas — design
        </button>
      </aside>
    </section>
  );
}
