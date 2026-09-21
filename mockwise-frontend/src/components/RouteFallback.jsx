import '../styles/AppStatus.css';

/**
 * Suspense fallback for lazy-loaded routes (dark, minimal).
 */
function RouteFallback() {
  return (
    <div className="app-status-page" role="status" aria-live="polite" aria-busy="true">
      <div className="app-status-card">
        <div
          className="spinner-border text-success mb-3"
          role="status"
          style={{ width: '2.5rem', height: '2.5rem' }}
        >
          <span className="visually-hidden">Loading…</span>
        </div>
        <p className="app-status-body mb-0">Loading…</p>
      </div>
    </div>
  );
}

export default RouteFallback;
