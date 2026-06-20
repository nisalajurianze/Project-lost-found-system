import { lazy } from 'react';

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
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        // Assume the chunk failed to load because a new version was deployed.
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        return window.location.reload();
      }
      // If we already refreshed and it still fails, throw the error
      throw error;
    }
  });

export default lazyWithRetry;
