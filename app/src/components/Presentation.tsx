import type { SessionActions, SessionData } from '../session';
import type { Actions, State } from '../store';

/**
 * Full-screen before/after for the homeowner. Version buttons are generated
 * from what has actually been rendered rather than a fixed A/B pair, so a
 * third or fourth option shows up here the moment it exists.
 */
export function Presentation({
  state,
  session,
  sessionActions,
  actions,
}: {
  state: State;
  session: SessionData;
  sessionActions: SessionActions;
  actions: Actions;
}) {
  const photo = session.photos.find((p) => p.id === session.activePhotoId);
  const before = photo ? session.urls[photo.storagePath] : null;

  const shown =
    session.versions.find((v) => v.id === state.activeVersionId)
    ?? session.versions.find((v) => v.isFavorite)
    ?? session.versions[session.versions.length - 1];
  const after = shown ? session.urls[shown.storagePath] : null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#12202c', zIndex: 40, display: 'flex', flexDirection: 'column' }}>
      <div {...actions.slider} style={{ flex: 1, minHeight: 0, display: 'grid', placeItems: 'center', touchAction: 'none', userSelect: 'none' }}>
        {before ? (
          <div style={{ position: 'relative' }}>
            <img src={before} alt="Today" style={{ maxWidth: '96vw', maxHeight: '82vh', display: 'block' }} />
            {after && (
              <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', width: `${state.sliderPct}%` }}>
                <img src={after} alt="Proposed" style={{ height: '100%', display: 'block', maxWidth: 'none' }} />
              </div>
            )}
            {after && (
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${state.sliderPct}%`, width: 2, background: '#f2f2f3' }}>
                <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 52, height: 52, background: '#f2f2f3', border: '1px solid #12202c', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-heading)', fontSize: 17, color: '#12202c' }}>↔</span>
              </div>
            )}
            <span style={{ position: 'absolute', left: 16, bottom: 16, padding: '8px 14px', background: 'rgba(18,32,44,.85)', color: '#f2f2f3', fontFamily: 'var(--font-heading)', fontSize: 19, letterSpacing: '.04em' }}>
              {shown ? `${shown.name} — ${shown.meta}` : 'Today'}
            </span>
          </div>
        ) : (
          <div style={{ color: '#f2f2f3', textAlign: 'center', maxWidth: 460 }}>
            <h3 style={{ color: '#f2f2f3' }}>Nothing to present yet</h3>
            <p style={{ opacity: .7 }}>Add a photo of the home and render a version first.</p>
          </div>
        )}
      </div>

      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 22px', color: '#f2f2f3', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase', opacity: .55 }}>
          {after ? 'Drag anywhere to reveal' : 'Render a version to compare'}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {session.versions.map((v) => (
            <button
              key={v.id}
              onClick={() => actions.patch({ activeVersionId: v.id })}
              className="btn"
              style={{ height: 52, padding: '0 20px', background: v.id === shown?.id ? 'rgba(89,128,166,.45)' : 'rgba(242,242,243,.1)', border: '1px solid rgba(242,242,243,.35)', color: '#f2f2f3', fontSize: 15 }}
            >
              {v.isFavorite ? `★ ${v.name}` : v.name}
            </button>
          ))}
          {shown && (
            <button
              onClick={() => {
                void sessionActions.favoriteVersion(shown.id);
                actions.flash(`${shown.name} marked as the homeowners' favorite.`);
              }}
              className="btn btn-primary"
              style={{ height: 52, padding: '0 22px', fontSize: 15 }}
            >
              {shown.isFavorite ? `✓ Favorite: ${shown.name}` : 'Mark favorite'}
            </button>
          )}
          <button onClick={() => actions.patch({ presenting: false })} className="btn" style={{ height: 52, padding: '0 20px', background: 'none', border: '1px solid rgba(242,242,243,.35)', color: '#f2f2f3', fontSize: 15 }}>Exit</button>
        </div>
      </div>
    </div>
  );
}
