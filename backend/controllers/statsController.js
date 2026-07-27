import User from '../models/User.js';
import LostItem from '../models/LostItem.js';
import Match from '../models/Match.js';
import ApiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getCache, setCache } from '../config/redis.js';

const CACHE_KEY_PUBLIC_STATS = 'public:home:stats:v2';
const CACHE_TTL_SECONDS = 300;

export const getPublicStats = asyncHandler(async (_req, res) => {
  const cachedStats = await getCache(CACHE_KEY_PUBLIC_STATS);
  if (cachedStats) {
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    return ApiResponse.ok(cachedStats, 'Public stats retrieved from cache.').send(res);
  }

  const [activeAccounts, completedRecoveries, matchSuggestions] = await Promise.all([
    User.countDocuments({ isActive: true, deletedAt: null }),
    LostItem.countDocuments({ isDeleted: { $ne: true }, status: 'claimed' }),
    Match.countDocuments({ status: { $in: ['suggested', 'confirmed'] } }),
  ]);

  const stats = { activeAccounts, completedRecoveries, matchSuggestions };
  await setCache(CACHE_KEY_PUBLIC_STATS, stats, CACHE_TTL_SECONDS);
  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
  return ApiResponse.ok(stats, 'Public stats retrieved successfully.').send(res);
});
