import { accessMaxAgeMs, cookieDomain, cookieSecure, cookieSameSite } from '../config/security.js';

const common = () => ({
  secure: cookieSecure,
  sameSite: cookieSameSite,
  ...(cookieDomain ? { domain: cookieDomain } : {}),
});

export const accessCookieOptions = () => ({
  ...common(),
  httpOnly: true,
  path: '/',
  maxAge: accessMaxAgeMs,
});

export const refreshCookieOptions = (days) => ({
  ...common(),
  httpOnly: true,
  path: '/api/auth',
  maxAge: days * 24 * 60 * 60 * 1000,
});

export const csrfCookieOptions = () => ({
  ...common(),
  httpOnly: false,
  path: '/',
  maxAge: 8 * 60 * 60 * 1000,
});

export const clearAuthCookies = (res) => {
  res.clearCookie('accessToken', { ...common(), httpOnly: true, path: '/' });
  res.clearCookie('refreshToken', { ...common(), httpOnly: true, path: '/api/auth' });
};
