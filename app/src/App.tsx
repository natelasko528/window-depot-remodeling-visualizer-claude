import { Header } from './components/Header';
import { Presentation } from './components/Presentation';
import { SyncSheet, Toast } from './components/SyncSheet';
import { Areas } from './screens/Areas';
import { Compare } from './screens/Compare';
import { Customers } from './screens/Customers';
import { Home } from './screens/Home';
import { Library } from './screens/Library';
import { Photos } from './screens/Photos';
import { Selections } from './screens/Selections';
import { Setup } from './screens/Setup';
import { Summary } from './screens/Summary';
import { Visualizer } from './screens/Visualizer';
import { useSession } from './session';
import { useVisualizer } from './store';

export function App() {
  const { data: session, actions: sessionActions } = useSession();
  const { state, actions, activePanelKey } = useVisualizer(session, sessionActions);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'var(--font-body)', fontSize: 15, overflow: 'hidden' }}>
      <Header state={state} session={session} actions={actions} />

      <main style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
        {state.screen === 'home' && <Home session={session} sessionActions={sessionActions} actions={actions} />}
        {state.screen === 'customers' && <Customers session={session} sessionActions={sessionActions} actions={actions} />}
        {state.screen === 'setup' && <Setup state={state} actions={actions} />}
        {state.screen === 'photos' && <Photos session={session} sessionActions={sessionActions} actions={actions} />}
        {state.screen === 'areas' && <Areas state={state} session={session} sessionActions={sessionActions} actions={actions} />}
        {state.screen === 'visualizer' && <Visualizer state={state} session={session} sessionActions={sessionActions} actions={actions} panelKey={activePanelKey} />}
        {state.screen === 'compare' && <Compare state={state} session={session} sessionActions={sessionActions} actions={actions} />}
        {state.screen === 'selections' && <Selections session={session} actions={actions} />}
        {state.screen === 'summary' && <Summary session={session} actions={actions} />}
        {state.screen === 'library' && <Library actions={actions} />}
      </main>

      {state.presenting && <Presentation state={state} session={session} sessionActions={sessionActions} actions={actions} />}
      {state.sheet && <SyncSheet session={session} actions={actions} />}
      {state.toast && <Toast message={state.toast} />}
    </div>
  );
}
