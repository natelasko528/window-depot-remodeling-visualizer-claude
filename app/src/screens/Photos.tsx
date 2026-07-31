import { useRef, useState } from 'react';
import { Corners } from '../components/Corners';
import { CameraSheet } from '../components/CameraSheet';
import { INK } from '../data';
import { preparePhoto } from '../lib/image';
import type { SessionActions, SessionData } from '../session';
import type { Actions } from '../store';

export function Photos({
  session,
  sessionActions,
  actions,
}: {
  session: SessionData;
  sessionActions: SessionActions;
  actions: Actions;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [camera, setCamera] = useState(false);
  const [busy, setBusy] = useState('');

  const active = session.photos.find((p) => p.id === session.activePhotoId) ?? null;

  const ingest = async (files: Blob[]) => {
    if (!session.project) {
      actions.flash('Pick a customer first — photos are saved against their project.');
      return;
    }
    setBusy(files.length > 1 ? `Adding ${files.length} photos…` : 'Adding photo…');
    try {
      for (const file of files) {
        const prepared = await preparePhoto(file);
        await sessionActions.addPhoto(prepared.blob, {
          width: prepared.width,
          height: prepared.height,
        });
      }
      actions.flash(files.length > 1 ? `${files.length} photos saved.` : 'Photo saved to this project.');
    } catch (err) {
      actions.flash(err instanceof Error ? err.message : 'That photo could not be read.');
    } finally {
      setBusy('');
    }
  };

  return (
    <section style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {camera && (
        <CameraSheet
          onClose={() => setCamera(false)}
          onCapture={(blob) => {
            setCamera(false);
            void ingest([blob]);
          }}
        />
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (files.length) void ingest(files);
        }}
      />

      <div style={{ flex: 'none', padding: '22px 28px 12px' }}>
        <h2 style={{ margin: '0 0 2px' }}>Photos of the home</h2>
        <div style={{ fontSize: 13.5, color: 'var(--color-neutral-700)' }}>
          {active
            ? `${active.label} · ${active.width}×${active.height} · captured ${new Date(active.capturedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
            : 'No photos yet — take one of the elevation you are quoting.'}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 330px', gap: 20, padding: '0 28px 22px' }}>
        <div className="blueprint" style={{ position: 'relative', display: 'grid', placeItems: 'center', minHeight: 0, background: 'var(--color-neutral-100)', overflow: 'hidden' }}>
          <Corners />
          {active && session.urls[active.storagePath] ? (
            <img
              src={session.urls[active.storagePath]}
              alt={active.label}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: 30, maxWidth: 420 }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, marginBottom: 6 }}>
                {busy || 'Nothing here yet'}
              </div>
              <p style={{ color: 'var(--color-neutral-700)', fontSize: 14.5, margin: 0 }}>
                Every render works from the photo you pick here, so get the whole
                elevation in frame with the light behind you.
              </p>
            </div>
          )}
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', minHeight: 0, gap: 12 }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <button onClick={() => setCamera(true)} className="btn btn-primary" style={{ height: 56, justifyContent: 'center', fontSize: 17 }}>
              Take photo
            </button>
            <button onClick={() => fileRef.current?.click()} className="btn btn-secondary" style={{ height: 50, justifyContent: 'center' }}>
              Upload from tablet
            </button>
          </div>

          <div style={{ fontSize: 11.5, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--color-neutral-600)', marginTop: 4 }}>
            This project ({session.photos.length})
          </div>

          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'grid', gap: 8, alignContent: 'start' }}>
            {session.photos.map((photo) => {
              const on = photo.id === session.activePhotoId;
              const url = session.urls[photo.storagePath];
              return (
                <div
                  key={photo.id}
                  style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 6, background: on ? '#fff' : 'transparent', border: `1px solid ${on ? INK : 'var(--color-divider)'}` }}
                >
                  <button
                    onClick={() => void sessionActions.setActivePhoto(photo.id)}
                    style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1, minWidth: 0, background: 'none', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)' }}
                  >
                    <span style={{ width: 64, height: 46, flex: 'none', overflow: 'hidden', background: 'var(--color-neutral-200)' }}>
                      {url && <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontFamily: 'var(--font-heading)', fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {photo.label}
                      </span>
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--color-neutral-600)' }}>
                        {on ? 'In use' : `${photo.width}×${photo.height}`}
                      </span>
                    </span>
                  </button>
                  <button
                    onClick={() => void sessionActions.deletePhoto(photo.id)}
                    aria-label={`Delete ${photo.label}`}
                    style={{ flex: 'none', width: 34, height: 34, cursor: 'pointer', background: 'none', border: '1px solid var(--color-divider)', fontSize: 15, lineHeight: 1 }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
            {!session.photos.length && (
              <p style={{ fontSize: 13.5, color: 'var(--color-neutral-600)', margin: 0, lineHeight: 1.7 }}>
                Photos are saved on this tablet immediately and upload when there
                is signal.
              </p>
            )}
          </div>

          <button
            onClick={actions.go('areas')}
            disabled={!active}
            className="btn btn-primary"
            style={{ height: 56, justifyContent: 'center', opacity: active ? 1 : .45, fontFamily: 'var(--font-heading)', letterSpacing: '.06em', textTransform: 'uppercase' }}
          >
            Find the areas
          </button>
        </aside>
      </div>
    </section>
  );
}
