import { useState } from 'react';
import { Canvas } from '../components/Canvas';
import { GEN_STAGES, GRAIN, INK, PANEL, PAPER, STEEL } from '../data';
import * as repo from '../lib/repo';
import { resolveSelection } from '../store';
import type { SessionActions, SessionData } from '../session';
import type { Actions, State } from '../store';

export function Visualizer({
  state,
  session,
  sessionActions,
  actions,
  panelKey,
}: {
  state: State;
  session: SessionData;
  sessionActions: SessionActions;
  actions: Actions;
  panelKey: string;
}) {
  const [fitSignal, setFitSignal] = useState(0);
  const [holding, setHolding] = useState(false);

  const spec = PANEL[panelKey];
  const photo = session.photos.find((p) => p.id === session.activePhotoId) ?? null;
  const before = photo ? session.urls[photo.storagePath] : null;
  const active = session.versions.find((v) => v.id === state.activeVersionId) ?? null;
  const after = active ? session.urls[active.storagePath] : null;

  const { line: chosenLine, color: chosenColor } = resolveSelection(session, panelKey);
  const confirmed = session.detections.filter((d) => d.selected);

  // Hold-to-compare falls back to the render when there is no original loaded.
  const shown = holding ? before ?? after : after ?? before;

  const revertArea = () => {
    const area = confirmed.find((d) => d.category === panelKey) ?? confirmed[0];
    if (!area) {
      actions.flash('Confirm an area first.');
      return;
    }
    void actions.runGen(active ? active.name : 'Option A', [area]);
    actions.flash(`Re-rendering just the ${area.label.toLowerCase()}…`);
  };

  const report = () => {
    void repo.reportFeedback(active?.id ?? null, `Rep flagged ${active?.name ?? 'the original photo'} as a bad result.`);
    actions.flash('Flagged for review. The render is still usable meanwhile.');
  };

  const canvasTools = [
    { name: 'Fit', enabled: true, act: () => { setFitSignal((n) => n + 1); actions.flash('Reset to fit. Pinch to zoom, double-tap to toggle.'); } },
    { name: 'Undo', enabled: actions.canUndo(), act: actions.undo },
    { name: 'Redo', enabled: actions.canRedo(), act: actions.redo },
    { name: 'Revert area', enabled: Boolean(active && confirmed.length), act: revertArea },
    { name: 'Report result', enabled: Boolean(active), act: report },
  ];

  return (
    <section style={{ height: '100%', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 372px' }}>
      <div style={{ minWidth: 0, background: 'var(--color-accent-900)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', color: '#f2f2f3', borderBottom: '1px solid rgba(242,242,243,.12)' }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 19, letterSpacing: '.02em' }}>
            {photo?.label ?? 'No photo'}
          </span>
          <span className="tag" style={{ background: 'rgba(242,242,243,.12)', color: '#f2f2f3', border: 0, fontSize: 11 }}>
            {holding ? 'Original photo' : active ? `${active.name} · ${active.meta}` : 'Original photo · nothing applied yet'}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {canvasTools.map((t) => (
              <button
                key={t.name}
                onClick={t.act}
                disabled={!t.enabled}
                style={{ height: 42, padding: '0 14px', background: 'rgba(242,242,243,.08)', border: '1px solid rgba(242,242,243,.22)', color: '#f2f2f3', fontFamily: 'var(--font-body)', fontSize: 13, cursor: t.enabled ? 'pointer' : 'default', opacity: t.enabled ? 1 : .4 }}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'grid', placeItems: 'center', padding: 16 }}>
          {shown ? (
            <Canvas
              src={shown}
              alt={active && !holding ? 'Property visualization' : 'Property today'}
              fitSignal={fitSignal}
              onHoldChange={setHolding}
            />
          ) : (
            <div style={{ color: '#f2f2f3', textAlign: 'center', maxWidth: 420 }}>
              <h3 style={{ color: '#f2f2f3' }}>No photo to work from</h3>
              <p style={{ opacity: .7 }}>Add a photo of the home, then confirm the areas.</p>
              <button onClick={actions.go('photos')} className="btn btn-primary" style={{ height: 50, padding: '0 20px' }}>Go to photos</button>
            </div>
          )}

          {after && !state.generating && (
            <div style={{ position: 'absolute', left: 22, bottom: 22, fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(242,242,243,.6)', pointerEvents: 'none' }}>
              Press and hold to see the original
            </div>
          )}

          {state.generating && (
            <div style={{ position: 'absolute', inset: 16, background: 'rgba(29,45,61,.9)', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: 0, right: 0, height: '30%', background: 'linear-gradient(to bottom, transparent, rgba(89,128,166,.28), transparent)', animation: 'wdSweep 2.4s linear infinite' }} />
              <div style={{ position: 'relative', width: 470, maxWidth: '82%', color: '#f2f2f3' }}>
                <div style={{ fontSize: 11.5, letterSpacing: '.22em', textTransform: 'uppercase', opacity: .6 }}>Building the visualization</div>
                <h3 style={{ color: '#f2f2f3', fontSize: 29, margin: '6px 0 18px' }}>{GEN_STAGES[Math.max(0, state.genStage)]}</h3>
                <div style={{ display: 'grid', gap: 9 }}>
                  {GEN_STAGES.map((label, i) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14.5, opacity: i <= state.genStage ? 1 : 0.4 }}>
                      <span style={{ width: 18, height: 18, border: '1px solid rgba(242,242,243,.5)', display: 'grid', placeItems: 'center', fontSize: 11, background: i < state.genStage ? STEEL : 'transparent', color: PAPER }}>{i < state.genStage ? '✓' : ''}</span>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                  <button onClick={actions.cancelGen} className="btn" style={{ height: 48, padding: '0 18px', background: 'rgba(242,242,243,.1)', border: '1px solid rgba(242,242,243,.3)', color: '#f2f2f3' }}>Cancel — keep current design</button>
                </div>
                <div style={{ fontSize: 12.5, opacity: .6, marginTop: 12 }}>Your selections are saved on this tablet. Nothing is lost if the connection drops.</div>
              </div>
            </div>
          )}
        </div>

        <div style={{ flex: 'none', borderTop: '1px solid rgba(242,242,243,.12)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, color: '#f2f2f3' }}>
          <span style={{ fontSize: 11.5, letterSpacing: '.18em', textTransform: 'uppercase', opacity: .55 }}>Versions</span>
          <div style={{ display: 'flex', gap: 10, alignItems: 'stretch', overflowX: 'auto' }}>
            {session.versions.map((v) => (
              <button
                key={v.id}
                onClick={() => actions.patch({ activeVersionId: v.id })}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px 6px 6px', background: state.activeVersionId === v.id ? 'rgba(89,128,166,.35)' : 'rgba(242,242,243,.06)', border: `1px solid ${state.activeVersionId === v.id ? STEEL : 'rgba(242,242,243,.22)'}`, color: '#f2f2f3', cursor: 'pointer', fontFamily: 'var(--font-body)', textAlign: 'left', whiteSpace: 'nowrap' }}
              >
                <span style={{ display: 'block', width: 62, height: 44, overflow: 'hidden', background: 'rgba(242,242,243,.1)' }}>
                  {session.urls[v.storagePath] && (
                    <img src={session.urls[v.storagePath]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                </span>
                <span style={{ display: 'block' }}>
                  <span style={{ display: 'block', fontFamily: 'var(--font-heading)', fontSize: 16 }}>{v.isFavorite ? `★ ${v.name}` : v.name}</span>
                  <span style={{ display: 'block', fontSize: 11.5, opacity: .7 }}>{v.meta}</span>
                </span>
              </button>
            ))}
            <button
              onClick={actions.newVersion}
              disabled={state.generating}
              style={{ padding: '0 16px', background: 'none', border: '1px dashed rgba(242,242,243,.4)', color: '#f2f2f3', fontFamily: 'var(--font-heading)', fontSize: 16, cursor: 'pointer', whiteSpace: 'nowrap', opacity: state.generating ? .5 : 1 }}
            >
              + New version
            </button>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button onClick={actions.go('compare')} disabled={session.versions.length < 1} className="btn" style={{ height: 46, padding: '0 18px', background: 'rgba(242,242,243,.1)', border: '1px solid rgba(242,242,243,.3)', color: '#f2f2f3', opacity: session.versions.length ? 1 : .5 }}>Compare</button>
            <button onClick={() => actions.patch({ presenting: true })} className="btn btn-primary" style={{ height: 46, padding: '0 18px' }}>Present</button>
          </div>
        </div>
      </div>

      <aside style={{ borderLeft: '1px solid var(--color-divider)', background: 'var(--color-neutral-100)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ flex: 'none', padding: '14px 18px', borderBottom: '1px solid var(--color-divider)' }}>
          <div style={{ fontSize: 11.5, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--color-neutral-600)' }}>Editing</div>
          <h3 style={{ margin: '2px 0 10px' }}>{spec.title}</h3>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[...new Set(confirmed.map((d) => d.category))].filter((c) => PANEL[c]).map((c) => (
              <button
                key={c}
                onClick={() => actions.patch({ panelTab: c })}
                style={{ height: 44, padding: '0 14px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13.5, background: panelKey === c ? INK : 'transparent', border: `1px solid ${panelKey === c ? INK : 'var(--color-divider)'}`, color: panelKey === c ? PAPER : 'var(--color-text)' }}
              >
                {c}
              </button>
            ))}
            {!confirmed.length && (
              <span style={{ fontSize: 13, color: 'var(--color-neutral-600)' }}>No areas confirmed yet.</span>
            )}
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 18px 18px' }}>
          <div style={{ fontSize: 11.5, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--color-neutral-600)', marginBottom: 8 }}>Product line</div>
          <div style={{ display: 'grid', gap: 8, marginBottom: 20 }}>
            {spec.lines.map((l) => {
              const on = chosenLine === l.name;
              return (
                <button
                  key={l.name}
                  onClick={() => actions.pickLine(panelKey, l.name)}
                  style={{ display: 'flex', gap: 12, alignItems: 'center', textAlign: 'left', padding: '12px 14px', minHeight: 62, cursor: 'pointer', fontFamily: 'var(--font-body)', background: on ? '#fff' : 'transparent', border: `1px solid ${on ? STEEL : 'var(--color-divider)'}`, boxShadow: on ? '0 0 0 2px rgba(89,128,166,.3)' : 'none' }}
                >
                  <span style={{ width: 22, height: 22, border: '1px solid var(--color-neutral-500)', display: 'grid', placeItems: 'center', fontSize: 12, background: on ? STEEL : 'transparent', color: on ? PAPER : 'var(--color-text)' }}>{on ? '✓' : ''}</span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontFamily: 'var(--font-heading)', fontSize: 19 }}>{l.name}</span>
                    <span style={{ display: 'block', fontSize: 12.5, color: 'var(--color-neutral-700)' }}>{l.note}</span>
                  </span>
                  <span style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--color-neutral-600)' }}>{l.tier}</span>
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 11.5, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--color-neutral-600)' }}>Color</div>
            <div style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>{chosenColor}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
            {spec.colors.map((c) => {
              const on = chosenColor === c.name;
              return (
                <button
                  key={c.name}
                  onClick={() => actions.pickColor(panelKey, c.name)}
                  style={{ padding: 0, cursor: 'pointer', background: 'none', border: `1px solid ${on ? STEEL : 'var(--color-divider)'}`, boxShadow: on ? '0 0 0 2px rgba(89,128,166,.45)' : 'none', textAlign: 'left' }}
                >
                  <span style={{ display: 'block', height: 62, background: c.hex, backgroundImage: GRAIN, position: 'relative' }}>
                    <span style={{ position: 'absolute', right: 5, top: 5, fontSize: 12, color: '#1d1f20' }}>{on ? '✓' : ''}</span>
                  </span>
                  <span style={{ display: 'block', padding: '6px 8px', fontSize: 12.5, fontFamily: 'var(--font-body)', lineHeight: 1.25 }}>{c.name}</span>
                </button>
              );
            })}
          </div>

          <div style={{ fontSize: 11.5, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--color-neutral-600)', marginBottom: 8 }}>{spec.optionLabel}</div>
          <div style={{ display: 'grid', gap: 8, marginBottom: 18 }}>
            {spec.options.map((o) => (
              <div key={o.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '11px 14px', border: '1px solid var(--color-divider)', background: '#fff' }}>
                <span style={{ fontSize: 14 }}>{o.label}</span>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: 17, color: 'var(--color-accent-700)' }}>{o.value}</span>
              </div>
            ))}
          </div>

          <button onClick={() => actions.patch({ advanced: !state.advanced })} className="btn btn-ghost" style={{ height: 46, width: '100%', justifyContent: 'center' }}>
            {state.advanced ? 'Hide technical detail' : 'Technical detail (for the homeowner who asks)'}
          </button>
          {state.advanced && (
            <div style={{ marginTop: 10, padding: '12px 14px', border: '1px solid var(--color-divider)', fontSize: 13.5, color: 'var(--color-neutral-800)', lineHeight: 1.75 }}>
              <div>Wind rating — 130 mph / Class F</div>
              <div>Impact resistance — Class 3</div>
              <div>Warranty — Lifetime limited, transferable once</div>
              <div>
                Coverage —{' '}
                {confirmed.some((d) => d.approxSqft)
                  ? `${Math.round(confirmed.reduce((sum, d) => sum + (d.approxSqft ?? 0), 0)).toLocaleString()} sq ft estimated from the photo`
                  : 'not estimated from this photo'}
              </div>
            </div>
          )}
        </div>

        <div style={{ flex: 'none', borderTop: '1px solid var(--color-divider)', padding: '14px 18px', background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, color: 'var(--color-neutral-700)', marginBottom: 10 }}>
            <span>
              {confirmed.length
                ? `${confirmed.length} area${confirmed.length === 1 ? '' : 's'} · ${session.versions.length} version${session.versions.length === 1 ? '' : 's'}`
                : 'No areas confirmed'}
            </span>
          </div>
          <button
            onClick={() => void actions.runGen(active ? active.name : 'Option A')}
            disabled={state.generating || !confirmed.length}
            className="btn btn-primary"
            style={{ width: '100%', height: 62, fontSize: 18, fontFamily: 'var(--font-heading)', letterSpacing: '.06em', textTransform: 'uppercase', justifyContent: 'center', opacity: state.generating || !confirmed.length ? .55 : 1 }}
          >
            {active ? 'Re-render with these colors' : 'Generate visualization'}
          </button>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            <button onClick={actions.go('selections')} className="btn btn-secondary" style={{ height: 48, justifyContent: 'center' }}>Selections</button>
            <button
              onClick={() => active && void sessionActions.favoriteVersion(active.id)}
              disabled={!active}
              className="btn btn-secondary"
              style={{ height: 48, justifyContent: 'center', opacity: active ? 1 : .45 }}
            >
              {active?.isFavorite ? '✓ Favorite' : 'Mark favorite'}
            </button>
          </div>
        </div>
      </aside>
    </section>
  );
}
