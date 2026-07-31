import { AREAS, BEFORE, INK, PAPER, STEEL, TOOLS } from '../data';
import type { Actions, State } from '../store';

export function Areas({ state, actions }: { state: State; actions: Actions }) {
  return (
    <section style={{ height: '100%', display: 'grid', gridTemplateColumns: '1fr 344px' }}>
      <div style={{ minWidth: 0, background: 'var(--color-accent-900)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', color: '#f2f2f3' }}>
          <span style={{ fontSize: 11.5, letterSpacing: '.18em', textTransform: 'uppercase', opacity: .6, marginRight: 6 }}>Tools</span>
          {TOOLS.map((name) => (
            <button
              key={name}
              onClick={() => actions.patch({ tool: name })}
              style={{ height: 44, padding: '0 16px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13.5, letterSpacing: '.06em', textTransform: 'uppercase', background: state.tool === name ? STEEL : 'rgba(242,242,243,.08)', border: `1px solid ${state.tool === name ? STEEL : 'rgba(242,242,243,.22)'}`, color: PAPER }}
            >
              {name}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', fontSize: 13, color: 'rgba(242,242,243,.7)' }}>7 areas detected · {state.areas.length} confirmed</div>
        </div>
        <div style={{ flex: 1, minHeight: 0, display: 'grid', placeItems: 'center', padding: '0 16px 16px' }}>
          <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%' }}>
            <img src={BEFORE} alt="Rear elevation" style={{ maxWidth: '100%', maxHeight: '68vh', objectFit: 'contain', display: 'block' }} />
            {AREAS.map((a) => {
              const on = state.areas.includes(a.id);
              const isActive = state.areaId === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() => actions.pickArea(a.id)}
                  style={{ position: 'absolute', left: a.x, top: a.y, width: a.w, height: a.h, padding: 0, cursor: 'pointer', background: on ? 'rgba(89,128,166,.22)' : 'rgba(242,242,243,.06)', border: on ? `2px solid ${PAPER}` : '2px dashed rgba(242,242,243,.7)', boxShadow: isActive ? '0 0 0 3px rgba(89,128,166,.6)' : 'none' }}
                >
                  <span style={{ position: 'absolute', left: -1, bottom: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: on ? PAPER : 'rgba(29,45,61,.8)', color: on ? INK : PAPER, fontFamily: 'var(--font-body)', fontSize: 11.5, letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    <span>{on ? '✓' : '+'}</span><span>{a.name}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <aside style={{ borderLeft: '1px solid var(--color-divider)', background: 'var(--color-neutral-100)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
        <div>
          <div style={{ fontSize: 11.5, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--color-neutral-600)' }}>Detected areas</div>
          <h3 style={{ margin: '4px 0 0' }}>Confirm what we're changing</h3>
          <p style={{ fontSize: 13.5, color: 'var(--color-neutral-700)' }}>Tap an outline on the photo to include or exclude it. Nothing outside these areas gets touched.</p>
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {AREAS.map((a) => {
            const on = state.areas.includes(a.id);
            const isActive = state.areaId === a.id;
            return (
              <button
                key={a.id}
                onClick={() => actions.pickArea(a.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', padding: '12px 14px', minHeight: 56, cursor: 'pointer', fontFamily: 'var(--font-body)', background: on ? '#fff' : 'transparent', border: `1px solid ${isActive ? STEEL : 'var(--color-divider)'}` }}
              >
                <span style={{ width: 22, height: 22, border: '1px solid var(--color-neutral-500)', display: 'grid', placeItems: 'center', fontSize: 12, background: on ? STEEL : 'transparent', color: on ? PAPER : 'var(--color-text)' }}>{on ? '✓' : '+'}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 15 }}>{a.name}</span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--color-neutral-600)' }}>{a.meta}</span>
                </span>
              </button>
            );
          })}
        </div>
        <button onClick={actions.go('visualizer')} className="btn btn-primary" style={{ marginTop: 'auto', height: 60, fontSize: 17, fontFamily: 'var(--font-heading)', letterSpacing: '.06em', textTransform: 'uppercase', justifyContent: 'center' }}>Confirm areas — design</button>
      </aside>
    </section>
  );
}
