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

      const match = await Match.findOne({ [matchField]: item._id, status: 'confirmed' }).session(session);
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

      const match = await Match.findOne({ [matchField]: item._id, status: 'confirmed' }).session(session);
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
        await ClaimRequest.updateMany(
          { matchId: match._id, status: 'approved' },
          { $set: { status: 'rejected', adminRemark: String(reason || 'Handover was cancelled.').slice(0, 1000), reviewedAt: new Date(), reviewedBy: user._id } },
          { session },
        );
      }
      output = item.toObject();
    });
  } finally { await session.endSession(); }
  return output;
};

export { resolveItemHandover, cancelItemHandover };
