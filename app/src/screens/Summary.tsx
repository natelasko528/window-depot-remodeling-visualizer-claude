import { Corners } from '../components/Corners';
import { AFTER, BEFORE, OPTION_B_FILTER } from '../data';
import { favName, selectionsFor } from '../derived';
import type { Actions, State } from '../store';

export function Summary({ state, actions }: { state: State; actions: Actions }) {
  const rows = selectionsFor(state);
  const a = state.versions.find((v) => v.id === 'A');
  const b = state.versions.find((v) => v.id === 'B');
  const preferred = state.favorite === 'B' ? b : a;
  const alternative = state.favorite === 'B' ? a : b;

  return (
    <section style={{ height: '100%', overflowY: 'auto', padding: '26px 34px 40px' }}>
      <div style={{ maxWidth: 1320, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 11.5, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--color-neutral-600)' }}>Project summary · marked final 2:41 PM</div>
            <h2 style={{ margin: '2px 0 0' }}>Nowak residence — rear elevation package</h2>
            <p style={{ color: 'var(--color-neutral-700)', margin: '2px 0 0' }}>12345 W. Bluemound Rd, Wauwatosa, WI 53213 · Alex Reyes, Rep 214</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button onClick={actions.noop} className="btn btn-secondary" style={{ height: 50, padding: '0 16px' }}>Export PDF</button>
            <button onClick={actions.noop} className="btn btn-secondary" style={{ height: 50, padding: '0 16px' }}>Share with homeowner</button>
            <button onClick={actions.noop} className="btn btn-primary" style={{ height: 50, padding: '0 20px' }}>Send to quoting</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18 }}>
          <div className="blueprint" style={{ padding: 14 }}>
            <Corners />
            <div style={{ fontSize: 11.5, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--color-neutral-600)', marginBottom: 8 }}>Preferred design — {favName(state)}</div>
            <img src={preferred?.image ?? AFTER} alt="Preferred visualization" style={{ width: '100%', border: '1px solid var(--color-divider)', filter: preferred?.filter ?? 'none' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <div>
                <div style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--color-neutral-600)', marginBottom: 5 }}>Today</div>
                <img src={BEFORE} alt="Original" style={{ width: '100%', border: '1px solid var(--color-divider)' }} />
              </div>
              <div>
                <div style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--color-neutral-600)', marginBottom: 5 }}>
                  Alternative — Option {state.favorite === 'B' ? 'A' : 'B'}
                </div>
                <img src={alternative?.image ?? AFTER} alt="Alternative visualization" style={{ width: '100%', border: '1px solid var(--color-divider)', filter: alternative?.filter ?? OPTION_B_FILTER }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
            <div style={{ padding: 16, border: '1px solid var(--color-divider)' }}>
              <h4 style={{ margin: '0 0 10px' }}>Final selections</h4>
              <div style={{ display: 'grid', gap: 10 }}>
                {rows.map((s) => (
                  <div key={s.cat} style={{ display: 'grid', gridTemplateColumns: '26px 1fr', gap: 10, alignItems: 'start' }}>
                    <span style={{ width: 26, height: 26, border: '1px solid var(--color-neutral-400)', background: s.hex }} />
                    <span>
                      <span style={{ display: 'block', fontSize: 14.5 }}>{s.line} — {s.color}</span>
                      <span style={{ display: 'block', fontSize: 12.5, color: 'var(--color-neutral-600)' }}>{s.cat} · {s.config} · {s.where}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: 16, border: '1px solid var(--color-divider)' }}>
              <h4 style={{ margin: '0 0 6px' }}>Rep notes</h4>
              <p style={{ fontSize: 14, margin: 0, color: 'var(--color-neutral-800)' }}>Kathy prefers the warmer cream (B); Dan likes the white. Both agreed on Moiré Black roof. Rear elevation first — pool party in August.</p>
            </div>
            <div style={{ padding: 16, background: 'var(--color-accent-900)', color: '#f2f2f3' }}>
              <h4 style={{ margin: '0 0 6px', color: '#f2f2f3' }}>Ready for the next step</h4>
              <p style={{ fontSize: 14, opacity: .8, margin: '0 0 12px' }}>Selections, photos and both versions travel with the quote. Nothing needs re-entering.</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={actions.go('visualizer')} className="btn" style={{ height: 46, padding: '0 16px', background: 'rgba(242,242,243,.1)', border: '1px solid rgba(242,242,243,.3)', color: '#f2f2f3' }}>Continue editing</button>
                <button onClick={actions.go('home')} className="btn" style={{ height: 46, padding: '0 16px', background: 'rgba(242,242,243,.1)', border: '1px solid rgba(242,242,243,.3)', color: '#f2f2f3' }}>Done for now</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
