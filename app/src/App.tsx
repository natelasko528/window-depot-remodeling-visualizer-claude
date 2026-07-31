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
import { useVisualizer } from './store';

export function App() {
  const { state, actions, activePanelKey } = useVisualizer();

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'var(--font-body)', fontSize: 15, overflow: 'hidden' }}>
      <Header state={state} actions={actions} />

      <main style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
        {state.screen === 'home' && <Home state={state} actions={actions} />}
        {state.screen === 'customers' && <Customers actions={actions} />}
        {state.screen === 'setup' && <Setup state={state} actions={actions} />}
        {state.screen === 'photos' && <Photos actions={actions} />}
        {state.screen === 'areas' && <Areas state={state} actions={actions} />}
        {state.screen === 'visualizer' && <Visualizer state={state} actions={actions} panelKey={activePanelKey} />}
        {state.screen === 'compare' && <Compare state={state} actions={actions} />}
        {state.screen === 'selections' && <Selections state={state} actions={actions} />}
        {state.screen === 'summary' && <Summary state={state} actions={actions} />}
        {state.screen === 'library' && <Library actions={actions} />}
      </main>

      {state.presenting && <Presentation state={state} actions={actions} />}
      {state.sheet && <SyncSheet state={state} actions={actions} />}
      {state.toast && <Toast message={state.toast} />}
    </div>
  );
}
