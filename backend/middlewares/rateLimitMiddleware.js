// ============================================
// Rate Limiting Middleware
// Endpoint-specific rate limiters
// ============================================

import rateLimit from 'express-rate-limit';

/**
 * Create a rate limiter with sensible defaults.
 * @param {object} opts - Override options
 * @returns {Function} express-rate-limit middleware
 */
const createLimiter = (opts = {}) =>
  rateLimit({
    windowMs: opts.windowMs || 15 * 60 * 1000, // 15 min default
    max: opts.max || 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: opts.message || 'Too many requests. Please try again later.',
    },
    ...opts,
  });

// ── Global API limiter ──────────────────────────────────────────────────
const globalLimiter = createLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
});

// ── Auth endpoints (stricter) ───────────────────────────────────────────
const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20, // 20 attempts per window
  message: 'Too many authentication attempts. Please try again after 15 minutes.',
});

// ── Login (very strict to prevent brute-force) ──────────────────────────
const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts. Please try again after 15 minutes.',
});

// ── Password reset (strict) ────────────────────────────────────────────
const passwordResetLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many password reset requests. Please try again after 1 hour.',
});

// ── Upload endpoints ────────────────────────────────────────────────────
const uploadLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many upload requests. Please try again later.',
});

// ── Search / public listing ─────────────────────────────────────────────
const searchLimiter = createLimiter({
  windowMs: 1 * 60 * 1000, // 1 min
  max: 60,
  message: 'Too many search requests. Please slow down.',
});

export {
  globalLimiter,
  authLimiter,
  loginLimiter,
  passwordResetLimiter,
  uploadLimiter,
  searchLimiter,
};
