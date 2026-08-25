import mongoose from 'mongoose';
import LostItem from '../models/LostItem.js';
import FoundItem from '../models/FoundItem.js';
import Match from '../models/Match.js';
import ClaimRequest from '../models/ClaimRequest.js';
import ApiError from '../utils/apiError.js';

const id = (value) => value?._id?.toString?.() || value?.toString?.() || '';
const models = (itemType) => itemType === 'LostItem'
  ? { Model: LostItem, Reciprocal: FoundItem, original: 'pending', reciprocalOriginal: 'available', matchField: 'lostItemId', reciprocalField: 'foundItemId' }
  : { Model: FoundItem, Reciprocal: LostItem, original: 'available', reciprocalOriginal: 'pending', matchField: 'foundItemId', reciprocalField: 'lostItemId' };

const authorizeParticipant = (item, user) => {
  const allowed = user.role === 'admin' || id(item.userId) === id(user) || id(item.connectedUserId) === id(user);
  if (!allowed) throw ApiError.forbidden('You are not authorised to change this handover.');
};

const approvedClaimForItem = (itemType, item, session) => ClaimRequest.findOne({
  status: 'approved',
  claimantId: item.connectedUserId,
  ...(itemType === 'LostItem' ? { lostItemId: item._id } : { foundItemId: item._id }),
}).session(session);

const resolveItemHandover = async (itemType, itemId, user) => {
  const { Model, Reciprocal, matchField, reciprocalField } = models(itemType);
  const session = await mongoose.startSession();
  let output;
  try {
    await session.withTransaction(async () => {
      const item = await Model.findById(itemId).session(session);
      if (!item || item.isDeleted) throw ApiError.notFound('Item not found.');
      if (item.status !== 'in_progress') throw ApiError.conflict('Item must be in progress before it can be resolved.');
      authorizeParticipant(item, user);

      const claim = await approvedClaimForItem(itemType, item, session);
      if (!claim) throw ApiError.conflict('The active handover is not bound to an approved claim.');
      const match = claim.matchId
        ? await Match.findOne({ _id: claim.matchId, [matchField]: item._id, status: 'confirmed' }).session(session)
        : null;
      if (claim.matchId && !match) throw ApiError.conflict('The approved claim match is unavailable or changed.');
      const now = new Date();
      item.status = 'claimed';
      item.resolvedAt = now;
      item.reminderSent = false;
      await item.save({ session });

      if (match) {
        const reciprocal = await Reciprocal.findById(match[reciprocalField]).session(session);
        if (reciprocal && !reciprocal.isDeleted && reciprocal.status === 'in_progress') {
          reciprocal.status = 'claimed';
          reciprocal.resolvedAt = now;
          reciprocal.reminderSent = false;
          await reciprocal.save({ session });
        }
      }
      output = item.toObject();
    });
  } finally { await session.endSession(); }
  return output;
};

const cancelItemHandover = async (itemType, itemId, user, reason = '') => {
  const { Model, Reciprocal, original, reciprocalOriginal, matchField, reciprocalField } = models(itemType);
  const session = await mongoose.startSession();
  let output;
  try {
    await session.withTransaction(async () => {
      const item = await Model.findById(itemId).session(session);
      if (!item || item.isDeleted) throw ApiError.notFound('Item not found.');
      if (item.status !== 'in_progress') throw ApiError.conflict('Item must be in progress before the connection can be cancelled.');
      authorizeParticipant(item, user);

      const claim = await approvedClaimForItem(itemType, item, session);
      if (!claim) throw ApiError.conflict('The active handover is not bound to an approved claim.');
      const match = claim.matchId
        ? await Match.findOne({ _id: claim.matchId, [matchField]: item._id, status: 'confirmed' }).session(session)
        : null;
      if (claim.matchId && !match) throw ApiError.conflict('The approved claim match is unavailable or changed.');
      item.status = original;
      item.connectedUserId = null;
      item.connectedAt = null;
      item.reminderSent = false;
      await item.save({ session });

      if (match) {
        const reciprocal = await Reciprocal.findById(match[reciprocalField]).session(session);
        if (reciprocal && !reciprocal.isDeleted && reciprocal.status === 'in_progress') {
          reciprocal.status = reciprocalOriginal;
          reciprocal.connectedUserId = null;
          reciprocal.connectedAt = null;
          reciprocal.reminderSent = false;
          await reciprocal.save({ session });
        }
        match.status = 'suggested';
        await match.save({ session });
      }
      claim.status = 'rejected';
      claim.isContactShared = false;
      claim.adminRemark = String(reason || 'Handover was cancelled.').slice(0, 1000);
      claim.reviewedAt = new Date();
      claim.reviewedBy = user._id;
      await claim.save({ session });
      output = item.toObject();
    });
  } finally { await session.endSession(); }
  return output;
};

export { resolveItemHandover, cancelItemHandover };
