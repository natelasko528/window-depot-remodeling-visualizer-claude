import { AFTER, BEFORE, OPTION_B_FILTER, PAPER, STEEL } from '../data';
import { favName } from '../derived';
import type { Actions, CompareMode, State } from '../store';

const MODES: { name: string; k: CompareMode }[] = [
  { name: 'Before / after', k: 'original' },
  { name: 'A vs B slider', k: 'slider' },
  { name: 'Side by side', k: 'side' },
];

export function Compare({ state, actions }: { state: State; actions: Actions }) {
  const a = state.versions.find((v) => v.id === 'A');
  const b = state.versions.find((v) => v.id === 'B');
  const srcA = a?.image ?? AFTER;
  const filterA = a?.filter ?? 'none';
  const srcB = b?.image ?? AFTER;
  const filterB = b?.filter ?? OPTION_B_FILTER;

  const favBg = (id: 'A' | 'B') => (state.favorite === id ? STEEL : 'rgba(242,242,243,.08)');

  return (
    <section style={{ height: '100%', background: 'var(--color-accent-900)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', color: '#f2f2f3' }}>
        <span style={{ fontFamily: 'var(--font-heading)', fontSize: 21 }}>Compare designs</span>
        <div style={{ display: 'flex', gap: 6, marginLeft: 18 }}>
          {MODES.map((m) => (
            <button
              key={m.k}
              onClick={() => actions.patch({ compare: m.k })}
              style={{ height: 44, padding: '0 16px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13.5, letterSpacing: '.06em', textTransform: 'uppercase', background: state.compare === m.k ? STEEL : 'rgba(242,242,243,.08)', border: `1px solid ${state.compare === m.k ? STEEL : 'rgba(242,242,243,.25)'}`, color: PAPER }}
            >
              {m.name}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={actions.go('visualizer')} className="btn" style={{ height: 46, padding: '0 16px', background: 'rgba(242,242,243,.1)', border: '1px solid rgba(242,242,243,.3)', color: '#f2f2f3' }}>Back to design</button>
          <button onClick={() => actions.patch({ presenting: true })} className="btn btn-primary" style={{ height: 46, padding: '0 18px' }}>Present full screen</button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, padding: '0 18px 14px', display: 'grid', gridTemplateRows: 'minmax(0, 1fr)', placeItems: 'center', alignItems: 'stretch', overflow: 'hidden' }}>
        {state.compare === 'slider' && (
          <div {...actions.slider} style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%', minHeight: 0, touchAction: 'none', cursor: 'ew-resize', userSelect: 'none' }}>
            <img src={srcB} alt="Option B" style={{ maxWidth: '100%', maxHeight: '100%', display: 'block', filter: filterB }} />
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', width: `${state.sliderPct}%` }}>
              <img src={srcA} alt="Option A" style={{ height: '100%', display: 'block', maxWidth: 'none', filter: filterA }} />
            </div>
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${state.sliderPct}%`, width: 2, background: '#f2f2f3', boxShadow: '0 0 0 1px rgba(29,45,61,.5)' }}>
              <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 46, height: 46, background: '#f2f2f3', border: '1px solid var(--color-accent-900)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-heading)', fontSize: 15, color: 'var(--color-accent-900)' }}>↔</span>
            </div>
            <span style={{ position: 'absolute', left: 14, top: 14, padding: '7px 12px', background: 'rgba(29,45,61,.86)', color: '#f2f2f3', fontFamily: 'var(--font-heading)', fontSize: 17, letterSpacing: '.04em' }}>A — Alabaster / Weathered Wood</span>
            <span style={{ position: 'absolute', right: 14, top: 14, padding: '7px 12px', background: 'rgba(29,45,61,.86)', color: '#f2f2f3', fontFamily: 'var(--font-heading)', fontSize: 17, letterSpacing: '.04em' }}>B — Sandcastle / Moiré Black</span>
          </div>
        )}

        {state.compare === 'side' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, width: '100%', maxWidth: 1500, height: '100%', alignItems: 'stretch' }}>
            {(['A', 'B'] as const).map((id) => (
              <div key={id} style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <img
                  src={id === 'A' ? srcA : srcB}
                  alt={`Option ${id}`}
                  style={{ width: '100%', flex: 1, minHeight: 0, maxHeight: 'none', objectFit: 'contain', border: '1px solid rgba(242,242,243,.25)', filter: id === 'A' ? filterA : filterB }}
                />
                <div style={{ flex: 'none', color: '#f2f2f3', paddingTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: 21 }}>
                    {id === 'A' ? 'A — Alabaster / Weathered Wood' : 'B — Sandcastle / Moiré Black'}
                  </span>
                  <button
                    onClick={() => actions.setFavorite(id, `Option ${id} marked as the homeowners’ favorite.`)}
                    className="btn"
                    style={{ height: 44, padding: '0 16px', background: favBg(id), border: '1px solid rgba(242,242,243,.35)', color: PAPER }}
                  >
                    {state.favorite === id ? '✓ Favorite' : 'Mark favorite'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {state.compare === 'original' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, width: '100%', maxWidth: 1500, height: '100%', alignItems: 'stretch' }}>
            <div style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <img src={BEFORE} alt="Today" style={{ width: '100%', flex: 1, minHeight: 0, maxHeight: 'none', objectFit: 'contain', border: '1px solid rgba(242,242,243,.25)' }} />
              <div style={{ flex: 'none', color: '#f2f2f3', paddingTop: 10, fontFamily: 'var(--font-heading)', fontSize: 21 }}>Today</div>
            </div>
            <div style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <img
                src={state.favorite === 'B' ? srcB : srcA}
                alt="Proposed"
                style={{ width: '100%', flex: 1, minHeight: 0, maxHeight: 'none', objectFit: 'contain', border: '1px solid rgba(242,242,243,.25)', filter: state.favorite === 'B' ? filterB : filterA }}
              />
              <div style={{ flex: 'none', color: '#f2f2f3', paddingTop: 10, fontFamily: 'var(--font-heading)', fontSize: 21 }}>Proposed — {favName(state)}</div>
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: 'none', borderTop: '1px solid rgba(242,242,243,.15)', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 16, color: '#f2f2f3' }}>
        <div style={{ fontSize: 13.5, opacity: .75 }}>
          {state.favorite
            ? `Marked as the homeowners’ favorite: Option ${state.favorite}. It leads the summary.`
            : 'Ask which one they keep coming back to, then mark it.'}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => actions.setFavorite('A', 'Option A marked as the homeowners’ favorite.')} className="btn" style={{ height: 48, padding: '0 18px', background: favBg('A'), border: '1px solid rgba(242,242,243,.35)', color: PAPER }}>Homeowner favorite: A</button>
          <button onClick={() => actions.setFavorite('B', 'Option B marked as the homeowners’ favorite.')} className="btn" style={{ height: 48, padding: '0 18px', background: favBg('B'), border: '1px solid rgba(242,242,243,.35)', color: PAPER }}>Homeowner favorite: B</button>
          <button onClick={actions.go('selections')} className="btn btn-primary" style={{ height: 48, padding: '0 22px' }}>Save selections</button>
        </div>
      </div>
    </section>
  );
}
