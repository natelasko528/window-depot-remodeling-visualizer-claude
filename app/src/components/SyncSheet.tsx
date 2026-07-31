import type { Actions, State } from '../store';

export function SyncSheet({ state, actions }: { state: State; actions: Actions }) {
  const rows = [
    { name: 'Nowak — rear elevation photos (4)', detail: '18.2 MB', state: state.offline ? 'Queued' : 'Synced', dot: state.offline ? '#c9a227' : '#7fae7a' },
    { name: 'Nowak — Option A render', detail: 'Saved locally 2:31 PM', state: state.offline ? 'Queued' : 'Synced', dot: state.offline ? '#c9a227' : '#7fae7a' },
    { name: 'Product catalog & swatches', detail: 'ProVia, CertainTeed, ASCEND, Samuel Mueller', state: 'Cached', dot: '#7fae7a' },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(29,45,61,.45)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 780, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderBottom: 0, padding: '22px 24px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11.5, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--color-neutral-600)' }}>Connection</div>
            <h3 style={{ margin: '2px 0 4px' }}>{state.offline ? 'Working offline' : 'Everything is synced'}</h3>
            <p style={{ color: 'var(--color-neutral-700)', margin: 0, maxWidth: '60ch' }}>
              {state.offline
                ? 'The tablet lost Wi-Fi at 2:22 PM. You can keep photographing, selecting products and comparing saved versions — new AI renders wait until signal returns. Nothing is lost.'
                : 'Photos, selections and versions are on this tablet and in the cloud. Four projects are downloaded so you can work with no signal.'}
            </p>
          </div>
          <button onClick={() => actions.patch({ sheet: false })} className="btn btn-ghost" style={{ height: 46, padding: '0 14px' }}>Close</button>
        </div>
        <div style={{ display: 'grid', gap: 8, margin: '16px 0 18px' }}>
          {rows.map((r) => (
            <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '1px solid var(--color-divider)', background: '#fff' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: r.dot }} />
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: 14.5 }}>{r.name}</span>
                <span style={{ display: 'block', fontSize: 12.5, color: 'var(--color-neutral-600)' }}>{r.detail}</span>
              </span>
              <span style={{ fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--color-neutral-700)' }}>{r.state}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={actions.toggleOffline} className="btn btn-secondary" style={{ height: 52, padding: '0 18px' }}>
            {state.offline ? 'Simulate reconnecting' : 'Simulate losing signal'}
          </button>
          <button onClick={() => actions.patch({ sheet: false })} className="btn btn-primary" style={{ height: 52, padding: '0 22px' }}>Retry sync now</button>
        </div>
      </div>
    </div>
  );
}

export function Toast({ message }: { message: string }) {
  return (
    <div style={{ position: 'fixed', left: '50%', bottom: 26, transform: 'translateX(-50%)', zIndex: 60, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: 'var(--color-accent-900)', color: '#f2f2f3', border: '1px solid rgba(242,242,243,.25)', maxWidth: 640 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-accent-300)' }} />
      <span style={{ fontSize: 14.5 }}>{message}</span>
    </div>
  );
}
