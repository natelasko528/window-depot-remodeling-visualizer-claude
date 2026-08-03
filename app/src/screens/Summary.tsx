import { useState } from 'react';
import { Corners } from '../components/Corners';
import { favName, selectionsFor } from '../derived';
import type { SessionData } from '../session';
import type { Actions } from '../store';

export function Summary({ session, actions }: { session: SessionData; actions: Actions }) {
  const [busy, setBusy] = useState('');

  const rows = selectionsFor(session);
  const favorite = session.versions.find((v) => v.isFavorite) ?? session.versions[session.versions.length - 1] ?? null;
  const alternative = session.versions.find((v) => v.id !== favorite?.id) ?? null;
  const photo = session.photos.find((p) => p.id === session.activePhotoId) ?? session.photos[0] ?? null;

  const slug = (session.customer?.name ?? 'project').replace(/[^a-z0-9]+/gi, '-').toLowerCase();

  // The PDF stack is ~390 kB — loaded when a rep actually exports, not on
  // every app start.
  const exporter = () => import('../lib/export');

  const exportPdf = async () => {
    setBusy('Building the PDF…');
    try {
      const { buildProjectPdf, downloadBlob } = await exporter();
      const blob = await buildProjectPdf(session);
      downloadBlob(blob, `window-depot-${slug}.pdf`);
      actions.flash('PDF saved to this tablet.');
    } catch (err) {
      actions.flash(err instanceof Error ? err.message : 'The PDF could not be built.');
    } finally {
      setBusy('');
    }
  };

  /**
   * Share uses the Web Share API when the device has it — on a tablet that
   * opens the native sheet with Mail, Messages and AirDrop, which is how a rep
   * actually hands this over. Everything else falls back to a download.
   */
  const share = async () => {
    setBusy('Preparing…');
    try {
      const { buildProjectPdf, downloadBlob } = await exporter();
      const blob = await buildProjectPdf(session);
      const file = new File([blob], `window-depot-${slug}.pdf`, { type: 'application/pdf' });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${session.customer?.name ?? 'Your project'} — Window Depot`,
          text: 'Here is the visualization and the selections we went through today.',
        });
        actions.flash('Shared.');
      } else {
        downloadBlob(blob, file.name);
        actions.flash('Sharing is not available on this device — the PDF was downloaded instead.');
      }
    } catch (err) {
      // A user dismissing the share sheet throws AbortError; that is not a failure.
      if (err instanceof Error && err.name === 'AbortError') return;
      actions.flash(err instanceof Error ? err.message : 'Sharing failed.');
    } finally {
      setBusy('');
    }
  };

  const sendToQuoting = async () => {
    const { buildQuotePayload, downloadBlob } = await exporter();
    downloadBlob(
      new Blob([JSON.stringify(buildQuotePayload(session), null, 2)], { type: 'application/json' }),
      `window-depot-${slug}-quote.json`,
    );
    actions.flash('Quote package exported.');
  };

  const disabled = !session.customer;

  return (
    <section style={{ height: '100%', overflowY: 'auto', padding: '26px 34px 40px' }}>
      <div style={{ maxWidth: 1320, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 18, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11.5, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--color-neutral-600)' }}>Project summary</div>
            <h2 style={{ margin: '2px 0 0' }}>{session.customer?.name ?? 'No customer selected'}</h2>
            <p style={{ color: 'var(--color-neutral-700)', margin: '2px 0 0' }}>
              {session.customer?.address || 'Pick a customer to build the summary.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button onClick={() => void exportPdf()} disabled={disabled || Boolean(busy)} className="btn btn-secondary" style={{ height: 50, padding: '0 16px', opacity: disabled || busy ? .5 : 1 }}>
              {busy || 'Export PDF'}
            </button>
            <button onClick={() => void share()} disabled={disabled || Boolean(busy)} className="btn btn-secondary" style={{ height: 50, padding: '0 16px', opacity: disabled || busy ? .5 : 1 }}>
              Share with homeowner
            </button>
            <button onClick={() => void sendToQuoting()} disabled={disabled} className="btn btn-primary" style={{ height: 50, padding: '0 20px', opacity: disabled ? .5 : 1 }}>
              Send to quoting
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18 }}>
          <div className="blueprint" style={{ padding: 14 }}>
            <Corners />
            <div style={{ fontSize: 11.5, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--color-neutral-600)', marginBottom: 8 }}>
              Preferred design — {favName(session)}
            </div>
            {favorite && session.urls[favorite.storagePath] ? (
              <img src={session.urls[favorite.storagePath]} alt="Preferred visualization" style={{ width: '100%', border: '1px solid var(--color-divider)' }} />
            ) : (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--color-neutral-600)', border: '1px dashed var(--color-divider)' }}>
                No version rendered yet.
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <div>
                <div style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--color-neutral-600)', marginBottom: 5 }}>Today</div>
                {photo && session.urls[photo.storagePath] && (
                  <img src={session.urls[photo.storagePath]} alt="Original" style={{ width: '100%', border: '1px solid var(--color-divider)' }} />
                )}
              </div>
              {alternative && session.urls[alternative.storagePath] && (
                <div>
                  <div style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--color-neutral-600)', marginBottom: 5 }}>
                    Alternative — {alternative.name}
                  </div>
                  <img src={session.urls[alternative.storagePath]} alt="Alternative visualization" style={{ width: '100%', border: '1px solid var(--color-divider)' }} />
                </div>
              )}
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
                      <span style={{ display: 'block', fontSize: 12.5, color: 'var(--color-neutral-600)' }}>
                        {[s.cat, s.where, s.price].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </div>
                ))}
                {!rows.length && (
                  <p style={{ margin: 0, fontSize: 13.5, color: 'var(--color-neutral-600)' }}>Nothing selected yet.</p>
                )}
              </div>
            </div>

            {session.customer?.notes && (
              <div style={{ padding: 16, border: '1px solid var(--color-divider)' }}>
                <h4 style={{ margin: '0 0 6px' }}>Notes</h4>
                <p style={{ fontSize: 14, margin: 0, color: 'var(--color-neutral-800)' }}>{session.customer.notes}</p>
              </div>
            )}

            <div style={{ padding: 16, background: 'var(--color-accent-900)', color: '#f2f2f3' }}>
              <h4 style={{ margin: '0 0 6px', color: '#f2f2f3' }}>Ready for the next step</h4>
              <p style={{ fontSize: 14, opacity: .8, margin: '0 0 12px' }}>
                Selections, photos and every version travel with the quote. Nothing needs re-entering.
              </p>
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
