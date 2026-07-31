import { PAPER, STEEL, STEP_LABELS } from '../data';
import { useSyncStatus } from './SyncSheet';
import { isConfigured } from '../lib/supabase';
import type { SessionData } from '../session';
import type { Actions, Screen, State } from '../store';

const STEP_INDEX: Partial<Record<Screen, number>> = {
  customers: 0, setup: 1, photos: 1, areas: 2, visualizer: 3, compare: 3, selections: 4, summary: 4,
};

const STEP_TARGET: Screen[] = ['customers', 'photos', 'areas', 'visualizer', 'selections'];

const IN_PROJECT: Screen[] = ['customers', 'setup', 'photos', 'areas', 'visualizer', 'compare', 'selections', 'summary'];

export function Header({
  state,
  session,
  actions,
}: {
  state: State;
  session: SessionData;
  actions: Actions;
}) {
  const inProject = IN_PROJECT.includes(state.screen);
  const atHome = state.screen === 'home';
  const current = STEP_INDEX[state.screen];
  const wide = state.vw >= 1240;
  const sync = useSyncStatus();

  const categories = [...new Set(session.detections.filter((d) => d.selected).map((d) => d.category))];
  const subtitle = [session.customer?.address, categories.join(', ')].filter(Boolean).join(' · ');

  const syncLabel = !isConfigured
    ? 'Saved on this tablet'
    : !sync.online
      ? `Offline${sync.pending ? ` — ${sync.pending} queued` : ''}`
      : sync.syncing
        ? 'Syncing…'
        : sync.pending
          ? `${sync.pending} queued`
          : 'All changes saved';

  return (
    <header style={{ flex: 'none', height: 62, background: 'var(--color-accent-900)', color: '#f2f2f3', display: 'flex', alignItems: 'center', gap: 20, padding: '0 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 226 }}>
        <div style={{ width: 30, height: 30, border: '1px solid rgba(242,242,243,.5)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-heading)', fontSize: 15, letterSpacing: '.04em' }}>WD</div>
        <div style={{ lineHeight: 1.15 }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 17, letterSpacing: '.03em', textTransform: 'uppercase' }}>Window Depot</div>
          <div style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', opacity: .6 }}>Visualizer</div>
        </div>
      </div>

      {inProject && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <div style={{ borderLeft: '1px solid rgba(242,242,243,.22)', paddingLeft: 18, minWidth: 0, flex: '0 1 auto' }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 18, letterSpacing: '.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {session.customer?.name ?? 'No customer selected'}
            </div>
            <div style={{ fontSize: 11.5, opacity: .62, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {subtitle || 'Pick a customer to start a project'}
            </div>
          </div>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0, overflowX: 'auto', flex: '1 1 auto' }}>
            {STEP_LABELS.map((label, i) => (
              <button
                key={label}
                onClick={actions.go(STEP_TARGET[i])}
                style={{ background: 'none', border: 0, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, color: '#f2f2f3', opacity: current === i ? 1 : .55 }}
              >
                <span style={{ width: 21, height: 21, border: '1px solid rgba(242,242,243,.45)', display: 'grid', placeItems: 'center', fontSize: 11, background: current === i ? STEEL : 'transparent', color: PAPER }}>{i + 1}</span>
                <span style={{ letterSpacing: '.1em', textTransform: 'uppercase', whiteSpace: 'nowrap', display: wide ? 'inline' : 'none' }}>{label}</span>
              </button>
            ))}
          </nav>
        </div>
      )}

      {atHome && (
        <div style={{ flex: 1, fontSize: 12, letterSpacing: '.18em', textTransform: 'uppercase', opacity: .55, borderLeft: '1px solid rgba(242,242,243,.22)', paddingLeft: 18 }}>
          In-home sales presentation tool
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>
        <button
          onClick={() => actions.patch({ sheet: true })}
          style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 14px', background: 'rgba(242,242,243,.08)', border: '1px solid rgba(242,242,243,.2)', color: '#f2f2f3', fontFamily: 'var(--font-body)', fontSize: 12.5, cursor: 'pointer' }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: !sync.online || sync.pending ? '#c9a227' : '#7fae7a' }} />
          <span>{syncLabel}</span>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 12, borderLeft: '1px solid rgba(242,242,243,.22)' }}>
          <div style={{ width: 36, height: 36, border: '1px solid rgba(242,242,243,.35)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-heading)', fontSize: 14 }}>AR</div>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: 13 }}>Alex Reyes</div>
            <div style={{ fontSize: 11, opacity: .55 }}>Milwaukee · Rep 214</div>
          </div>
        </div>
      </div>
    </header>
  );
}
