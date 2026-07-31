import { Corners } from '../components/Corners';
import { CUSTOMERS } from '../data';
import type { Actions } from '../store';

export function Customers({ actions }: { actions: Actions }) {
  return (
    <section style={{ height: '100%', overflowY: 'auto', padding: '28px 34px 40px' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <h2 style={{ margin: '0 0 2px' }}>Who are we sitting with?</h2>
        <p style={{ color: 'var(--color-neutral-700)', marginBottom: 18 }}>Search first — most appointments are already on the tablet from the schedule.</p>
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <input className="input" placeholder="Name, address or phone" style={{ flex: 1, height: 58, fontSize: 18, padding: '0 16px' }} />
          <button onClick={() => actions.flash('New customer form — name, address, phone, email, notes.')} className="btn btn-secondary" style={{ height: 58, padding: '0 22px', fontSize: 15 }}>Add new customer</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {CUSTOMERS.map((c) => (
            <div key={c.name} className="blueprint" style={{ padding: 18 }}>
              <Corners />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <h4 style={{ margin: 0 }}>{c.name}</h4>
                  <div style={{ fontSize: 13.5, color: 'var(--color-neutral-700)' }}>{c.address}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-neutral-600)', marginTop: 3 }}>{c.phone} · {c.email}</div>
                </div>
                <span className="tag tag-accent" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{c.badge}</span>
              </div>
              <div style={{ margin: '14px 0', padding: '10px 12px', background: 'var(--color-neutral-100)', borderLeft: '2px solid var(--color-accent)', fontSize: 13.5 }}>{c.note}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={actions.go('setup')} className="btn btn-primary" style={{ height: 48, padding: '0 18px' }}>Select &amp; continue</button>
                <button onClick={actions.go('setup')} className="btn btn-ghost" style={{ height: 48, padding: '0 14px' }}>Past projects ({c.projects})</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
