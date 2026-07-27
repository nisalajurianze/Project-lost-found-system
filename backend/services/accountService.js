import mongoose from 'mongoose';
import User from '../models/User.js';
import LostItem from '../models/LostItem.js';
import FoundItem from '../models/FoundItem.js';
import ClaimRequest from '../models/ClaimRequest.js';
import Match from '../models/Match.js';
import Notification from '../models/Notification.js';
import Feedback from '../models/Feedback.js';
import RefreshSession from '../models/RefreshSession.js';
import AdminLog from '../models/AdminLog.js';
import ApiError from '../utils/apiError.js';
import { deleteMultipleImages } from './cloudinaryService.js';

const ensureNotLastActiveAdmin = async (user, session) => {
  if (user.role !== 'admin' || !user.isActive) return;
  const activeAdmins = await User.countDocuments({ role: 'admin', isActive: true, deletedAt: null }).session(session);
  if (activeAdmins <= 1) throw ApiError.conflict('The last active administrator cannot be deactivated, demoted, or deleted.');
};

const anonymizeAccount = async ({ userId, actorId = null, ipAddress = '', reason = 'Account deletion requested' }) => {
  const session = await mongoose.startSession();
  const media = [];
  let anonymizedUser;

  try {
    await session.withTransaction(async () => {
      const user = await User.findById(userId).select('+googleId +pushSubscription').session(session);
      if (!user) throw ApiError.notFound('User not found.');
      await ensureNotLastActiveAdmin(user, session);

      if (user.profileImage?.publicId) media.push(user.profileImage);
      const [lostReports, foundReports, claims] = await Promise.all([
        LostItem.find({ userId: user._id }).select('_id images').session(session).lean(),
        FoundItem.find({ userId: user._id }).select('_id images').session(session).lean(),
        ClaimRequest.find({ claimantId: user._id }).select('proofImages').session(session).lean(),
      ]);
      const lostReportIds = lostReports.map((report) => report._id);
      const foundReportIds = foundReports.map((report) => report._id);
      lostReports.forEach((report) => media.push(...(report.images || [])));
      foundReports.forEach((report) => media.push(...(report.images || [])));
      claims.forEach((claim) => media.push(...(claim.proofImages || [])));

      const now = new Date();
      await Promise.all([
        LostItem.updateMany(
          { userId: user._id },
          { $set: { isDeleted: true, isArchived: true, status: 'closed', images: [], connectedUserId: null, connectedAt: null, reminderSent: false } },
          { session },
        ),
        FoundItem.updateMany(
          { userId: user._id },
          { $set: { isDeleted: true, isArchived: true, images: [], connectedUserId: null, connectedAt: null, reminderSent: false } },
          { session },
        ),
        LostItem.updateMany(
          { connectedUserId: user._id, status: 'in_progress' },
          { $set: { status: 'pending', connectedUserId: null, connectedAt: null, reminderSent: false } },
          { session },
        ),
        FoundItem.updateMany(
          { connectedUserId: user._id, status: 'in_progress' },
          { $set: { status: 'available', connectedUserId: null, connectedAt: null, reminderSent: false } },
          { session },
        ),
        ClaimRequest.updateMany(
          {
            status: { $in: ['pending', 'approved'] },
            $or: [
              { claimantId: user._id },
              { lostItemId: { $in: lostReportIds } },
              { foundItemId: { $in: foundReportIds } },
            ],
          },
          {
            $set: {
              status: 'rejected',
              adminRemark: 'Claim closed because a participating account was deleted.',
              reviewedAt: now,
              proofDescription: 'Evidence removed after account deletion.',
              proofImages: [],
              isContactShared: false,
            },
          },
          { session },
        ),
        ClaimRequest.updateMany(
          { claimantId: user._id, status: 'rejected' },
          { $set: { proofDescription: 'Evidence removed after account deletion.', proofImages: [], isContactShared: false } },
          { session },
        ),
        Match.updateMany(
          {
            status: { $ne: 'rejected' },
            $or: [
              { lostUserId: user._id },
              { foundUserId: user._id },
              { lostItemId: { $in: lostReportIds } },
              { foundItemId: { $in: foundReportIds } },
            ],
          },
          { $set: { status: 'rejected' } },
          { session },
        ),
        Notification.deleteMany({ userId: user._id }, { session }),
        RefreshSession.deleteMany({ userId: user._id }, { session }),
        Feedback.updateMany({ userId: user._id }, { $set: { subject: 'Feedback from deleted account', message: 'Content removed after account deletion.' } }, { session }),
      ]);

      const suffix = user._id.toString();
      user.fullName = 'Deleted User';
      user.email = `deleted+${suffix}@users.invalid`;
      user.phone = '';
      user.studentId = undefined;
      user.password = undefined;
      user.googleId = undefined;
      user.authProvider = 'local';
      user.profileImage = { url: '', publicId: '' };
      user.pushSubscription = undefined;
      user.role = 'user';
      user.isActive = false;
      user.isVerified = false;
      user.deletedAt = now;
      user.verificationTokenHash = undefined;
      user.verificationTokenExpire = undefined;
      user.resetPasswordTokenHash = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ session, validateBeforeSave: false });
      anonymizedUser = user.toJSON();

      if (actorId) {
        await AdminLog.create([{
          adminId: actorId,
          action: 'USER_ANONYMIZED',
          targetModel: 'User',
          targetId: user._id,
          details: String(reason).slice(0, 1000),
          ipAddress: String(ipAddress).slice(0, 100),
        }], { session });
      }
    });
  } finally {
    await session.endSession();
  }

  await deleteMultipleImages(media);
  return anonymizedUser;
};

export { ensureNotLastActiveAdmin, anonymizeAccount };
