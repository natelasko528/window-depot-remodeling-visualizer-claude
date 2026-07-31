import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/fonts.css';
import './styles/ds-industry.css';
import './styles/app.css';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
