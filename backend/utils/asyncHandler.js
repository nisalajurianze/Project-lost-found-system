// ============================================
// Async Handler Utility
// Wraps async route handlers to catch errors
// ============================================

/**
 * Higher-order function that wraps an async Express route handler.
 * Catches any rejected promises and forwards the error to Express
 * error-handling middleware via next().
 *
 * @param {Function} fn - Async route handler (req, res, next) => Promise
 * @returns {Function} Express-compatible middleware
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
