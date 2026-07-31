import { Corners } from '../components/Corners';
import { selectionsFor } from '../derived';
import type { Actions, State } from '../store';

export function Selections({ state, actions }: { state: State; actions: Actions }) {
  const rows = selectionsFor(state);

  return (
    <section style={{ height: '100%', overflowY: 'auto', padding: '26px 34px 40px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: '0 0 2px' }}>Project selections</h2>
            <p style={{ color: 'var(--color-neutral-700)', margin: 0 }}>Everything chosen in this appointment. Tap a row to change it — the visualization updates with it.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={actions.go('visualizer')} className="btn btn-secondary" style={{ height: 52, padding: '0 18px' }}>Keep designing</button>
            <button
              onClick={() => { actions.patch({ screen: 'summary' }); actions.flash('Selections marked final and saved to the project.'); }}
              className="btn btn-primary"
              style={{ height: 52, padding: '0 22px', fontFamily: 'var(--font-heading)', fontSize: 16, letterSpacing: '.06em', textTransform: 'uppercase' }}
            >
              Mark final — summary
            </button>
          </div>
        </div>
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
                  <button onClick={actions.go('visualizer')} className="btn btn-ghost" style={{ height: 44, padding: '0 14px' }}>Change</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18, marginTop: 22 }}>
          <div className="blueprint" style={{ padding: 16 }}>
            <Corners />
            <h4 style={{ margin: '0 0 6px' }}>Appointment notes</h4>
            <textarea
              defaultValue="Kathy prefers the warmer cream (B); Dan likes the white. Both agreed on Moiré Black roof. Patio door handle in brass. Wants the rear elevation done first — pool party in August."
              style={{ width: '100%', minHeight: 108, padding: 12, border: '1px solid var(--color-divider)', fontFamily: 'var(--font-body)', fontSize: 14.5, resize: 'none', background: '#fff' }}
            />
          </div>
          <div style={{ padding: 16, border: '1px solid var(--color-accent-300)', background: 'var(--color-accent-100)' }}>
            <h4 style={{ margin: '0 0 6px' }}>Not visualized yet</h4>
            <p style={{ fontSize: 14, margin: '0 0 12px', color: 'var(--color-neutral-800)' }}>Gutters and soffit are in the selections but no photo shows the left elevation clearly.</p>
            <button onClick={actions.go('photos')} className="btn btn-secondary" style={{ height: 48 }}>Add left elevation photo</button>
          </div>
        </div>
      </div>
    </section>
  );
}
