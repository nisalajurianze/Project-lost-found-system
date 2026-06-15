// ============================================
// Admin Controller
// Dashboard stats, user management, and system analytics
// ============================================

import User from '../models/User.js';
import LostItem from '../models/LostItem.js';
import FoundItem from '../models/FoundItem.js';
import AdminLog from '../models/AdminLog.js';
import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { paginate } from '../utils/pagination.js';
import { getCache, setCache } from '../config/redis.js';

const CACHE_KEY_DASHBOARD = 'admin:dashboard:stats';
const CACHE_TTL_SECONDS = 300; // Cache for 5 minutes

/**
 * Get overall dashboard statistics. Uses Redis cache.
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  // Try Cache
  const cachedStats = await getCache(CACHE_KEY_DASHBOARD);
  if (cachedStats) {
    console.log('⚡ Redis Cache Hit: getDashboardStats');
    return ApiResponse.ok(cachedStats, 'Dashboard stats retrieved from cache.').send(res);
  }

  console.log('🐌 Redis Cache Miss: getDashboardStats. Calculating aggregations...');

  const [totalUsers, totalLost, totalFound, resolvedLost, resolvedFound] = await Promise.all([
    User.countDocuments({}),
    LostItem.countDocuments({ isDeleted: { $ne: true } }),
    FoundItem.countDocuments({ isDeleted: { $ne: true } }),
    LostItem.countDocuments({ isDeleted: { $ne: true }, status: 'claimed' }),
    FoundItem.countDocuments({ isDeleted: { $ne: true }, status: 'claimed' })
  ]);

  // Retrieve monthly aggregates for the last 6 months (lost vs found)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const monthlyLostAgg = await LostItem.aggregate([
    { $match: { createdAt: { $gte: sixMonthsAgo }, isDeleted: { $ne: true } } },
    {
      $group: {
        _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  const monthlyFoundAgg = await FoundItem.aggregate([
    { $match: { createdAt: { $gte: sixMonthsAgo }, isDeleted: { $ne: true } } },
    {
      $group: {
        _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  // Item status distributions
  const lostStatusDist = await LostItem.aggregate([
    { $match: { isDeleted: { $ne: true } } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  const foundStatusDist = await FoundItem.aggregate([
    { $match: { isDeleted: { $ne: true } } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  const stats = {
    summary: {
      totalUsers,
      totalLostItems: totalLost,
      totalFoundItems: totalFound,
      successfulRecoveries: resolvedLost,
      totalClaims: 0,
      pendingClaims: 0
    },
    analytics: {
      monthlyLost: monthlyLostAgg.map(item => ({
        month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
        count: item.count
      })),
      monthlyFound: monthlyFoundAgg.map(item => ({
        month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
        count: item.count
      })),
      lostStatusBreakdown: lostStatusDist.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      foundStatusBreakdown: foundStatusDist.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    }
  };

  // Cache stats
  await setCache(CACHE_KEY_DASHBOARD, stats, CACHE_TTL_SECONDS);

  ApiResponse.ok(stats, 'Dashboard statistics compiled.').send(res);
});

/**
 * Get paginated list of all users (Admin only).
 */
const getUsers = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.role) {
    filter.role = req.query.role;
  }
  if (req.query.search) {
    filter.$or = [
      { fullName: { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } },
      { studentId: { $regex: req.query.search, $options: 'i' } }
    ];
  }

  const totalDocs = await User.countDocuments(filter);
  const pagination = paginate(req.query, totalDocs);

  const users = await User.find(filter)
    .sort({ createdAt: -1 })
    .skip(pagination.skip)
    .limit(pagination.limit);

  ApiResponse.ok({ users, pagination }, 'Users list retrieved.').send(res);
});

/**
 * Toggle user account status (Activate / Deactivate).
 */
const updateUserStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  const user = await User.findById(req.params.id);

  if (!user) {
    throw ApiError.notFound('User not found.');
  }

  if (user._id.toString() === req.user._id.toString()) {
    throw ApiError.badRequest('You cannot deactivate your own account.');
  }

  const prevStatus = user.isActive;
  user.isActive = isActive;
  await user.save();

  // Log action
  await AdminLog.create({
    adminId: req.user._id,
    action: isActive ? 'USER_ACTIVATION' : 'USER_DEACTIVATION',
    targetModel: 'User',
    targetId: user._id,
    details: `Updated status from ${prevStatus} to ${isActive}`,
    ipAddress: req.ip || ''
  });

  ApiResponse.ok(user, `User account ${isActive ? 'activated' : 'deactivated'} successfully.`).send(res);
});

/**
 * Get audit trail of admin actions.
 */
const getAdminLogs = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.adminId) {
    filter.adminId = req.query.adminId;
  }
  if (req.query.action) {
    filter.action = req.query.action;
  }

  const totalDocs = await AdminLog.countDocuments(filter);
  const pagination = paginate(req.query, totalDocs);

  const logs = await AdminLog.find(filter)
    .populate('adminId', 'fullName email role')
    .sort({ createdAt: -1 })
    .skip(pagination.skip)
    .limit(pagination.limit);

  ApiResponse.ok({ logs, pagination }, 'Admin logs retrieved.').send(res);
});

export {
  getDashboardStats,
  getUsers,
  updateUserStatus,
  getAdminLogs
};
