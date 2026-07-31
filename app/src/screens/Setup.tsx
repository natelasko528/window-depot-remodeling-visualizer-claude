import { CATS, INK, PAPER } from '../data';
import type { Actions, State } from '../store';

export function Setup({ state, actions }: { state: State; actions: Actions }) {
  return (
    <section style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '26px 34px 20px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: '0 0 2px' }}>What are we looking at today?</h2>
              <p style={{ color: 'var(--color-neutral-700)', margin: 0 }}>Pick everything in the conversation — you can add more later without losing work.</p>
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-neutral-700)', textAlign: 'right' }}>
              Exterior categories visualize together on one photo.<br />Interior categories open their own room views.
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {CATS.map((c) => {
              const on = state.cats.includes(c.name);
              return (
                <button
                  key={c.name}
                  onClick={() => actions.toggleCategory(c.name)}
                  style={{ position: 'relative', textAlign: 'left', padding: 16, minHeight: 148, cursor: 'pointer', fontFamily: 'var(--font-body)', background: on ? INK : 'transparent', border: `1px solid ${on ? INK : 'var(--color-divider)'}`, boxShadow: on ? '0 0 0 3px rgba(89,128,166,.35)' : 'none', color: on ? PAPER : 'var(--color-text)' }}
                >
                  <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', opacity: .7 }}>
                    <span>{c.zone}</span>
                    <span>{on ? '✓' : ''}</span>
                  </span>
                  <span style={{ display: 'block', fontFamily: 'var(--font-heading)', fontSize: 27, marginTop: 26, lineHeight: 1.05 }}>{c.name}</span>
                  <span style={{ display: 'block', fontSize: 13, opacity: .78, marginTop: 4 }}>{c.brands}</span>
                  <span style={{ display: 'block', fontSize: 12, marginTop: 10, letterSpacing: '.1em', textTransform: 'uppercase', opacity: .85 }}>{on ? 'Selected' : 'Tap to add'}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div style={{ flex: 'none', borderTop: '1px solid var(--color-divider)', background: 'var(--color-neutral-100)', padding: '14px 34px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18 }}>
        <div style={{ fontSize: 14 }}>
          <strong style={{ fontFamily: 'var(--font-heading)', fontSize: 19 }}>{state.cats.length} selected</strong>
          <span style={{ color: 'var(--color-neutral-700)' }}>
            {' '}— {state.cats.length ? `${state.cats.join(' · ')} — exterior categories share one photo set` : 'Pick at least one category'}
          </span>
        </div>
        <button onClick={actions.go('photos')} className="btn btn-primary" style={{ height: 56, padding: '0 30px', fontSize: 17, fontFamily: 'var(--font-heading)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Next — photos</button>
      </div>
    </section>
  );
}
