import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/fonts.css';
import './styles/ds-industry.css';
import './styles/app.css';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { loadCatalog } from './lib/catalog';
import { loadSettings } from './lib/settings';
import { startSync } from './lib/sync';

// Starts the outbox drain and the online/offline listeners for the session.
startSync();

// Registered after load so it never competes with the first paint. Only in
// production: in dev it would serve stale modules and break HMR.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js');
  });
}

function mount() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}

/**
 * The catalogue and settings are read synchronously by plain modules — the
 * prompt builder, the reference builder, the render timeout — so they are
 * primed before the first paint rather than arriving a frame later. Both fall
 * back to their defaults, which is what shipped before either was editable, so
 * a tablet with no IndexedDB still gets a working app rather than a blank page.
 */
void Promise.all([loadCatalog(), loadSettings()]).catch(() => undefined).then(mount);
