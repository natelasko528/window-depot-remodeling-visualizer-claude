import { useEffect, useRef, useState } from 'react';
import { AreaEditor, type EditorMode } from '../components/AreaEditor';
import { INK, PANEL, PAPER, STEEL } from '../data';
import { detectSurfaces } from '../api';
import { getBlob } from '../lib/db';
import { blobToDataUrl } from '../lib/image';
import type { Detection, Point } from '../lib/types';
import type { SessionActions, SessionData } from '../session';
import type { Actions, State } from '../store';

const CATEGORIES = Object.keys(PANEL);

/** Label anchor: the topmost point, so the tag sits above the shape. */
function anchor(polygon: Point[]) {
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
  const [mode, setMode] = useState<EditorMode>('select');
  const [draft, setDraft] = useState<Point[]>([]);
  const [draftCategory, setDraftCategory] = useState(CATEGORIES[0]);
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
      const surfaces = await detectSurfaces(await blobToDataUrl(blob), CATEGORIES, controller.signal);
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

  const commitDraft = () => {
    if (draft.length < 3) return;
    const existing = session.detections.filter((d) => d.category === draftCategory).length;
    void sessionActions.addDetection({
      category: draftCategory,
      label: `${draftCategory} area ${existing + 1}`,
      polygon: draft,
      approxSqft: null,
      confidence: null,
      source: 'manual',
      selected: true,
    });
    setDraft([]);
    actions.flash(`Added a ${draftCategory.toLowerCase()} area.`);
  };

  const moveVertex = (id: string, index: number, point: Point) => {
    const detection = session.detections.find((d) => d.id === id);
    if (!detection) return;
    const polygon = detection.polygon.map((p, i) => (i === index ? point : p));
    // Hand-adjusted from here on, whatever it started as.
    void sessionActions.updateDetection({ ...detection, polygon, source: 'manual' });
  };

  const deleteVertex = (id: string, index: number) => {
    const detection = session.detections.find((d) => d.id === id);
    if (!detection) return;
    if (detection.polygon.length <= 3) {
      actions.flash('An area needs at least three points.');
      return;
    }
    void sessionActions.updateDetection({
      ...detection,
      polygon: detection.polygon.filter((_, i) => i !== index),
      source: 'manual',
    });
  };

  const startDrawing = () => {
    setMode('draw');
    setDraft([]);
    setActiveId(null);
  };

  return (
    <section style={{ height: '100%', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 344px' }}>
      <div style={{ minWidth: 0, background: 'var(--color-accent-900)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', color: '#f2f2f3', flexWrap: 'wrap' }}>
          <button
            onClick={() => void detect()}
            disabled={!photo || state.detecting}
            className="btn btn-primary"
            style={{ height: 44, padding: '0 18px', opacity: photo && !state.detecting ? 1 : .5 }}
          >
            {state.detecting ? 'Looking at the photo…' : session.detections.length ? 'Detect again' : 'Detect areas'}
          </button>

          {mode === 'select' ? (
            <button
              onClick={startDrawing}
              disabled={!photo}
              className="btn"
              style={{ height: 44, padding: '0 16px', background: 'rgba(242,242,243,.08)', border: '1px solid rgba(242,242,243,.3)', color: PAPER, opacity: photo ? 1 : .5 }}
            >
              Draw an area
            </button>
          ) : (
            <>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(242,242,243,.75)' }}>
                Category
                <select
                  value={draftCategory}
                  onChange={(e) => setDraftCategory(e.target.value)}
                  style={{ height: 40, padding: '0 10px', background: 'rgba(242,242,243,.1)', color: PAPER, border: '1px solid rgba(242,242,243,.3)', fontFamily: 'var(--font-body)', fontSize: 13.5 }}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} style={{ color: '#1d2d3d' }}>{c}</option>
                  ))}
                </select>
              </label>
              <button
                onClick={commitDraft}
                disabled={draft.length < 3}
                className="btn btn-primary"
                style={{ height: 44, padding: '0 16px', opacity: draft.length >= 3 ? 1 : .5 }}
              >
                Finish area ({draft.length})
              </button>
              <button
                onClick={() => { setMode('select'); setDraft([]); }}
                className="btn"
                style={{ height: 44, padding: '0 16px', background: 'none', border: '1px solid rgba(242,242,243,.3)', color: PAPER }}
              >
                Done drawing
              </button>
            </>
          )}

          <div style={{ marginLeft: 'auto', fontSize: 13, color: 'rgba(242,242,243,.7)' }}>
            {mode === 'draw'
              ? 'Tap to place points · tap the first point or press Enter to close'
              : session.detections.length
                ? `${session.detections.length} found · ${confirmed.length} confirmed`
                : 'No areas yet'}
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, display: 'grid', placeItems: 'center', padding: '0 16px 16px' }}>
          {url ? (
            <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%', lineHeight: 0 }}>
              <img src={url} alt={photo?.label ?? 'Elevation'} style={{ maxWidth: '100%', maxHeight: '68vh', objectFit: 'contain', display: 'block' }} />

              <AreaEditor
                detections={session.detections}
                mode={mode}
                activeId={activeId}
                draft={draft}
                onDraftChange={setDraft}
                onCommitDraft={commitDraft}
                onToggle={toggle}
                onSelect={setActiveId}
                onMoveVertex={moveVertex}
                onDeleteVertex={deleteVertex}
              />

              {mode === 'select' && session.detections.map((d) => (
                <button
                  key={d.id}
                  onClick={() => toggle(d)}
                  aria-pressed={d.selected}
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
                    border: 0,
                    fontFamily: 'var(--font-body)',
                    fontSize: 11.5,
                    letterSpacing: '.08em',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.4,
                  }}
                >
                  <span aria-hidden="true">{d.selected ? '✓' : '+'}</span>
                  <span>{d.label}</span>
                </button>
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
          <div style={{ fontSize: 11.5, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--color-neutral-600)' }}>Areas</div>
          <h3 style={{ margin: '4px 0 0' }}>Confirm what we're changing</h3>
          <p style={{ fontSize: 13.5, color: 'var(--color-neutral-700)' }}>
            Each confirmed area is rendered on its own, masked to its own outline — so a
            siding colour cannot land on the roof.
          </p>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          {session.detections.map((d) => (
            <div
              key={d.id}
              style={{ display: 'flex', alignItems: 'stretch', border: `1px solid ${d.id === activeId ? STEEL : 'var(--color-divider)'}`, background: d.selected ? '#fff' : 'transparent' }}
            >
              <button
                onClick={() => toggle(d)}
                onFocus={() => setActiveId(d.id)}
                onPointerEnter={() => setActiveId(d.id)}
                aria-pressed={d.selected}
                style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', padding: '12px 14px', minHeight: 56, flex: 1, minWidth: 0, cursor: 'pointer', fontFamily: 'var(--font-body)', background: 'none', border: 0 }}
              >
                <span aria-hidden="true" style={{ width: 22, height: 22, flex: 'none', border: '1px solid var(--color-neutral-500)', display: 'grid', placeItems: 'center', fontSize: 12, background: d.selected ? STEEL : 'transparent', color: d.selected ? PAPER : 'var(--color-text)' }}>
                  {d.selected ? '✓' : '+'}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 15 }}>{d.label}</span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--color-neutral-600)' }}>
                    {[
                      d.category,
                      d.approxSqft ? `~${Math.round(d.approxSqft).toLocaleString()} sq ft` : null,
                      d.source === 'manual' ? 'drawn by hand' : null,
                      d.confidence !== null && d.confidence < 0.5 ? 'low confidence' : null,
                    ].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </button>
              <button
                onClick={() => void sessionActions.removeDetection(d.id)}
                aria-label={`Delete ${d.label}`}
                style={{ flex: 'none', width: 40, cursor: 'pointer', background: 'none', border: 0, borderLeft: '1px solid var(--color-divider)', fontSize: 15 }}
              >
                ×
              </button>
            </div>
          ))}
          {!session.detections.length && (
            <p style={{ fontSize: 13.5, color: 'var(--color-neutral-600)', margin: 0, lineHeight: 1.7 }}>
              {photo
                ? 'Run “Detect areas”, or draw them by hand if detection is unavailable.'
                : 'Add a photo first.'}
            </p>
          )}
        </div>

        {activeId && (
          <p style={{ fontSize: 12.5, color: 'var(--color-neutral-600)', margin: 0, lineHeight: 1.6 }}>
            Drag a point on the photo to reshape this area. Alt-click a point to remove it.
          </p>
        )}

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
