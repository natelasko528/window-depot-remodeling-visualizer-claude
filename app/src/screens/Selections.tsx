import { useEffect, useState } from 'react';
import { Corners } from '../components/Corners';
import { selectionsFor } from '../derived';
import * as repo from '../lib/repo';
import type { SessionData } from '../session';
import type { Actions } from '../store';

export function Selections({ session, actions }: { session: SessionData; actions: Actions }) {
  const rows = selectionsFor(session);
  const [notes, setNotes] = useState(session.customer?.notes ?? '');

  useEffect(() => setNotes(session.customer?.notes ?? ''), [session.customer]);

  // Notes save on blur rather than per keystroke — one outbox entry per edit
  // instead of one per character.
  const saveNotes = () => {
    const customer = session.customer;
    if (!customer || notes === customer.notes) return;
    void repo.saveCustomer({ ...customer, notes });
    actions.flash('Notes saved.');
  };

  const uncovered = rows.filter((r) => r.where === 'Quoted, not visualized');

  return (
    <section style={{ height: '100%', overflowY: 'auto', padding: '26px 34px 40px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: '0 0 2px' }}>Project selections</h2>
            <p style={{ color: 'var(--color-neutral-700)', margin: 0 }}>
              Everything chosen in this appointment. Tap a row to change it — the visualization updates with it.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={actions.go('visualizer')} className="btn btn-secondary" style={{ height: 52, padding: '0 18px' }}>Keep designing</button>
            <button
              onClick={() => { actions.patch({ screen: 'summary' }); actions.flash('Selections marked final.'); }}
              className="btn btn-primary"
              style={{ height: 52, padding: '0 22px', fontFamily: 'var(--font-heading)', fontSize: 16, letterSpacing: '.06em', textTransform: 'uppercase' }}
            >
              Mark final — summary
            </button>
          </div>
        </div>

        {rows.length ? (
          <table className="table" style={{ width: '100%', fontSize: 14.5 }}>
            <thead>
              <tr>
                {['Category', 'Product line', 'Configuration', 'Color / finish', 'Where', 'Version'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 12px' }}>{h}</th>
                ))}
                <th style={{ textAlign: 'right', padding: '10px 12px' }} />
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.cat}>
                  <td style={{ padding: '14px 12px', fontFamily: 'var(--font-heading)', fontSize: 19 }}>{s.cat}</td>
                  <td style={{ padding: '14px 12px' }}>{s.line}</td>
                  <td style={{ padding: '14px 12px', color: 'var(--color-neutral-700)' }}>{s.config}</td>
                  <td style={{ padding: '14px 12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <span style={{ width: 26, height: 26, border: '1px solid var(--color-neutral-400)', background: s.hex }} />
                      <span>{s.color}</span>
                    </span>
                  </td>
                  <td style={{ padding: '14px 12px', color: 'var(--color-neutral-700)' }}>{s.where}</td>
                  <td style={{ padding: '14px 12px' }}><span className="tag tag-accent" style={{ fontSize: 11 }}>{s.version}</span></td>
                  <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                    <button
                      onClick={() => actions.patch({ panelTab: s.cat, screen: 'visualizer' })}
                      className="btn btn-ghost"
                      style={{ height: 44, padding: '0 14px' }}
                    >
                      Change
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '30px 0', color: 'var(--color-neutral-700)' }}>
            Nothing selected yet. Confirm areas on the photo, then pick products.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18, marginTop: 22 }}>
          <div className="blueprint" style={{ padding: 16 }}>
            <Corners />
            <h4 style={{ margin: '0 0 6px' }}>Appointment notes</h4>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={saveNotes}
              disabled={!session.customer}
              placeholder={session.customer ? 'What did they say? Who decides? What are they worried about?' : 'Pick a customer first.'}
              style={{ width: '100%', minHeight: 108, padding: 12, border: '1px solid var(--color-divider)', fontFamily: 'var(--font-body)', fontSize: 14.5, resize: 'vertical', background: '#fff' }}
            />
          </div>

          {uncovered.length > 0 && (
            <div style={{ padding: 16, border: '1px solid var(--color-accent-300)', background: 'var(--color-accent-100)' }}>
              <h4 style={{ margin: '0 0 6px' }}>Not visualized yet</h4>
              <p style={{ fontSize: 14, margin: '0 0 12px', color: 'var(--color-neutral-800)' }}>
                {uncovered.map((r) => r.cat).join(', ')} {uncovered.length === 1 ? 'is' : 'are'} in the selections but
                no confirmed area on this photo covers {uncovered.length === 1 ? 'it' : 'them'}.
              </p>
              <button onClick={actions.go('photos')} className="btn btn-secondary" style={{ height: 48 }}>Add another elevation</button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
