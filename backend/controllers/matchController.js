// ============================================
// Match Controller
// Handles querying and updating suggested matches
// ============================================

import Match from '../models/Match.js';
import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { paginate } from '../utils/pagination.js';
import { createNotification } from '../services/notificationService.js';

/**
 * Get matches for the logged-in user or general matches (admin).
 * Filters: status (suggested, confirmed, rejected).
 */
const getMatches = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const userId = req.user._id;
  const isAdmin = req.user.role === 'admin';

  const filter = {};

  // If user is not admin, they can only see matches where they are either the lost reporter or found reporter
  if (!isAdmin) {
    filter.$or = [{ lostUserId: userId }, { foundUserId: userId }];
  } else if (req.query.userId) {
    filter.$or = [{ lostUserId: req.query.userId }, { foundUserId: req.query.userId }];
  }

  if (status) {
    filter.status = status;
  } else {
    // Default: don't show rejected matches to standard users
    filter.status = { $ne: 'rejected' };
  }

  const totalDocs = await Match.countDocuments(filter);
  const pagination = paginate(req.query, totalDocs);

  const matches = await Match.find(filter)
    .populate({
      path: 'lostItemId',
      populate: { path: 'userId', select: 'fullName email phone profileImage' }
    })
    .populate({
      path: 'foundItemId',
      populate: { path: 'userId', select: 'fullName email phone profileImage' }
    })
    .sort({ similarityScore: -1, createdAt: -1 })
    .skip(pagination.skip)
    .limit(pagination.limit)
    .lean();

  ApiResponse.ok({ matches, pagination }, 'Matches retrieved successfully.').send(res);
});

/**
 * Get match by ID.
 */
const getMatchById = asyncHandler(async (req, res) => {
  const match = await Match.findById(req.params.id)
    .populate({
      path: 'lostItemId',
      populate: { path: 'userId', select: 'fullName email phone profileImage' }
    })
    .populate({
      path: 'foundItemId',
      populate: { path: 'userId', select: 'fullName email phone profileImage' }
    })
    .lean();

  if (!match) {
    throw ApiError.notFound('Match not found.');
  }

  // Authorisation check: user must be admin, lost reporter, or found reporter
  const isLostOwner = match.lostUserId.toString() === req.user._id.toString();
  const isFoundOwner = match.foundUserId.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isLostOwner && !isFoundOwner && !isAdmin) {
    throw ApiError.forbidden('You are not authorised to view this match.');
  }

  ApiResponse.ok(match, 'Match details retrieved successfully.').send(res);
});

/**
 * Update match status (confirm or reject a suggestion).
 */
const updateMatchStatus = asyncHandler(async (req, res) => {
  const { status } = req.body; // 'confirmed' or 'rejected'
  const match = await Match.findById(req.params.id)
    .populate('lostItemId')
    .populate('foundItemId');

  if (!match) {
    throw ApiError.notFound('Match not found.');
  }

  const isLostOwner = match.lostUserId.toString() === req.user._id.toString();
  const isFoundOwner = match.foundUserId.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isLostOwner && !isFoundOwner && !isAdmin) {
    throw ApiError.forbidden('You are not authorised to update this match.');
  }

  // Update status
  match.status = status;
  await match.save();

  // Trigger notifications based on status change
  if (status === 'confirmed') {
    // Notify the opposite user
    const recipientId = isLostOwner ? match.foundUserId : match.lostUserId;
    const itemOwned = isLostOwner ? match.lostItemId.itemName : match.foundItemId.itemName;
    const actionTaken = isLostOwner ? 'lost owner' : 'found reporter';

    await createNotification({
      userId: recipientId,
      title: '🤝 Match Confirmed!',
      message: `The ${actionTaken} has confirmed the match for "${itemOwned}". You can now connect or proceed with claim.`,
      type: 'item_update',
      relatedItem: { itemType: 'Match', itemId: match._id }
    });
  } else if (status === 'rejected') {
    // Revert items' status to original if there are no other suggested/confirmed matches
    // Fetch if there are other matches for lost item
    const lostItemMatches = await Match.countDocuments({
      lostItemId: match.lostItemId._id,
      status: { $in: ['suggested', 'confirmed'] },
      _id: { $ne: match._id }
    });
    if (lostItemMatches === 0 && match.lostItemId.status === 'matched') {
      match.lostItemId.status = 'pending';
      await match.lostItemId.save();
    }

    // Fetch other matches for found item
    const foundItemMatches = await Match.countDocuments({
      foundItemId: match.foundItemId._id,
      status: { $in: ['suggested', 'confirmed'] },
      _id: { $ne: match._id }
    });
    if (foundItemMatches === 0 && match.foundItemId.status === 'matched') {
      match.foundItemId.status = 'available';
      await match.foundItemId.save();
    }
  }

  ApiResponse.ok(match, `Match status updated to ${status} successfully.`).send(res);
});

export {
  getMatches,
  getMatchById,
  updateMatchStatus
};
