import { Corners } from '../components/Corners';
import { BEFORE, INK, PHOTO_STRIP } from '../data';
import type { Actions } from '../store';

export function Photos({ actions }: { actions: Actions }) {
  return (
    <section style={{ height: '100%', display: 'grid', gridTemplateColumns: '1fr 344px' }}>
      <div style={{ minWidth: 0, padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0 }}>Rear elevation</h2>
            <div style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>Photo 2 of 4 · captured 2:14 PM · daylight, straight-on — good to use</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['Retake', 'Crop', 'Straighten', 'Brightness'].map((label) => (
              <button key={label} onClick={actions.noop} className="btn btn-secondary" style={{ height: 48, padding: '0 16px' }}>{label}</button>
            ))}
          </div>
        </div>
        <div className="blueprint" style={{ flex: 1, minHeight: 0, background: 'var(--color-accent-900)', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
          <Corners />
          <img src={BEFORE} alt="Rear elevation of the home before remodeling" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
          {PHOTO_STRIP.map((p) => (
            <button
              key={p.label}
              onClick={actions.noop}
              style={{ width: 150, padding: 0, background: 'none', border: `1px solid ${p.selected ? INK : 'var(--color-divider)'}`, boxShadow: p.selected ? '0 0 0 3px rgba(89,128,166,.35)' : 'none', cursor: 'pointer', overflow: 'hidden', textAlign: 'left' }}
            >
              <span style={{ display: 'block', height: 82, background: 'var(--color-neutral-200)' }}>
                <img src={p.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: p.opacity }} />
              </span>
              <span style={{ display: 'block', padding: '6px 8px', fontSize: 11.5, letterSpacing: '.1em', textTransform: 'uppercase', fontFamily: 'var(--font-body)' }}>{p.label}</span>
            </button>
          ))}
          <button onClick={actions.noop} style={{ width: 150, border: '1px dashed var(--color-neutral-400)', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontSize: 17, color: 'var(--color-accent-700)' }}>+ Add elevation</button>
        </div>
      </div>
      <aside style={{ borderLeft: '1px solid var(--color-divider)', background: 'var(--color-neutral-100)', padding: '22px 22px 20px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
        <div>
          <div style={{ fontSize: 11.5, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--color-neutral-600)' }}>Capture</div>
          <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
            <button onClick={actions.noop} className="btn btn-primary" style={{ height: 60, fontSize: 17, justifyContent: 'center' }}>Take photo</button>
            <button onClick={actions.noop} className="btn btn-secondary" style={{ height: 52, justifyContent: 'center' }}>Upload from tablet</button>
            <button onClick={actions.noop} className="btn btn-secondary" style={{ height: 52, justifyContent: 'center' }}>Use customer's photos (3)</button>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11.5, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--color-neutral-600)', marginBottom: 8 }}>A good photo</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.7, color: 'var(--color-neutral-800)' }}>
            <li>Stand square to the wall</li>
            <li>Get the whole project area in frame</li>
            <li>Daylight, no deep shade</li>
            <li>Move cars and hoses if you can</li>
          </ul>
        </div>
        <div style={{ padding: '12px 14px', border: '1px solid var(--color-accent-300)', background: 'var(--color-accent-100)', fontSize: 13.5 }}>
          <strong style={{ fontFamily: 'var(--font-heading)', fontSize: 16, display: 'block' }}>Left elevation is dim</strong>
          Shot into the sun at 2:09 PM. Usable, but the siding color will read darker. Retake later or continue.
        </div>
        <button onClick={actions.go('areas')} className="btn btn-primary" style={{ marginTop: 'auto', height: 60, fontSize: 17, fontFamily: 'var(--font-heading)', letterSpacing: '.06em', textTransform: 'uppercase', justifyContent: 'center' }}>Use these 4 photos</button>
      </aside>
    </section>
  );
}
