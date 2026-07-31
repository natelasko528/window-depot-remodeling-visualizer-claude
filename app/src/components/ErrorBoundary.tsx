import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * Keeps one thrown render from blanking the tablet mid-appointment.
 *
 * The work itself is safe either way — photos, selections and renders are in
 * IndexedDB — so the recovery path is deliberately "try again" rather than
 * "reload", which would cost the rep the screen they were on in front of a
 * customer. Reload stays available as the second option.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        role="alert"
        style={{ height: '100vh', display: 'grid', placeItems: 'center', padding: 30, background: 'var(--color-bg)', fontFamily: 'var(--font-body)' }}
      >
        <div style={{ maxWidth: 520 }}>
          <div style={{ fontSize: 11.5, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--color-neutral-600)' }}>
            Something broke
          </div>
          <h2 style={{ margin: '4px 0 8px' }}>This screen stopped responding</h2>
          <p style={{ color: 'var(--color-neutral-700)', lineHeight: 1.7 }}>
            Your photos, selections and renders are saved on this tablet — nothing has
            been lost. Try the screen again, and carry on.
          </p>
          <pre style={{ margin: '14px 0', padding: 12, background: 'var(--color-neutral-100)', border: '1px solid var(--color-divider)', fontSize: 12.5, whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
            {error.message}
          </pre>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => this.setState({ error: null })} className="btn btn-primary" style={{ height: 52, padding: '0 22px' }}>
              Try again
            </button>
            <button onClick={() => window.location.reload()} className="btn btn-secondary" style={{ height: 52, padding: '0 18px' }}>
              Reload the app
            </button>
          </div>
        </div>
      </div>
    );
  }
}
