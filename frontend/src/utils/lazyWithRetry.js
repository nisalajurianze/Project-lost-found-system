import { lazy } from 'react';

const CHUNK_RETRY_KEY = 'smart-lf:chunk-retry-url';
const CHUNK_RETRY_WINDOW_MS = 30_000;
const CHUNK_ERROR_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /Loading chunk [\w-]+ failed/i,
  /ChunkLoadError/i,
];

export const isChunkLoadError = (error) => {
  const message = String(error?.message || error || '');
  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(message));
};

export const shouldRetryChunkLoad = (error, currentUrl, storage, now = Date.now()) => {
  if (!isChunkLoadError(error)) return false;
  try {
    const stored = JSON.parse(storage.getItem(CHUNK_RETRY_KEY) || 'null');
    if (stored?.url === currentUrl && now - stored.timestamp < CHUNK_RETRY_WINDOW_MS) {
      storage.removeItem(CHUNK_RETRY_KEY);
      return false;
    }
    storage.setItem(CHUNK_RETRY_KEY, JSON.stringify({ url: currentUrl, timestamp: now }));
    return true;
  } catch {
    // Reloading without a durable marker could create an infinite refresh loop.
    return false;
  }
};

/**
 * A wrapper for React.lazy() that automatically retries the dynamic import
 * if it fails (e.g., due to a temporary network issue or a new deployment
 * changing chunk hashes).
 *
 * @param {Function} componentImport - The dynamic import function (e.g. () => import('./Component'))
 * @returns {React.LazyExoticComponent}
 */
export const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      if (shouldRetryChunkLoad(error, window.location.href, window.sessionStorage)) {
        window.location.reload();
        return new Promise(() => {});
      }
      throw error;
    }
  });

export default lazyWithRetry;
