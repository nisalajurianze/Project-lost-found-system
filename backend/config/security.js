const asBool = (value, fallback = false) => {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};


const durationMs = (value, fallbackMs) => {
  const match = String(value || '').trim().match(/^(\d+)(ms|s|m|h|d)$/i);
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const factors = { ms: 1, s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return Math.min(24 * 60 * 60 * 1_000, Math.max(60_000, amount * factors[unit]));
};

const RESERVED_EMAIL_DOMAINS = new Set(['example.invalid', 'example.com', 'example.org', 'example.net']);

export const isSafeEmailFrom = (value) => {
  const text = String(value || '').trim();
  if (!text || text.length > 254 || /[\r\n]/.test(text)) return false;
  const angleMatch = text.match(/^[^<>]{0,120}<([^<>]+)>$/);
  const mailbox = (angleMatch ? angleMatch[1] : text).trim().toLowerCase();
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(mailbox)) return false;
  const domain = mailbox.split('@')[1];
  return Boolean(domain && !RESERVED_EMAIL_DOMAINS.has(domain));
};

export const isProduction = process.env.NODE_ENV === 'production';
export const clientOrigins = String(process.env.CLIENT_URLS || process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

export const accessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || '';
export const accessExpire = process.env.JWT_ACCESS_EXPIRE || process.env.JWT_EXPIRES_IN || '15m';
export const accessMaxAgeMs = durationMs(accessExpire, 15 * 60 * 1_000);
export const refreshDays = Math.min(90, Math.max(1, Number(process.env.REFRESH_TOKEN_DAYS || 7)));
export const rememberedRefreshDays = Math.min(90, Math.max(1, Number(process.env.REMEMBERED_REFRESH_TOKEN_DAYS || 30)));
export const nonRememberedRefreshDays = Math.min(90, Math.max(1, Number(process.env.NON_REMEMBERED_REFRESH_TOKEN_DAYS || 1)));
export const cookieSecure = asBool(process.env.COOKIE_SECURE, isProduction);
export const cookieDomain = process.env.COOKIE_DOMAIN || undefined;
export const resolveCookieSameSite = (value, production = isProduction) => {
  const fallback = production ? 'none' : 'lax';
  const requested = String(value || fallback).toLowerCase();
  return ['strict', 'lax', 'none'].includes(requested) ? requested : fallback;
};
export const cookieSameSite = resolveCookieSameSite(process.env.COOKIE_SAME_SITE);
export const allowBearerAuth = asBool(process.env.ALLOW_BEARER_AUTH, false);
export const jobsEnabled = asBool(process.env.JOBS_ENABLED, true);
export const requireRedis = asBool(process.env.REQUIRE_REDIS, false);
export const requireEmail = asBool(process.env.REQUIRE_EMAIL_PROVIDER, isProduction);
export const requireCloudinary = asBool(process.env.REQUIRE_CLOUDINARY, isProduction);
export const requireTransactions = asBool(process.env.REQUIRE_MONGO_REPLICA_SET, isProduction);

export const validateSecurityEnvironment = () => {
  const problems = [];
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) problems.push('MONGO_URI');
  if (accessSecret.length < 32) problems.push('JWT_ACCESS_SECRET (minimum 32 characters)');
  if (isProduction && !cookieSecure) problems.push('COOKIE_SECURE=true');
  if (cookieSameSite === 'none' && !cookieSecure) problems.push('COOKIE_SAME_SITE=none requires COOKIE_SECURE=true');
  if (isProduction && clientOrigins.some((origin) => /localhost|127\.0\.0\.1/.test(origin))) {
    problems.push('production CLIENT_URLS must not contain localhost');
  }
  if (isProduction && clientOrigins.some((origin) => !origin.startsWith('https://'))) {
    problems.push('production CLIENT_URLS must use HTTPS');
  }
  if (requireRedis && !process.env.REDIS_URL) problems.push('REDIS_URL');
  if (requireCloudinary && !(process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_NAME)) problems.push('CLOUDINARY_CLOUD_NAME');
  if (requireCloudinary && !(process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_KEY)) problems.push('CLOUDINARY_API_KEY');
  if (requireCloudinary && !(process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_SECRET)) problems.push('CLOUDINARY_API_SECRET');
  const emailConfigured = Boolean(process.env.RESEND_API_KEY || ((process.env.SMTP_HOST || process.env.EMAIL_HOST) && (process.env.SMTP_USER || process.env.EMAIL_USER) && (process.env.SMTP_PASS || process.env.EMAIL_PASSWORD)));
  if (requireEmail && !emailConfigured) problems.push('RESEND_API_KEY or complete SMTP configuration');
  if (requireEmail && !process.env.EMAIL_FROM) problems.push('EMAIL_FROM');
  if (requireEmail && process.env.EMAIL_FROM && !isSafeEmailFrom(process.env.EMAIL_FROM)) {
    problems.push('EMAIL_FROM (valid non-placeholder sender address)');
  }
  if (problems.length) throw new Error(`Missing or unsafe environment configuration: ${problems.join(', ')}`);
};
