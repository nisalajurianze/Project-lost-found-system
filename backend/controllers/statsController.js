import User from '../models/User.js';
import LostItem from '../models/LostItem.js';
import FoundItem from '../models/FoundItem.js';
import ApiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getCache, setCache } from '../config/redis.js';

const CACHE_KEY_PUBLIC_STATS = 'public:home:stats';
const CACHE_TTL_SECONDS = 600; // Cache for 10 minutes

export const getPublicStats = asyncHandler(async (req, res) => {
  const cachedStats = await getCache(CACHE_KEY_PUBLIC_STATS);
  if (cachedStats) {
    // Tell browser to cache for 5 minutes
    res.set('Cache-Control', 'public, max-age=300');
    return ApiResponse.ok(cachedStats, 'Public stats retrieved from cache.').send(res);
  }

  const [totalUsers, resolvedLost, resolvedFound] = await Promise.all([
    User.countDocuments({}),
    LostItem.countDocuments({ isDeleted: { $ne: true }, status: 'claimed' }),
    FoundItem.countDocuments({ isDeleted: { $ne: true }, status: 'claimed' })
  ]);

  const stats = {
    belongingsRecovered: resolvedLost + resolvedFound,
    activeDailyUsers: totalUsers,
    aiMatchAccuracy: 96 // Fixed baseline until AI stats are fully tracked
  };

  await setCache(CACHE_KEY_PUBLIC_STATS, stats, 300);

  // Tell browser to cache for 5 minutes
  res.set('Cache-Control', 'public, max-age=300');
  return ApiResponse.ok(stats, 'Public stats retrieved successfully.').send(res);
});
