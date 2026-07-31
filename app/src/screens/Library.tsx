import { Corners } from '../components/Corners';
import { LIBRARY } from '../data';
import type { Actions } from '../store';

export function Library({ actions }: { actions: Actions }) {
  return (
    <section style={{ height: '100%', overflowY: 'auto', padding: '26px 34px 40px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0 }}>Product library</h2>
            <p style={{ color: 'var(--color-neutral-700)', margin: '2px 0 0' }}>Every line we sell, with the colors cached on this tablet for offline appointments.</p>
          </div>
          <button onClick={actions.go('home')} className="btn btn-secondary" style={{ height: 50, padding: '0 18px' }}>Back</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {LIBRARY.map((l) => (
            <div key={l.brand + l.cat} className="blueprint" style={{ padding: 16 }}>
              <Corners />
              <div style={{ fontSize: 11.5, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--color-neutral-600)' }}>{l.cat}</div>
              <h4 style={{ margin: '4px 0 2px' }}>{l.brand}</h4>
              <div style={{ fontSize: 13.5, color: 'var(--color-neutral-700)' }}>{l.lines}</div>
              <div style={{ display: 'flex', gap: 5, margin: '12px 0' }}>
                {l.swatches.map((s) => (
                  <span key={s} style={{ width: 30, height: 30, border: '1px solid var(--color-neutral-400)', background: s }} />
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--color-neutral-700)' }}>
                <span>{l.cached}</span>
                <button onClick={actions.noop} className="btn btn-ghost" style={{ height: 42, padding: '0 12px' }}>Brochure</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
