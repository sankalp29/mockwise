import { useSyncExternalStore } from 'react';

/**
 * Subscribe to a CSS media query. Re-renders when the match flips.
 * Uses useSyncExternalStore so React 18+ keeps the UI in sync with the viewport.
 *
 * @param {string} query - e.g. '(max-width: 767px)'
 * @param {boolean} [serverFallback=false] - value used during SSR / first paint without window
 * @returns {boolean}
 */
export function useMediaQuery(query, serverFallback = false) {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mql = window.matchMedia(query);
      const handler = () => onStoreChange();
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    },
    () => window.matchMedia(query).matches,
    () => serverFallback,
  );
}
