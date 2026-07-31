import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/fonts.css';
import './styles/ds-industry.css';
import './styles/app.css';
import { App } from './App';
import { startSync } from './lib/sync';

// Starts the outbox drain and the online/offline listeners for the session.
startSync();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
