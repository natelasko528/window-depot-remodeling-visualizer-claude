import { useEffect, useState } from 'react';
import { Corners } from '../components/Corners';
import * as repo from '../lib/repo';
import type { Customer } from '../lib/types';
import type { SessionActions, SessionData } from '../session';
import type { Actions } from '../store';

const BLANK = { name: '', address: '', phone: '', email: '', notes: '', badge: '' };

export function Customers({
  session,
  sessionActions,
  actions,
}: {
  session: SessionData;
  sessionActions: SessionActions;
  actions: Actions;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [form, setForm] = useState<typeof BLANK & { id?: string } | null>(null);

  // Reruns on every keystroke and after a save, so the list always reflects
  // what is actually stored rather than a stale snapshot.
  useEffect(() => {
    let cancelled = false;
    void repo.searchCustomers(query).then((rows) => {
      if (!cancelled) setResults(rows);
    });
    return () => { cancelled = true; };
  }, [query, session.customer]);

  const open = async (customer: Customer) => {
    await sessionActions.openCustomer(customer.id);
    actions.patch({ screen: 'photos' });
    actions.flash(`${customer.name} — project open.`);
  };

  const save = async () => {
    if (!form?.name.trim()) {
      actions.flash('A name is the one field we need.');
      return;
    }
    const saved = await repo.saveCustomer({ ...form, name: form.name.trim() });
    setForm(null);
    setQuery('');
    await sessionActions.openCustomer(saved.id);
    actions.flash(`${saved.name} saved.`);
  };

  return (
    <section style={{ height: '100%', overflowY: 'auto', padding: '28px 34px 40px' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <h2 style={{ margin: '0 0 2px' }}>Who are we sitting with?</h2>
        <p style={{ color: 'var(--color-neutral-700)', marginBottom: 18 }}>
          Search what is already on this tablet, or add someone new.
        </p>

        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <input
            className="input"
            placeholder="Name, address or phone"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ flex: 1, height: 58, fontSize: 18, padding: '0 16px' }}
          />
          <button
            onClick={() => setForm(form ? null : { ...BLANK })}
            className="btn btn-secondary"
            style={{ height: 58, padding: '0 22px', fontSize: 15 }}
          >
            {form ? 'Cancel' : 'Add new customer'}
          </button>
        </div>

        {form && (
          <div className="blueprint" style={{ padding: 20, marginBottom: 22 }}>
            <Corners />
            <h4 style={{ margin: '0 0 12px' }}>{form.id ? 'Edit customer' : 'New customer'}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {([
                ['name', 'Name'], ['address', 'Address'],
                ['phone', 'Phone'], ['email', 'Email'], ['badge', 'Label'],
              ] as const).map(([key, label]) => (
                <label key={key} style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--color-neutral-700)' }}>
                  {label}
                  <input
                    className="input"
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    style={{ height: 50, fontSize: 15, padding: '0 12px' }}
                  />
                </label>
              ))}
              <label style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--color-neutral-700)', gridColumn: '1 / -1' }}>
                Notes
                <textarea
                  className="input"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  style={{ fontSize: 15, padding: 12 }}
                />
              </label>
            </div>
            <button onClick={() => void save()} className="btn btn-primary" style={{ height: 52, padding: '0 22px', marginTop: 14 }}>
              Save and open
            </button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {results.map((c) => (
            <div key={c.id} className="blueprint" style={{ padding: 18 }}>
              <Corners />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <h4 style={{ margin: 0 }}>{c.name}</h4>
                  <div style={{ fontSize: 13.5, color: 'var(--color-neutral-700)' }}>{c.address}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-neutral-600)', marginTop: 3 }}>
                    {[c.phone, c.email].filter(Boolean).join(' · ')}
                  </div>
                </div>
                {c.badge && <span className="tag tag-accent" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{c.badge}</span>}
              </div>
              {c.notes && (
                <div style={{ margin: '14px 0', padding: '10px 12px', background: 'var(--color-neutral-100)', borderLeft: '2px solid var(--color-accent)', fontSize: 13.5 }}>
                  {c.notes}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                <button onClick={() => void open(c)} className="btn btn-primary" style={{ height: 48, padding: '0 18px' }}>
                  Select &amp; continue
                </button>
                <button
                  onClick={() => setForm({ ...c })}
                  className="btn btn-ghost"
                  style={{ height: 48, padding: '0 14px' }}
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>

        {!results.length && !form && (
          <div style={{ padding: '30px 0', color: 'var(--color-neutral-700)' }}>
            {query
              ? `Nobody on this tablet matches “${query}”.`
              : 'No customers yet. Add the one you are sitting with.'}
          </div>
        )}
      </div>
    </section>
  );
}
