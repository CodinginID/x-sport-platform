import { lazy, type ComponentType } from 'react';

const RELOAD_KEY = 'xsport-chunk-reload';

/**
 * Loads a code-split chunk, recovering from the "Failed to fetch dynamically
 * imported module" error that happens after a new deploy: the running page
 * references old hashed chunk names (e.g. DashboardPage-CLss2qTR.js) that no
 * longer exist on the server. We reload ONCE to pick up the fresh index.html +
 * asset hashes. A sessionStorage flag prevents an infinite reload loop if the
 * chunk is genuinely missing (the second failure rethrows so the ErrorBoundary
 * shows it instead of reloading forever). The flag resets on any success.
 */
export async function importWithReload<T>(factory: () => Promise<T>): Promise<T> {
  try {
    const mod = await factory();
    sessionStorage.removeItem(RELOAD_KEY);
    return mod;
  } catch (err) {
    if (!sessionStorage.getItem(RELOAD_KEY)) {
      sessionStorage.setItem(RELOAD_KEY, '1');
      window.location.reload();
      // Never resolves — keep React on the Suspense fallback until the reload
      // navigates away.
      return new Promise<T>(() => {});
    }
    throw err;
  }
}

/** Drop-in replacement for React.lazy that auto-recovers from stale chunks. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithReload<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(() => importWithReload(factory));
}
