import { BEFORE, GEN_STAGES, GRAIN, INK, PANEL, PAPER, STEEL } from '../data';
import type { Actions, State } from '../store';

export function Visualizer({ state, actions, panelKey }: { state: State; actions: Actions; panelKey: string }) {
  const spec = PANEL[panelKey];
  const active = state.versions.find((v) => v.id === state.activeVersion);
  const chosenLine = state.lines[panelKey] || spec.line;
  const chosenColor = state.picks[panelKey] || spec.color;

  const canvasTools = [
    { name: 'Fit', dim: 1, act: () => actions.flash('Fit to screen. Pinch to zoom, double-tap to reset.') },
    { name: 'Original', dim: 1, act: () => actions.flash('Hold to see the original photo underneath.') },
    { name: 'Undo', dim: state.versions.length ? 1 : 0.4, act: () => actions.flash('Undid last color change.') },
    { name: 'Redo', dim: 0.4, act: () => actions.flash('Nothing to redo.') },
    { name: 'Report result', dim: 1, act: () => actions.flash('Flagged for review — the render keeps working meanwhile.') },
  ];

  const hotspots = [
    { label: `Landmark PRO — ${state.picks.Roofing}`, x: '33%', y: '11%' },
    { label: `ASCEND — ${state.picks.Siding}`, x: '66%', y: '52%' },
    { label: `Endure slider — ${state.picks['Patio doors']}`, x: '40%', y: '72%' },
  ];

  return (
    <section style={{ height: '100%', display: 'grid', gridTemplateColumns: '1fr 372px' }}>
      <div style={{ minWidth: 0, background: 'var(--color-accent-900)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', color: '#f2f2f3', borderBottom: '1px solid rgba(242,242,243,.12)' }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 19, letterSpacing: '.02em' }}>Rear elevation</span>
          <span className="tag" style={{ background: 'rgba(242,242,243,.12)', color: '#f2f2f3', border: 0, fontSize: 11 }}>
            {active ? `${active.name} · ${active.meta}` : 'Original photo · nothing applied yet'}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {canvasTools.map((t) => (
              <button key={t.name} onClick={t.act} style={{ height: 42, padding: '0 14px', background: 'rgba(242,242,243,.08)', border: '1px solid rgba(242,242,243,.22)', color: '#f2f2f3', fontFamily: 'var(--font-body)', fontSize: 13, cursor: 'pointer', opacity: t.dim }}>{t.name}</button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'grid', placeItems: 'center', padding: 16 }}>
          <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%' }}>
            <img
              src={active?.image ?? BEFORE}
              alt={active ? 'Property visualization' : 'Property today'}
              style={{ maxWidth: '100%', maxHeight: '62vh', objectFit: 'contain', display: 'block', filter: active?.filter ?? 'none' }}
            />
            {active && !state.generating && (
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                {hotspots.map((h) => (
                  <span key={h.label} style={{ position: 'absolute', left: h.x, top: h.y, padding: '5px 9px', background: 'rgba(29,45,61,.86)', color: '#f2f2f3', fontSize: 11.5, letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap', border: '1px solid rgba(242,242,243,.3)' }}>{h.label}</span>
                ))}
              </div>
            )}
          </div>

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
            {state.versions.map((v) => (
              <button
                key={v.id}
                onClick={() => actions.patch({ activeVersion: v.id })}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px 6px 6px', background: state.activeVersion === v.id ? 'rgba(89,128,166,.35)' : 'rgba(242,242,243,.06)', border: `1px solid ${state.activeVersion === v.id ? STEEL : 'rgba(242,242,243,.22)'}`, color: '#f2f2f3', cursor: 'pointer', fontFamily: 'var(--font-body)', textAlign: 'left', whiteSpace: 'nowrap' }}
              >
                <span style={{ display: 'block', width: 62, height: 44, overflow: 'hidden', background: 'rgba(242,242,243,.1)' }}>
                  <img src={v.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: v.filter }} />
                </span>
                <span style={{ display: 'block' }}>
                  <span style={{ display: 'block', fontFamily: 'var(--font-heading)', fontSize: 16 }}>{v.name}</span>
                  <span style={{ display: 'block', fontSize: 11.5, opacity: .7 }}>{v.meta}</span>
                </span>
              </button>
            ))}
            <button onClick={actions.duplicateVersion} style={{ padding: '0 16px', background: 'none', border: '1px dashed rgba(242,242,243,.4)', color: '#f2f2f3', fontFamily: 'var(--font-heading)', fontSize: 16, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ New version</button>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button onClick={actions.go('compare')} className="btn" style={{ height: 46, padding: '0 18px', background: 'rgba(242,242,243,.1)', border: '1px solid rgba(242,242,243,.3)', color: '#f2f2f3' }}>Compare</button>
            <button onClick={() => actions.patch({ presenting: true })} className="btn btn-primary" style={{ height: 46, padding: '0 18px' }}>Present</button>
          </div>
        </div>
      </div>

      <aside style={{ borderLeft: '1px solid var(--color-divider)', background: 'var(--color-neutral-100)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ flex: 'none', padding: '14px 18px', borderBottom: '1px solid var(--color-divider)' }}>
          <div style={{ fontSize: 11.5, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--color-neutral-600)' }}>Editing</div>
          <h3 style={{ margin: '2px 0 10px' }}>{spec.title}</h3>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {state.cats.filter((c) => PANEL[c]).map((c) => (
              <button
                key={c}
                onClick={() => actions.patch({ panelTab: c })}
                style={{ height: 44, padding: '0 14px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13.5, background: panelKey === c ? INK : 'transparent', border: `1px solid ${panelKey === c ? INK : 'var(--color-divider)'}`, color: panelKey === c ? PAPER : 'var(--color-text)' }}
              >
                {c}
              </button>
            ))}
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
              <div>Coverage — 2,140 sq ft measured from photos</div>
            </div>
          )}
        </div>

        <div style={{ flex: 'none', borderTop: '1px solid var(--color-divider)', padding: '14px 18px', background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, color: 'var(--color-neutral-700)', marginBottom: 10 }}>
            <span>{state.versions.length ? `3 areas applied · ${state.versions.length} version(s)` : `${state.areas.length} areas ready to render`}</span>
            <span>{state.offline ? 'Saved on tablet' : 'Saved 2:31 PM'}</span>
          </div>
          <button
            onClick={() => void actions.runGen(state.versions.length ? (state.activeVersion ?? 'A') : 'A')}
            disabled={state.generating}
            className="btn btn-primary"
            style={{ width: '100%', height: 62, fontSize: 18, fontFamily: 'var(--font-heading)', letterSpacing: '.06em', textTransform: 'uppercase', justifyContent: 'center' }}
          >
            {state.versions.length ? 'Re-render with these colors' : 'Generate visualization'}
          </button>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            <button onClick={actions.go('selections')} className="btn btn-secondary" style={{ height: 48, justifyContent: 'center' }}>Selections</button>
            <button onClick={() => actions.flash('Rear wall siding restored to the original photo.')} className="btn btn-secondary" style={{ height: 48, justifyContent: 'center' }}>Revert area</button>
          </div>
        </div>
      </aside>
    </section>
  );
}
