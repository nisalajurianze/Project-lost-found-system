import SystemSetting from '../models/SystemSetting.js';
import ApiResponse from '../utils/apiResponse.js';
import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getCache, setCache, deleteCache } from '../config/redis.js';

const CACHE_PREFIX = 'public-setting:';

const asBoolean = (value, key) => {
  if (typeof value !== 'boolean') throw ApiError.badRequest(`${key} must be a boolean.`);
  return value;
};

const asBoundedInteger = (value, key, min, max) => {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw ApiError.badRequest(`${key} must be an integer between ${min} and ${max}.`);
  }
  return value;
};

const asText = (value, key, { min = 0, max = 200 } = {}) => {
  if (typeof value !== 'string') throw ApiError.badRequest(`${key} must be text.`);
  const normalized = value.normalize('NFKC').trim();
  if (normalized.length < min || normalized.length > max) {
    throw ApiError.badRequest(`${key} must be ${min}-${max} characters.`);
  }
  return normalized;
};

const asOptionalEmail = (value, key) => {
  const normalized = asText(value, key, { max: 254 }).toLowerCase();
  if (normalized && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw ApiError.badRequest(`${key} must be a valid email address.`);
  }
  return normalized;
};

const asContactDetails = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw ApiError.badRequest('contact_details must be an object.');
  }
  const allowed = new Set(['office', 'email', 'phone']);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw ApiError.badRequest(`Unsupported contact_details field: ${key}.`);
  }
  return {
    office: asText(value.office ?? '', 'contact_details.office', { max: 300 }),
    email: asOptionalEmail(value.email ?? '', 'contact_details.email'),
    phone: asText(value.phone ?? '', 'contact_details.phone', { max: 50 }),
  };
};

const SETTING_DEFINITIONS = Object.freeze({
  site_name: { public: true, normalize: (value) => asText(value, 'site_name', { min: 2, max: 100 }) },
  maintenance_mode: { public: true, normalize: (value) => asBoolean(value, 'maintenance_mode') },
  allow_registration: { public: true, normalize: (value) => asBoolean(value, 'allow_registration') },
  require_email_verification: { public: true, normalize: (value) => asBoolean(value, 'require_email_verification') },
  public_contact_email: { public: true, normalize: (value) => asOptionalEmail(value, 'public_contact_email') },
  support_hours: { public: true, normalize: (value) => asText(value, 'support_hours', { max: 200 }) },
  contact_details: { public: true, normalize: asContactDetails },
  spam_max_pending_claims: { public: false, normalize: (value) => asBoundedInteger(value, 'spam_max_pending_claims', 1, 50) },
  spam_max_rejected_claims: { public: false, normalize: (value) => asBoundedInteger(value, 'spam_max_rejected_claims', 1, 50) },
  spam_max_claims_per_day: { public: false, normalize: (value) => asBoundedInteger(value, 'spam_max_claims_per_day', 1, 100) },
});

const PUBLIC_SETTING_KEYS = new Set(
  Object.entries(SETTING_DEFINITIONS).filter(([, definition]) => definition.public).map(([key]) => key),
);

const normalizeKey = (value) => String(value || '').trim().toLowerCase();
const getDefinition = (key) => {
  const definition = SETTING_DEFINITIONS[key];
  if (!definition) throw ApiError.notFound('Setting is not supported.');
  return definition;
};

export const getPublicSetting = asyncHandler(async (req, res) => {
  const key = normalizeKey(req.params.key);
  if (!PUBLIC_SETTING_KEYS.has(key)) throw ApiError.notFound('Public setting not found.');

  const cacheKey = `${CACHE_PREFIX}${key}`;
  const cachedValue = await getCache(cacheKey);
  if (cachedValue !== null && cachedValue !== undefined) {
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    return ApiResponse.ok(cachedValue, 'Setting retrieved successfully.').send(res);
  }

  const setting = await SystemSetting.findOne({ key, isPublic: true }).select('value').lean();
  if (!setting) return ApiResponse.ok(null, 'Public setting not configured.').send(res);

  await setCache(cacheKey, setting.value, 300);
  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
  return ApiResponse.ok(setting.value, 'Setting retrieved successfully.').send(res);
});

export const getSetting = asyncHandler(async (req, res) => {
  const key = normalizeKey(req.params.key);
  getDefinition(key);
  const setting = await SystemSetting.findOne({ key }).select('key value description isPublic updatedAt').lean();
  return ApiResponse.ok(setting?.value ?? null, setting ? 'Setting retrieved successfully.' : 'Setting not configured.').send(res);
});

export const updateSetting = asyncHandler(async (req, res) => {
  const key = normalizeKey(req.params.key);
  const definition = getDefinition(key);
  const { value, description, isPublic } = req.body;
  if (value === undefined) throw ApiError.badRequest('Value is required.');

  const normalizedValue = definition.normalize(value);
  if (isPublic === true && !definition.public) {
    throw ApiError.badRequest('This setting is not approved for public exposure.');
  }
  if (isPublic !== undefined && typeof isPublic !== 'boolean') {
    throw ApiError.badRequest('isPublic must be a boolean.');
  }

  const existing = await SystemSetting.findOne({ key }).select('isPublic').lean();
  const publicFlag = definition.public
    ? (isPublic === undefined ? (existing?.isPublic ?? true) : isPublic)
    : false;

  const setting = await SystemSetting.findOneAndUpdate(
    { key },
    {
      $set: {
        value: normalizedValue,
        description: description === undefined ? '' : asText(String(description), 'description', { max: 500 }),
        isPublic: publicFlag,
      },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );

  await deleteCache(`${CACHE_PREFIX}${key}`);
  return ApiResponse.ok(setting, 'Setting updated successfully.').send(res);
});

export { PUBLIC_SETTING_KEYS, SETTING_DEFINITIONS };
