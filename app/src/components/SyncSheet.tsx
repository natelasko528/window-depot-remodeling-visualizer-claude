import { useCallback, useEffect, useState } from 'react';
import { drain, getStatus, subscribe, type SyncStatus } from '../lib/sync';
import { useDialog } from '../lib/useDialog';
import { isConfigured } from '../lib/supabase';
import type { SessionData } from '../session';
import type { Actions } from '../store';

export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>(getStatus);
  useEffect(() => subscribe(setStatus), []);
  return status;
}

function relative(ts: number | null): string {
  if (!ts) return 'not yet';
  const secs = Math.round((Date.now() - ts) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.round(secs / 60)} min ago`;
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function SyncSheet({ session, actions }: { session: SessionData; actions: Actions }) {
  const status = useSyncStatus();
  const close = useCallback(() => actions.patch({ sheet: false }), [actions]);
  const dialogRef = useDialog<HTMLDivElement>(close);

  const headline = !isConfigured
    ? 'Saved on this tablet'
    : !status.online
      ? 'Working offline'
      : status.pending
        ? 'Catching up'
        : 'Everything is synced';

  const body = !isConfigured
    ? 'No cloud account is configured, so everything stays on this tablet. Photos, selections and renders are still saved and survive a restart.'
    : !status.online
      ? 'No signal. Keep photographing and selecting products — everything is saved here and uploads by itself when you reconnect. New renders need signal.'
      : status.pending
        ? `${status.pending} change${status.pending === 1 ? '' : 's'} still uploading.`
        : 'Photos, selections and versions are on this tablet and in the cloud.';

  const queued = status.pending > 0;
  const rows = [
    {
      name: `${session.customer?.name ?? 'This project'} — photos (${session.photos.length})`,
      detail: session.photos.length ? 'Stored on this tablet' : 'None yet',
      state: queued ? 'Queued' : 'Synced',
    },
    {
      name: `Renders (${session.versions.length})`,
      detail: session.versions.length ? 'Stored on this tablet' : 'None yet',
      state: queued ? 'Queued' : 'Synced',
    },
    {
      name: 'Product catalog & swatches',
      detail: 'ProVia, CertainTeed, ASCEND, Samuel Mueller',
      state: 'Cached',
    },
  ];

  const canRetry = isConfigured && status.online && !status.syncing;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(29,45,61,.45)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Connection and sync" tabIndex={-1} style={{ width: '100%', maxWidth: 780, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderBottom: 0, padding: '22px 24px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11.5, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--color-neutral-600)' }}>Connection</div>
            <h3 style={{ margin: '2px 0 4px' }}>{headline}</h3>
            <p style={{ color: 'var(--color-neutral-700)', margin: 0, maxWidth: '60ch' }}>{body}</p>
            <p style={{ color: 'var(--color-neutral-600)', margin: '6px 0 0', fontSize: 13 }}>
              Last sync {relative(status.lastSyncAt)}
              {status.lastError ? ` · last error: ${status.lastError}` : ''}
            </p>
          </div>
          <button onClick={close} className="btn btn-ghost" style={{ height: 46, padding: '0 14px' }}>Close</button>
        </div>

        <div style={{ display: 'grid', gap: 8, margin: '16px 0 18px' }}>
          {rows.map((r) => (
            <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '1px solid var(--color-divider)', background: '#fff' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: r.state === 'Queued' ? '#c9a227' : '#7fae7a' }} />
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: 14.5 }}>{r.name}</span>
                <span style={{ display: 'block', fontSize: 12.5, color: 'var(--color-neutral-600)' }}>{r.detail}</span>
              </span>
              <span style={{ fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--color-neutral-700)' }}>{r.state}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => { void drain(); actions.flash('Retrying sync…'); }}
          disabled={!canRetry}
          className="btn btn-primary"
          style={{ height: 52, padding: '0 22px', opacity: canRetry ? 1 : .5 }}
        >
          {status.syncing ? 'Syncing…' : 'Retry sync now'}
        </button>
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
