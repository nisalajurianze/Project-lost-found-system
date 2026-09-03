import mongoose from 'mongoose';
import User from '../models/User.js';
import LostItem from '../models/LostItem.js';
import FoundItem from '../models/FoundItem.js';
import ClaimRequest from '../models/ClaimRequest.js';
import Match from '../models/Match.js';
import OutboxEvent from '../models/OutboxEvent.js';
import ImageAnalysis from '../models/ImageAnalysis.js';
import AdminLog from '../models/AdminLog.js';
import AIDecisionFeedback from '../models/AIDecisionFeedback.js';
import DuplicateReviewCluster from '../models/DuplicateReviewCluster.js';
import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { paginate } from '../utils/pagination.js';
import { getCache, setCache, deleteCache } from '../config/redis.js';
import { ensureNotLastActiveAdmin, anonymizeAccount } from '../services/accountService.js';
import { revokeAllUserSessions } from '../services/sessionService.js';
import { sendEmail } from '../services/emailService.js';
import {
  answerAdminAnalyticsQuestion,
  buildOperationalIntelligence,
  mergeBuckets,
  mergeHourBuckets,
} from '../services/operationalIntelligenceService.js';

const CACHE_KEY_DASHBOARD = 'admin:dashboard:stats';
const CACHE_TTL_SECONDS = 60;
const cleanUser = (user) => {
  const value = user?.toJSON ? user.toJSON() : { ...(user || {}) };
  delete value.pushSubscription;
  delete value.googleId;
  return value;
};

const getDashboardStats = asyncHandler(async (_req, res) => {
  const cachedStats = await getCache(CACHE_KEY_DASHBOARD);
  if (cachedStats) return ApiResponse.ok(cachedStats, 'Dashboard stats retrieved from cache.').send(res);

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setUTCMonth(sixMonthsAgo.getUTCMonth() - 6);
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const predictionLookbackDays = Math.min(1095, Math.max(30, Number(process.env.PREDICTION_LOOKBACK_DAYS || 365)));
  const predictionMinimumSample = Math.min(100, Math.max(5, Number(process.env.PREDICTION_MINIMUM_SAMPLE || 10)));
  const predictionWindowStart = new Date(Date.now() - predictionLookbackDays * 24 * 60 * 60 * 1000);
  const [
    totalUsers, totalLost, totalFound, resolvedLost, resolvedFound,
    totalClaims, pendingClaims, monthlyLostAgg, monthlyFoundAgg,
    lostStatusDist, foundStatusDist, strongSuggestedMatches, overdueClaims,
    deadOutboxEvents, weakEvidenceClaims, privacyReviewItems, highRiskClaims,
    overdueLostHandovers, overdueFoundHandovers, pendingAIFeedback,
    newLost24, newFound24, approvedClaims30, lostLocationBuckets, foundLocationBuckets,
    lostCategoryBuckets, foundCategoryBuckets, recoveryDurationAgg,
    categoryOutcomeCohorts, locationOutcomeCohorts, pendingDuplicateReviews,
    lostHourBuckets, foundHourBuckets,
  ] = await Promise.all([
    User.countDocuments({ deletedAt: null }),
    LostItem.countDocuments({ isDeleted: { $ne: true } }),
    FoundItem.countDocuments({ isDeleted: { $ne: true } }),
    LostItem.countDocuments({ isDeleted: { $ne: true }, status: 'claimed' }),
    FoundItem.countDocuments({ isDeleted: { $ne: true }, status: 'claimed' }),
    ClaimRequest.countDocuments({}),
    ClaimRequest.countDocuments({ status: 'pending' }),
    LostItem.aggregate([{ $match: { createdAt: { $gte: sixMonthsAgo }, isDeleted: { $ne: true } } }, { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, count: { $sum: 1 } } }, { $sort: { '_id.year': 1, '_id.month': 1 } }]),
    FoundItem.aggregate([{ $match: { createdAt: { $gte: sixMonthsAgo }, isDeleted: { $ne: true } } }, { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, count: { $sum: 1 } } }, { $sort: { '_id.year': 1, '_id.month': 1 } }]),
    LostItem.aggregate([{ $match: { isDeleted: { $ne: true } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    FoundItem.aggregate([{ $match: { isDeleted: { $ne: true } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Match.countDocuments({ status: 'suggested', $or: [{ confidenceBand: { $in: ['strong', 'very-strong'] } }, { similarityScore: { $gte: 70 } }] }),
    ClaimRequest.countDocuments({ status: 'pending', createdAt: { $lt: twoDaysAgo } }),
    OutboxEvent.countDocuments({ status: 'dead' }),
    ClaimRequest.countDocuments({ status: 'pending', 'evidenceAssessment.level': 'weak' }),
    ImageAnalysis.countDocuments({ moderationDecision: { $in: ['review', 'reject'] } }),
    ClaimRequest.countDocuments({ status: 'pending', 'riskAssessment.requiresHumanReview': true }),
    LostItem.countDocuments({ isDeleted: { $ne: true }, status: 'in_progress', connectedAt: { $lt: twoDaysAgo } }),
    FoundItem.countDocuments({ isDeleted: { $ne: true }, status: 'in_progress', connectedAt: { $lt: twoDaysAgo } }),
    AIDecisionFeedback.countDocuments({ status: 'pending' }),
    LostItem.countDocuments({ createdAt: { $gte: oneDayAgo }, isDeleted: { $ne: true } }),
    FoundItem.countDocuments({ createdAt: { $gte: oneDayAgo }, isDeleted: { $ne: true } }),
    ClaimRequest.countDocuments({ status: 'approved', reviewedAt: { $gte: thirtyDaysAgo } }),
    LostItem.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, isDeleted: { $ne: true } } },
      { $group: { _id: { $ifNull: ['$locationIntelligence.canonicalName', '$lostLocation'] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } }, { $limit: 12 },
    ]),
    FoundItem.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, isDeleted: { $ne: true } } },
      { $group: { _id: { $ifNull: ['$locationIntelligence.canonicalName', '$foundLocation'] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } }, { $limit: 12 },
    ]),
    LostItem.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, isDeleted: { $ne: true } } },
      { $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 12 },
    ]),
    FoundItem.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, isDeleted: { $ne: true } } },
      { $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 12 },
    ]),
    LostItem.aggregate([
      { $match: { resolvedAt: { $type: 'date' }, createdAt: { $type: 'date' }, isDeleted: { $ne: true } } },
      { $project: { hours: { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3_600_000] } } },
      { $match: { hours: { $gte: 0, $lte: 8760 } } },
      { $group: { _id: null, averageHours: { $avg: '$hours' }, sampleSize: { $sum: 1 } } },
    ]),
    LostItem.aggregate([
      { $match: { createdAt: { $gte: predictionWindowStart }, isDeleted: { $ne: true }, isArchived: { $ne: true } } },
      { $group: {
        _id: '$category',
        sampleSize: { $sum: 1 },
        recovered: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'claimed'] }, { $eq: [{ $type: '$resolvedAt' }, 'date'] }] }, 1, 0] } },
        averageRecoveryHours: { $avg: { $cond: [
          { $and: [{ $eq: ['$status', 'claimed'] }, { $eq: [{ $type: '$resolvedAt' }, 'date'] }, { $eq: [{ $type: '$createdAt' }, 'date'] }] },
          { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3_600_000] },
          null,
        ] } },
        recoveryDurationSample: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'claimed'] }, { $eq: [{ $type: '$resolvedAt' }, 'date'] }] }, 1, 0] } },
      } },
      { $sort: { sampleSize: -1 } }, { $limit: 20 },
    ]),
    LostItem.aggregate([
      { $match: {
        createdAt: { $gte: predictionWindowStart },
        isDeleted: { $ne: true },
        isArchived: { $ne: true },
        'locationIntelligence.needsReview': false,
        'locationIntelligence.canonicalId': { $nin: ['', null] },
        'locationIntelligence.canonicalName': { $nin: ['', null] },
        'locationIntelligence.sensitivity': { $in: ['public', 'zone-only'] },
        'locationIntelligence.verificationStatus': { $in: ['map-source-verified', 'field-verified', 'university-approved'] },
      } },
      { $group: {
        _id: {
          id: '$locationIntelligence.canonicalId',
          canonicalName: '$locationIntelligence.canonicalName',
          verificationStatus: '$locationIntelligence.verificationStatus',
        },
        sampleSize: { $sum: 1 },
        recovered: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'claimed'] }, { $eq: [{ $type: '$resolvedAt' }, 'date'] }] }, 1, 0] } },
        averageRecoveryHours: { $avg: { $cond: [
          { $and: [{ $eq: ['$status', 'claimed'] }, { $eq: [{ $type: '$resolvedAt' }, 'date'] }, { $eq: [{ $type: '$createdAt' }, 'date'] }] },
          { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3_600_000] },
          null,
        ] } },
        recoveryDurationSample: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'claimed'] }, { $eq: [{ $type: '$resolvedAt' }, 'date'] }] }, 1, 0] } },
      } },
      { $sort: { sampleSize: -1 } }, { $limit: 20 },
    ]),
    DuplicateReviewCluster.countDocuments({ status: 'pending' }),
    LostItem.aggregate([
      { $match: { lostDate: { $gte: thirtyDaysAgo }, isDeleted: { $ne: true } } },
      { $group: { _id: { $hour: { date: '$lostDate', timezone: 'Asia/Colombo' } }, count: { $sum: 1 } } },
    ]),
    FoundItem.aggregate([
      { $match: { foundDate: { $gte: thirtyDaysAgo }, isDeleted: { $ne: true } } },
      { $group: { _id: { $hour: { date: '$foundDate', timezone: 'Asia/Colombo' } }, count: { $sum: 1 } } },
    ]),
  ]);

  const summary = {
    totalUsers,
    totalLostItems: totalLost,
    totalFoundItems: totalFound,
    successfulRecoveries: resolvedLost,
    resolvedLostReports: resolvedLost,
    resolvedFoundReports: resolvedFound,
    totalClaims,
    pendingClaims,
  };
  const operations = {
    pendingClaims,
    overdueClaims,
    strongSuggestedMatches,
    overdueHandovers: overdueLostHandovers + overdueFoundHandovers,
    deadOutboxEvents,
    weakEvidenceClaims,
    privacyReviewItems,
    highRiskClaims,
    pendingAIFeedback,
    pendingDuplicateReviews,
    aiRiskPolicy: 'human-review-only',
    aiFeedbackPolicy: 'admin-approved-dataset-only',
    urgentTotal: overdueClaims + strongSuggestedMatches + overdueLostHandovers + overdueFoundHandovers + deadOutboxEvents + privacyReviewItems + highRiskClaims + pendingAIFeedback + pendingDuplicateReviews,
    generatedAt: new Date().toISOString(),
  };
  const locations = mergeBuckets(lostLocationBuckets, foundLocationBuckets);
  const categories = mergeBuckets(lostCategoryBuckets, foundCategoryBuckets);
  const times = mergeHourBuckets(lostHourBuckets, foundHourBuckets);
  const recoveryAggregate = recoveryDurationAgg[0] || {};
  const intelligence = buildOperationalIntelligence({
    summary, operations, newLost24, newFound24, approvedClaims30, locations, categories, times,
    averageRecoveryHours: recoveryAggregate.averageHours, recoverySampleSize: recoveryAggregate.sampleSize,
    categoryOutcomeCohorts, locationOutcomeCohorts, predictionMinimumSample, predictionLookbackDays,
  });

  const stats = {
    summary,
    operations,
    intelligence,
    analytics: {
      monthlyLost: monthlyLostAgg.map((entry) => ({ month: `${entry._id.year}-${String(entry._id.month).padStart(2, '0')}`, count: entry.count })),
      monthlyFound: monthlyFoundAgg.map((entry) => ({ month: `${entry._id.year}-${String(entry._id.month).padStart(2, '0')}`, count: entry.count })),
      lostStatusBreakdown: Object.fromEntries(lostStatusDist.map((entry) => [entry._id, entry.count])),
      foundStatusBreakdown: Object.fromEntries(foundStatusDist.map((entry) => [entry._id, entry.count])),
    },
  };
  await setCache(CACHE_KEY_DASHBOARD, stats, CACHE_TTL_SECONDS);
  return ApiResponse.ok(stats, 'Dashboard statistics compiled.').send(res);
});

const explainAdminAnalytics = asyncHandler(async (req, res) => {
  const question = String(req.body?.question || '').normalize('NFKC').trim().slice(0, 300);
  if (!question) throw ApiError.badRequest('An analytics question is required.');
  const stats = await getCache(CACHE_KEY_DASHBOARD);
  if (!stats?.intelligence) throw ApiError.conflict('Load the analytics dashboard once to compile the latest aggregate evidence.');
  const explanation = answerAdminAnalyticsQuestion(stats.intelligence, question);
  return ApiResponse.ok(explanation, 'Grounded aggregate analytics explanation generated.').send(res);
});

const getUsers = asyncHandler(async (req, res) => {
  const filter = { deletedAt: null };
  if (req.query.role) filter.role = req.query.role;
  if (req.query.search) {
    const escaped = String(req.query.search).slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { fullName: { $regex: escaped, $options: 'i' } },
      { email: { $regex: escaped, $options: 'i' } },
      { studentId: { $regex: escaped, $options: 'i' } },
    ];
  }
  const totalDocs = await User.countDocuments(filter);
  const pagination = paginate(req.query, totalDocs);
  const users = await User.find(filter).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit);
  return ApiResponse.ok({ users: users.map(cleanUser), pagination }, 'Users list retrieved.').send(res);
});

const updateUserStatus = asyncHandler(async (req, res) => {
  if (typeof req.body.isActive !== 'boolean') throw ApiError.badRequest('isActive must be a boolean.');
  const { isActive } = req.body;
  if (String(req.params.id) === String(req.user._id)) throw ApiError.badRequest('You cannot change your own account status.');

  const session = await mongoose.startSession();
  let output;
  let emailData;
  try {
    await session.withTransaction(async () => {
      const user = await User.findById(req.params.id).session(session);
      if (!user || user.deletedAt) throw ApiError.notFound('User not found.');
      if (!isActive) await ensureNotLastActiveAdmin(user, session);
      const previous = user.isActive;
      user.isActive = isActive;
      await user.save({ session });
      await AdminLog.create([{
        adminId: req.user._id,
        action: isActive ? 'USER_ACTIVATION' : 'USER_DEACTIVATION',
        targetModel: 'User',
        targetId: user._id,
        details: `Updated active status from ${previous} to ${isActive}`,
        ipAddress: String(req.ip || '').slice(0, 100),
      }], { session });
      output = cleanUser(user);
      emailData = { email: user.email, name: user.fullName };
    });
  } finally { await session.endSession(); }

  if (!isActive) {
    await revokeAllUserSessions(req.params.id);
    await sendEmail({ to: emailData.email, template: 'accountSuspended', data: { name: emailData.name, reason: String(req.body.reason || 'Administrative action').slice(0, 500) } }).catch(() => false);
  }
  await deleteCache(CACHE_KEY_DASHBOARD);
  return ApiResponse.ok(output, `User account ${isActive ? 'activated' : 'deactivated'} successfully.`).send(res);
});

const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) throw ApiError.badRequest('Invalid role.');
  if (String(req.params.id) === String(req.user._id)) throw ApiError.badRequest('You cannot change your own role.');

  const session = await mongoose.startSession();
  let output;
  try {
    await session.withTransaction(async () => {
      const user = await User.findById(req.params.id).session(session);
      if (!user || user.deletedAt) throw ApiError.notFound('User not found.');
      if (role === 'user') await ensureNotLastActiveAdmin(user, session);
      const previous = user.role;
      user.role = role;
      await user.save({ session });
      await AdminLog.create([{
        adminId: req.user._id,
        action: role === 'admin' ? 'USER_PROMOTED' : 'USER_DEMOTED',
        targetModel: 'User',
        targetId: user._id,
        details: `Updated role from ${previous} to ${role}`,
        ipAddress: String(req.ip || '').slice(0, 100),
      }], { session });
      output = cleanUser(user);
    });
  } finally { await session.endSession(); }
  await revokeAllUserSessions(req.params.id);
  await deleteCache(CACHE_KEY_DASHBOARD);
  return ApiResponse.ok(output, `User role updated to ${role}.`).send(res);
});

const getAdminLogs = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.adminId) filter.adminId = req.query.adminId;
  if (req.query.action) filter.action = String(req.query.action).slice(0, 200);
  const totalDocs = await AdminLog.countDocuments(filter);
  const pagination = paginate(req.query, totalDocs);
  const logs = await AdminLog.find(filter).populate('adminId', 'fullName email role').sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit).lean();
  return ApiResponse.ok({ logs, pagination }, 'Admin logs retrieved.').send(res);
});

const deleteUser = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) throw ApiError.badRequest('Use the self-service account deletion endpoint for your own account.');
  await anonymizeAccount({
    userId: req.params.id,
    actorId: req.user._id,
    ipAddress: req.ip,
    reason: req.body?.reason || 'Account deleted by administrator',
  });
  await deleteCache(CACHE_KEY_DASHBOARD);
  return ApiResponse.ok(null, 'User account anonymized successfully.').send(res);
});

export { deleteUser, explainAdminAnalytics, getAdminLogs, getDashboardStats, getUsers, updateUserRole, updateUserStatus };
