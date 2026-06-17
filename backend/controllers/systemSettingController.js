import SystemSetting from '../models/SystemSetting.js';
import ApiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getCache, setCache, deleteCache } from '../config/redis.js';

const CACHE_PREFIX = 'setting:';

// @desc    Get a public setting by key
// @route   GET /api/settings/public/:key
// @access  Public
export const getPublicSetting = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const cacheKey = `${CACHE_PREFIX}${key}`;

  // Check cache
  const cachedValue = await getCache(cacheKey);
  if (cachedValue) {
    return ApiResponse.ok(cachedValue, 'Setting retrieved from cache').send(res);
  }

  const setting = await SystemSetting.findOne({ key: key.toLowerCase() });
  
  if (!setting) {
    return ApiResponse.notFound('Setting not found').send(res);
  }

  // Cache for 1 hour
  await setCache(cacheKey, setting.value, 3600);

  return ApiResponse.ok(setting.value, 'Setting retrieved successfully').send(res);
});

// @desc    Create or update a setting
// @route   PUT /api/settings/:key
// @access  Private/Admin
export const updateSetting = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const { value, description } = req.body;

  if (value === undefined) {
    return ApiResponse.badRequest('Value is required').send(res);
  }

  const lowerKey = key.toLowerCase();

  let setting = await SystemSetting.findOne({ key: lowerKey });

  if (setting) {
    setting.value = value;
    if (description !== undefined) {
      setting.description = description;
    }
    await setting.save();
  } else {
    setting = await SystemSetting.create({
      key: lowerKey,
      value,
      description
    });
  }

  // Invalidate cache
  await deleteCache(`${CACHE_PREFIX}${lowerKey}`);

  return ApiResponse.ok(setting, 'Setting updated successfully').send(res);
});
