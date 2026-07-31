import { useEffect, useState } from 'react';
import { Corners } from '../components/Corners';
import * as repo from '../lib/repo';
import type { Customer } from '../lib/types';
import type { SessionActions, SessionData } from '../session';
import type { Actions } from '../store';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function when(iso: string): string {
  const date = new Date(iso);
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days === 0) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (days === 1) return 'Yesterday';
  if (days < 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString();
}

export function Home({
  session,
  sessionActions,
  actions,
}: {
  session: SessionData;
  sessionActions: SessionActions;
  actions: Actions;
}) {
  const [recent, setRecent] = useState<Customer[]>([]);

  // Reloads whenever the open customer changes, so a customer added or edited
  // mid-appointment shows up here without a refresh.
  useEffect(() => {
    let cancelled = false;
    void repo.listCustomers().then((rows) => {
      if (!cancelled) setRecent(rows);
    });
    return () => { cancelled = true; };
  }, [session.customer]);

  const open = async (customer: Customer) => {
    await sessionActions.openCustomer(customer.id);
    actions.patch({ screen: 'photos' });
  };

  return (
    <section style={{ height: '100%', overflowY: 'auto', padding: '30px 34px 40px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(360px, 1.05fr) minmax(420px, 1.6fr)', gap: 30, alignItems: 'start', maxWidth: 1500, margin: '0 auto' }}>

        <div>
          <div style={{ fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--color-neutral-600)', marginBottom: 6 }}>
            {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          <h1 style={{ fontSize: 46, margin: '0 0 4px' }}>{greeting()}.</h1>
          <p style={{ color: 'var(--color-neutral-700)', fontSize: 16, maxWidth: '46ch' }}>
            Everything on this tablet works without signal — photos, selections and saved
            renders. Start whenever you're ready.
          </p>

          <div className="blueprint" style={{ marginTop: 22, background: 'var(--color-accent-900)', color: '#f2f2f3', padding: '26px 26px 24px' }}>
            <Corners />
            <div style={{ fontSize: 11.5, letterSpacing: '.2em', textTransform: 'uppercase', opacity: .6 }}>Primary action</div>
            <h2 style={{ fontSize: 34, margin: '8px 0 6px', color: '#f2f2f3' }}>Start new visualization</h2>
            <p style={{ opacity: .7, fontSize: 14.5, marginBottom: 20 }}>
              Photograph the home, confirm the areas, pick products, show the finished result.
            </p>
            <button onClick={actions.go('customers')} className="btn btn-primary" style={{ width: '100%', height: 62, fontSize: 19, letterSpacing: '.06em', textTransform: 'uppercase', fontFamily: 'var(--font-heading)', justifyContent: 'center' }}>
              Find the customer
            </button>
            {session.customer && (
              <button
                onClick={actions.go(session.photos.length ? 'areas' : 'photos')}
                className="btn"
                style={{ width: '100%', height: 52, marginTop: 10, background: 'rgba(242,242,243,.08)', border: '1px solid rgba(242,242,243,.3)', color: '#f2f2f3', fontSize: 14.5, justifyContent: 'center' }}
              >
                Continue — {session.customer.name}
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 22 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>Customers on this tablet</h3>
              <span style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--color-neutral-600)' }}>
                {recent.length || 'none'}
              </span>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {recent.slice(0, 4).map((c) => (
                <button
                  key={c.id}
                  onClick={() => void open(c)}
                  className="blueprint"
                  style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center', textAlign: 'left', padding: 14, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                >
                  <Corners />
                  <span style={{ display: 'block', minWidth: 0 }}>
                    <span style={{ display: 'block', fontFamily: 'var(--font-heading)', fontSize: 21, letterSpacing: '.01em' }}>{c.name}</span>
                    <span style={{ display: 'block', fontSize: 13, color: 'var(--color-neutral-700)' }}>{c.address || 'No address on file'}</span>
                    {c.badge && (
                      <span style={{ display: 'flex', gap: 6, marginTop: 7 }}>
                        <span className="tag tag-outline" style={{ fontSize: 11, height: 'auto' }}>{c.badge}</span>
                      </span>
                    )}
                  </span>
                  <span style={{ display: 'block', textAlign: 'right', paddingRight: 6, fontSize: 12, color: 'var(--color-neutral-600)' }}>
                    {when(c.updatedAt)}
                  </span>
                </button>
              ))}
              {!recent.length && (
                <div className="blueprint" style={{ padding: 18 }}>
                  <Corners />
                  <p style={{ margin: 0, color: 'var(--color-neutral-700)', fontSize: 14.5 }}>
                    No customers yet. Add the one you're sitting with and the project starts from there.
                  </p>
                </div>
              )}
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
                Connection, queued changes and what is stored on this tablet
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
