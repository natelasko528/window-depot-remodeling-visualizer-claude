import { AFTER, BEFORE } from '../data';
import { favName } from '../derived';
import type { Actions, State } from '../store';

export function Presentation({ state, actions }: { state: State; actions: Actions }) {
  const shown = state.versions.find((v) => v.id === (state.favorite ?? 'A')) ?? state.versions[0];

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#12202c', zIndex: 40, display: 'flex', flexDirection: 'column' }}>
      <div {...actions.slider} style={{ flex: 1, minHeight: 0, display: 'grid', placeItems: 'center', touchAction: 'none', userSelect: 'none' }}>
        <div style={{ position: 'relative' }}>
          <img src={BEFORE} alt="Today" style={{ maxWidth: '96vw', maxHeight: '82vh', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', width: `${state.sliderPct}%` }}>
            <img src={shown?.image ?? AFTER} alt="Proposed" style={{ height: '100%', display: 'block', maxWidth: 'none', filter: shown?.filter ?? 'none' }} />
          </div>
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${state.sliderPct}%`, width: 2, background: '#f2f2f3' }}>
            <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 52, height: 52, background: '#f2f2f3', border: '1px solid #12202c', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-heading)', fontSize: 17, color: '#12202c' }}>↔</span>
          </div>
          <span style={{ position: 'absolute', left: 16, bottom: 16, padding: '8px 14px', background: 'rgba(18,32,44,.85)', color: '#f2f2f3', fontFamily: 'var(--font-heading)', fontSize: 19, letterSpacing: '.04em' }}>{favName(state)}</span>
        </div>
      </div>
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 22px', color: '#f2f2f3' }}>
        <span style={{ fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase', opacity: .55 }}>Drag anywhere to reveal</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <button onClick={() => actions.setFavorite('B', 'Option B marked as the homeowners’ favorite.')} className="btn" style={{ height: 52, padding: '0 20px', background: 'rgba(242,242,243,.1)', border: '1px solid rgba(242,242,243,.35)', color: '#f2f2f3', fontSize: 15 }}>Option B</button>
          <button onClick={() => actions.setFavorite('A', 'Option A marked as the homeowners’ favorite.')} className="btn" style={{ height: 52, padding: '0 20px', background: 'rgba(242,242,243,.1)', border: '1px solid rgba(242,242,243,.35)', color: '#f2f2f3', fontSize: 15 }}>Option A</button>
          <button onClick={() => actions.setFavorite(state.favorite ?? 'A', 'Favorite saved. It leads the project summary.')} className="btn btn-primary" style={{ height: 52, padding: '0 22px', fontSize: 15 }}>
            {state.favorite ? `✓ Favorite: Option ${state.favorite}` : 'Mark favorite'}
          </button>
          <button onClick={() => actions.patch({ presenting: false })} className="btn" style={{ height: 52, padding: '0 20px', background: 'none', border: '1px solid rgba(242,242,243,.35)', color: '#f2f2f3', fontSize: 15 }}>Exit</button>
        </div>
      </div>
    </div>
  );
}
