import { Corners } from '../components/Corners';
import { AFTER, BEFORE, RECENT_CUSTOMERS, STEEL } from '../data';
import type { Actions, Screen, State } from '../store';

const PROJECTS: { name: string; address: string; cats: string[]; state: string; stateColor: string; when: string; thumb: string; open: Screen }[] = [
  { name: 'Nowak residence', address: '12345 W. Bluemound Rd, Wauwatosa', cats: ['Roofing', 'Siding', 'Patio doors'], state: 'In progress', stateColor: STEEL, when: '2:14 PM today', thumb: BEFORE, open: 'areas' },
  { name: 'Delacroix residence', address: '806 Center St, Milwaukee', cats: ['Windows', 'Entry door'], state: 'Offline ready', stateColor: '#6f7377', when: 'Yesterday', thumb: AFTER, open: 'visualizer' },
  { name: 'Hartmann residence', address: '4429 N 68th St, Milwaukee', cats: ['Bathroom'], state: 'Sent to quoting', stateColor: '#6f7377', when: 'Tue', thumb: BEFORE, open: 'summary' },
];

export function Home({ state, actions }: { state: State; actions: Actions }) {
  return (
    <section style={{ height: '100%', overflowY: 'auto', padding: '30px 34px 40px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(360px, 1.05fr) minmax(420px, 1.6fr)', gap: 30, alignItems: 'start', maxWidth: 1500, margin: '0 auto' }}>

        <div>
          <div style={{ fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--color-neutral-600)', marginBottom: 6 }}>Thursday · 2:10 PM appointment</div>
          <h1 style={{ fontSize: 46, margin: '0 0 4px' }}>Good afternoon, Alex.</h1>
          <p style={{ color: 'var(--color-neutral-700)', fontSize: 16, maxWidth: '46ch' }}>Two appointments left today. Everything on this tablet works without signal — start whenever you're ready.</p>

          <div className="blueprint" style={{ marginTop: 22, background: 'var(--color-accent-900)', color: '#f2f2f3', padding: '26px 26px 24px' }}>
            <Corners />
            <div style={{ fontSize: 11.5, letterSpacing: '.2em', textTransform: 'uppercase', opacity: .6 }}>Primary action</div>
            <h2 style={{ fontSize: 34, margin: '8px 0 6px', color: '#f2f2f3' }}>Start new visualization</h2>
            <p style={{ opacity: .7, fontSize: 14.5, marginBottom: 20 }}>Photograph the home, pick products, show the finished result in about three minutes.</p>
            <button onClick={actions.go('customers')} className="btn btn-primary" style={{ width: '100%', height: 62, fontSize: 19, letterSpacing: '.06em', textTransform: 'uppercase', fontFamily: 'var(--font-heading)', justifyContent: 'center' }}>Begin — 12345 W. Bluemound</button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
              <button onClick={actions.go('customers')} className="btn" style={{ height: 52, background: 'rgba(242,242,243,.08)', border: '1px solid rgba(242,242,243,.3)', color: '#f2f2f3', fontSize: 14.5, justifyContent: 'center' }}>Find customer</button>
              <button onClick={actions.go('areas')} className="btn" style={{ height: 52, background: 'rgba(242,242,243,.08)', border: '1px solid rgba(242,242,243,.3)', color: '#f2f2f3', fontSize: 14.5, justifyContent: 'center' }}>Continue last project</button>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 22 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>Continue a project</h3>
              <span style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--color-neutral-600)' }}>3 on this tablet</span>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {PROJECTS.map((p) => (
                <button key={p.name} onClick={actions.go(p.open)} className="blueprint" style={{ display: 'grid', gridTemplateColumns: '116px 1fr auto', gap: 16, alignItems: 'center', textAlign: 'left', padding: 12, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                  <Corners />
                  <span style={{ display: 'block', height: 74, background: 'var(--color-neutral-200)', border: '1px solid var(--color-divider)', overflow: 'hidden' }}>
                    <img src={p.thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </span>
                  <span style={{ display: 'block', minWidth: 0 }}>
                    <span style={{ display: 'block', fontFamily: 'var(--font-heading)', fontSize: 21, letterSpacing: '.01em' }}>{p.name}</span>
                    <span style={{ display: 'block', fontSize: 13, color: 'var(--color-neutral-700)' }}>{p.address}</span>
                    <span style={{ display: 'flex', gap: 6, marginTop: 7, flexWrap: 'wrap' }}>
                      {p.cats.map((c) => (
                        <span key={c} className="tag tag-outline" style={{ fontSize: 11, whiteSpace: 'nowrap', height: 'auto' }}>{c}</span>
                      ))}
                    </span>
                  </span>
                  <span style={{ display: 'block', textAlign: 'right', paddingRight: 6 }}>
                    <span style={{ display: 'block', fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', color: p.stateColor }}>{p.state}</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--color-neutral-600)', marginTop: 3 }}>{p.when}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 style={{ margin: '0 0 10px' }}>Recent customers</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {RECENT_CUSTOMERS.map((c) => (
                <button key={c.name} onClick={actions.go('customers')} style={{ textAlign: 'left', padding: 12, background: 'none', border: '1px solid var(--color-divider)', cursor: 'pointer', fontFamily: 'var(--font-body)', minHeight: 84 }}>
                  <span style={{ display: 'block', fontFamily: 'var(--font-heading)', fontSize: 18 }}>{c.name}</span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--color-neutral-600)', marginTop: 2 }}>{c.city}</span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--color-neutral-700)', marginTop: 6 }}>{c.meta}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <button onClick={actions.go('library')} style={{ textAlign: 'left', padding: 16, background: 'none', border: '1px solid var(--color-divider)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              <span style={{ display: 'block', fontFamily: 'var(--font-heading)', fontSize: 21 }}>Product library</span>
              <span style={{ display: 'block', fontSize: 13, color: 'var(--color-neutral-700)', marginTop: 2 }}>ProVia · CertainTeed · ASCEND · Samuel Mueller</span>
            </button>
            <button onClick={() => actions.patch({ sheet: true })} style={{ textAlign: 'left', padding: 16, background: 'none', border: '1px solid var(--color-divider)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              <span style={{ display: 'block', fontFamily: 'var(--font-heading)', fontSize: 21 }}>Offline &amp; sync</span>
              <span style={{ display: 'block', fontSize: 13, color: 'var(--color-neutral-700)', marginTop: 2 }}>
                {state.offline ? '3 changes waiting to upload' : '4 projects downloaded for offline use'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
