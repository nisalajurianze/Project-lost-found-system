import mongoose from 'mongoose';
import Match from '../models/Match.js';
import AIDecisionFeedback from '../models/AIDecisionFeedback.js';
import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { paginate } from '../utils/pagination.js';
import { createNotification } from '../services/notificationService.js';
import { cloneForView } from '../utils/serializers.js';

const id = (value) => value?._id?.toString?.() || value?.toString?.() || '';
const publicUser = (user) => user ? { _id: user._id, fullName: user.fullName, profileImage: user.profileImage } : null;
export const privateMatchItem = (item) => {
  if (!item) return null;
  const output = cloneForView(item);
  output.userId = publicUser(output.userId);
  delete output.connectedUserId;
  delete output.connectedAt;
  delete output.contactPreference;
  delete output.contactVisibility;
  delete output.__v;
  return output;
};
const matchView = (match) => ({
  ...match,
  lostItemId: privateMatchItem(match.lostItemId),
  foundItemId: privateMatchItem(match.foundItemId),
});

const populateMatch = (query) => query
  .populate({ path: 'lostItemId', populate: { path: 'userId', select: 'fullName profileImage' } })
  .populate({ path: 'foundItemId', populate: { path: 'userId', select: 'fullName profileImage' } });

const getMatches = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const userId = req.user._id;
  const isAdmin = req.user.role === 'admin';
  const filter = {};

  if (!isAdmin) filter.$or = [{ lostUserId: userId }, { foundUserId: userId }];
  else if (req.query.userId) filter.$or = [{ lostUserId: req.query.userId }, { foundUserId: req.query.userId }];

  if (status) filter.status = status;
  else if (!isAdmin) filter.status = { $ne: 'rejected' };

  const totalDocs = await Match.countDocuments(filter);
  const pagination = paginate(req.query, totalDocs);
  const matches = await populateMatch(Match.find(filter))
    .sort({ similarityScore: -1, createdAt: -1 })
    .skip(pagination.skip)
    .limit(pagination.limit)
    .lean();

  return ApiResponse.ok({ matches: matches.map(matchView), pagination }, 'Matches retrieved successfully.').send(res);
});

const getMatchById = asyncHandler(async (req, res) => {
  const match = await populateMatch(Match.findById(req.params.id)).lean();
  if (!match) throw ApiError.notFound('Match not found.');

  const authorised = req.user.role === 'admin'
    || id(match.lostUserId) === id(req.user)
    || id(match.foundUserId) === id(req.user);
  if (!authorised) throw ApiError.forbidden('You are not authorised to view this match.');

  return ApiResponse.ok(matchView(match), 'Match details retrieved successfully.').send(res);
});

const updateMatchStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['confirmed', 'rejected'].includes(status)) throw ApiError.badRequest('Status must be confirmed or rejected.');

  const session = await mongoose.startSession();
  let notification;
  let result;
  try {
    await session.withTransaction(async () => {
      const match = await Match.findById(req.params.id)
        .populate('lostItemId')
        .populate('foundItemId')
        .session(session);
      if (!match) throw ApiError.notFound('Match not found.');

      const isLostOwner = id(match.lostUserId) === id(req.user);
      const isFoundOwner = id(match.foundUserId) === id(req.user);
      const isAdmin = req.user.role === 'admin';
      if (!isLostOwner && !isFoundOwner && !isAdmin) throw ApiError.forbidden('You are not authorised to update this match.');
      if (match.status !== 'suggested' && match.status !== status) {
        throw ApiError.conflict('This match decision has already been finalized.');
      }

      const isNewDecision = match.status === 'suggested';
      match.status = status;
      await match.save({ session });
      if (isNewDecision) await AIDecisionFeedback.create([{
        targetType: 'Match',
        targetId: match._id,
        submittedBy: req.user._id,
        decision: status === 'confirmed' ? 'confirmed' : 'not-same',
        source: 'user-action',
        status: 'pending',
        algorithmVersion: match.algorithmVersion || '',
      }], { session });

      if (status === 'confirmed') {
        notification = {
          userId: isLostOwner ? match.foundUserId : match.lostUserId,
          title: 'Match confirmed',
          message: `A participant confirmed the potential match for “${match.lostItemId.itemName}”. Continue through the secure claim workflow.`,
          type: 'item_update',
          relatedItem: { itemType: 'Match', itemId: match._id },
          dedupeKey: `match-confirmed:${match._id}`,
        };
      } else {
        const [otherLostMatches, otherFoundMatches] = await Promise.all([
          Match.countDocuments({ lostItemId: match.lostItemId._id, status: { $in: ['suggested', 'confirmed'] }, _id: { $ne: match._id } }).session(session),
          Match.countDocuments({ foundItemId: match.foundItemId._id, status: { $in: ['suggested', 'confirmed'] }, _id: { $ne: match._id } }).session(session),
        ]);
        if (otherLostMatches === 0 && match.lostItemId.status === 'matched') {
          match.lostItemId.status = 'pending';
          await match.lostItemId.save({ session });
        }
        if (otherFoundMatches === 0 && match.foundItemId.status === 'matched') {
          match.foundItemId.status = 'available';
          await match.foundItemId.save({ session });
        }
      }
      result = match.toObject();
    });
  } finally {
    await session.endSession();
  }

  if (notification) await createNotification(notification);
  return ApiResponse.ok(result, `Match status updated to ${status} successfully.`).send(res);
});

export { getMatches, getMatchById, updateMatchStatus };
