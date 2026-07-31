import { useState } from 'react';
import { PAPER, STEEL } from '../data';
import type { SessionActions, SessionData } from '../session';
import type { Actions, CompareMode, State } from '../store';

const MODES: { name: string; k: CompareMode }[] = [
  { name: 'Before / after', k: 'original' },
  { name: 'Slider', k: 'slider' },
  { name: 'Side by side', k: 'side' },
];

export function Compare({
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
  const photo = session.photos.find((p) => p.id === session.activePhotoId) ?? null;
  const before = photo ? session.urls[photo.storagePath] : null;

  // Which two versions the slider and side-by-side modes compare. Defaults to
  // the two most recent renders, since that is what the rep just made.
  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);

  const versions = session.versions;
  const left = versions.find((v) => v.id === leftId) ?? versions[versions.length - 2] ?? versions[0] ?? null;
  const right = versions.find((v) => v.id === rightId) ?? versions[versions.length - 1] ?? null;

  const srcLeft = left ? session.urls[left.storagePath] : null;
  const srcRight = right ? session.urls[right.storagePath] : null;

  const favorite = versions.find((v) => v.isFavorite) ?? null;
  const proposed = favorite ?? right;
  const srcProposed = proposed ? session.urls[proposed.storagePath] : null;

  if (!versions.length) {
    return (
      <section style={{ height: '100%', background: 'var(--color-accent-900)', display: 'grid', placeItems: 'center', color: '#f2f2f3' }}>
        <div style={{ textAlign: 'center', maxWidth: 440 }}>
          <h3 style={{ color: '#f2f2f3' }}>Nothing to compare yet</h3>
          <p style={{ opacity: .7 }}>Render at least one version, then come back.</p>
          <button onClick={actions.go('visualizer')} className="btn btn-primary" style={{ height: 50, padding: '0 20px' }}>Back to design</button>
        </div>
      </section>
    );
  }

  const picker = (label: string, value: string | null, set: (id: string) => void) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(242,242,243,.75)' }}>
      {label}
      <select
        value={value ?? ''}
        onChange={(e) => set(e.target.value)}
        style={{ height: 40, padding: '0 10px', background: 'rgba(242,242,243,.1)', color: PAPER, border: '1px solid rgba(242,242,243,.3)', fontFamily: 'var(--font-body)', fontSize: 13.5 }}
      >
        {versions.map((v) => (
          <option key={v.id} value={v.id} style={{ color: '#1d2d3d' }}>{v.name}</option>
        ))}
      </select>
    </label>
  );

  return (
    <section style={{ height: '100%', background: 'var(--color-accent-900)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', color: '#f2f2f3', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-heading)', fontSize: 21 }}>Compare designs</span>
        <div style={{ display: 'flex', gap: 6, marginLeft: 12 }}>
          {MODES.map((m) => (
            <button
              key={m.k}
              onClick={() => actions.patch({ compare: m.k })}
              style={{ height: 44, padding: '0 16px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13.5, letterSpacing: '.06em', textTransform: 'uppercase', background: state.compare === m.k ? STEEL : 'rgba(242,242,243,.08)', border: `1px solid ${state.compare === m.k ? STEEL : 'rgba(242,242,243,.25)'}`, color: PAPER }}
            >
              {m.name}
            </button>
          ))}
        </div>
        {state.compare !== 'original' && versions.length > 1 && (
          <div style={{ display: 'flex', gap: 12, marginLeft: 12 }}>
            {picker('Left', left?.id ?? null, setLeftId)}
            {picker('Right', right?.id ?? null, setRightId)}
          </div>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={actions.go('visualizer')} className="btn" style={{ height: 46, padding: '0 16px', background: 'rgba(242,242,243,.1)', border: '1px solid rgba(242,242,243,.3)', color: '#f2f2f3' }}>Back to design</button>
          <button onClick={() => actions.patch({ presenting: true })} className="btn btn-primary" style={{ height: 46, padding: '0 18px' }}>Present full screen</button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, padding: '0 18px 14px', display: 'grid', gridTemplateRows: 'minmax(0, 1fr)', placeItems: 'center', alignItems: 'stretch', overflow: 'hidden' }}>
        {state.compare === 'slider' && srcLeft && srcRight && (
          <div {...actions.slider} style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%', minHeight: 0, touchAction: 'none', cursor: 'ew-resize', userSelect: 'none' }}>
            <img src={srcRight} alt={right?.name} style={{ maxWidth: '100%', maxHeight: '100%', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', width: `${state.sliderPct}%` }}>
              <img src={srcLeft} alt={left?.name} style={{ height: '100%', display: 'block', maxWidth: 'none' }} />
            </div>
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${state.sliderPct}%`, width: 2, background: '#f2f2f3', boxShadow: '0 0 0 1px rgba(29,45,61,.5)' }}>
              <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 46, height: 46, background: '#f2f2f3', border: '1px solid var(--color-accent-900)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-heading)', fontSize: 15, color: 'var(--color-accent-900)' }}>↔</span>
            </div>
            <span style={{ position: 'absolute', left: 14, top: 14, padding: '7px 12px', background: 'rgba(29,45,61,.86)', color: '#f2f2f3', fontFamily: 'var(--font-heading)', fontSize: 17 }}>{left?.name} — {left?.meta}</span>
            <span style={{ position: 'absolute', right: 14, top: 14, padding: '7px 12px', background: 'rgba(29,45,61,.86)', color: '#f2f2f3', fontFamily: 'var(--font-heading)', fontSize: 17 }}>{right?.name} — {right?.meta}</span>
          </div>
        )}

        {state.compare === 'side' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, width: '100%', maxWidth: 1500, height: '100%', alignItems: 'stretch' }}>
            {[left, right].filter((v): v is NonNullable<typeof v> => Boolean(v)).map((v) => (
              <div key={v.id} style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                {session.urls[v.storagePath] && (
                  <img src={session.urls[v.storagePath]} alt={v.name} style={{ width: '100%', flex: 1, minHeight: 0, objectFit: 'contain', border: '1px solid rgba(242,242,243,.25)' }} />
                )}
                <div style={{ flex: 'none', color: '#f2f2f3', paddingTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: 21 }}>{v.name} — {v.meta}</span>
                  <button
                    onClick={() => { void sessionActions.favoriteVersion(v.id); actions.flash(`${v.name} marked as the homeowners' favorite.`); }}
                    className="btn"
                    style={{ height: 44, padding: '0 16px', background: v.isFavorite ? STEEL : 'rgba(242,242,243,.08)', border: '1px solid rgba(242,242,243,.35)', color: PAPER }}
                  >
                    {v.isFavorite ? '✓ Favorite' : 'Mark favorite'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {state.compare === 'original' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, width: '100%', maxWidth: 1500, height: '100%', alignItems: 'stretch' }}>
            <div style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              {before && <img src={before} alt="Today" style={{ width: '100%', flex: 1, minHeight: 0, objectFit: 'contain', border: '1px solid rgba(242,242,243,.25)' }} />}
              <div style={{ flex: 'none', color: '#f2f2f3', paddingTop: 10, fontFamily: 'var(--font-heading)', fontSize: 21 }}>Today</div>
            </div>
            <div style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              {srcProposed && <img src={srcProposed} alt="Proposed" style={{ width: '100%', flex: 1, minHeight: 0, objectFit: 'contain', border: '1px solid rgba(242,242,243,.25)' }} />}
              <div style={{ flex: 'none', color: '#f2f2f3', paddingTop: 10, fontFamily: 'var(--font-heading)', fontSize: 21 }}>
                Proposed — {proposed ? `${proposed.name} · ${proposed.meta}` : '—'}
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: 'none', borderTop: '1px solid rgba(242,242,243,.15)', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 16, color: '#f2f2f3', flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13.5, opacity: .75 }}>
          {favorite
            ? `Marked as the homeowners' favorite: ${favorite.name}. It leads the summary.`
            : 'Ask which one they keep coming back to, then mark it.'}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={actions.go('selections')} className="btn btn-primary" style={{ height: 48, padding: '0 22px' }}>Save selections</button>
        </div>
      </div>
    </section>
  );
}
