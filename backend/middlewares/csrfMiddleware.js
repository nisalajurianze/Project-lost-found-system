import ApiError from '../utils/apiError.js';
import { randomToken, safeEqual } from '../utils/security.js';
import { csrfCookieOptions } from '../utils/cookies.js';
import { clientOrigins, isProduction } from '../config/security.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const isAllowedOrigin = (req) => {
  const origin = req.get('origin');
  if (!origin) return !isProduction;
  return clientOrigins.includes(origin.replace(/\/$/, ''));
};

export const issueCsrfToken = (_req, res) => {
  const csrfToken = randomToken(32);
  res.cookie('csrfToken', csrfToken, csrfCookieOptions());
  return res.status(200).json({ success: true, data: { csrfToken } });
};

export const csrfProtection = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  if (!isAllowedOrigin(req)) return next(ApiError.forbidden('Request origin is not allowed.'));
  const cookieToken = req.cookies?.csrfToken;
  const headerToken = req.get('x-csrf-token');
  if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
    return next(ApiError.forbidden('Invalid CSRF token.'));
  }
  return next();
};
