import User from '../models/User.js';
import LostItem from '../models/LostItem.js';
import FoundItem from '../models/FoundItem.js';
import ClaimRequest from '../models/ClaimRequest.js';
import Match from '../models/Match.js';
import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { uploadImage, deleteImage } from '../services/cloudinaryService.js';
import { revokeAllUserSessions } from '../services/sessionService.js';
import { anonymizeAccount } from '../services/accountService.js';
import { clearAuthCookies } from '../utils/cookies.js';

const updateProfile = asyncHandler(async (req, res) => {
  const { fullName, phone, studentId } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) throw ApiError.notFound('User not found.');

  if (studentId && studentId !== user.studentId) {
    const existing = await User.exists({ studentId: studentId.toUpperCase(), _id: { $ne: user._id } });
    if (existing) throw ApiError.conflict('Student ID is already taken.');
    user.studentId = studentId;
  }
  if (fullName !== undefined) user.fullName = String(fullName).trim();
  if (phone !== undefined) user.phone = String(phone).trim();

  let newImage = null;
  const oldImage = user.profileImage?.publicId ? { ...user.profileImage } : null;
  try {
    if (req.file) {
      newImage = await uploadImage(req.file.buffer, 'profile-images');
      user.profileImage = { url: newImage.url, publicId: newImage.publicId };
    }
    await user.save();
  } catch (error) {
    if (newImage?.publicId) await deleteImage(newImage);
    throw error;
  }
  if (newImage && oldImage?.publicId) await deleteImage(oldImage);

  return ApiResponse.ok(user, 'Profile updated successfully.').send(res);
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!user) throw ApiError.notFound('User not found.');
  if (!await user.comparePassword(currentPassword)) throw ApiError.unauthorized('Incorrect current password.');
  user.password = newPassword;
  await user.save();
  await revokeAllUserSessions(user._id);
  clearAuthCookies(res);
  return ApiResponse.ok(null, 'Password changed successfully. Sign in again on all devices.').send(res);
});

const getUserStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const [lostItems, foundItems] = await Promise.all([
    LostItem.find({ userId, isDeleted: { $ne: true } }).select('_id status').lean(),
    FoundItem.find({ userId, isDeleted: { $ne: true } }).select('_id status').lean(),
  ]);
  const lostIds = lostItems.map((item) => item._id);
  const foundIds = foundItems.map((item) => item._id);
  const [claimsCount, pendingClaims, claimsAwaitingReview, suggestedMatches] = await Promise.all([
    ClaimRequest.countDocuments({ claimantId: userId }),
    ClaimRequest.countDocuments({ claimantId: userId, status: 'pending' }),
    ClaimRequest.countDocuments({ status: 'pending', $or: [{ lostItemId: { $in: lostIds } }, { foundItemId: { $in: foundIds } }] }),
    Match.countDocuments({ status: 'suggested', $or: [{ lostUserId: userId }, { foundUserId: userId }] }),
  ]);
  const totalLostItems = lostItems.length;
  const totalFoundItems = foundItems.length;
  const successfulRecoveries = lostItems.filter((item) => item.status === 'claimed').length;
  const activeReports = lostItems.filter((item) => ['pending', 'matched', 'in_progress'].includes(item.status)).length
    + foundItems.filter((item) => ['available', 'matched', 'in_progress'].includes(item.status)).length;
  const handoverPending = lostItems.filter((item) => item.status === 'in_progress').length
    + foundItems.filter((item) => item.status === 'in_progress').length;

  return ApiResponse.ok({
    totalLostItems,
    totalFoundItems,
    totalClaims: claimsCount,
    successfulRecoveries,
    attention: {
      suggestedMatches,
      pendingClaims,
      claimsAwaitingReview,
      handoverPending,
      activeReports,
      total: suggestedMatches + pendingClaims + claimsAwaitingReview + handoverPending,
    },
  }, 'User statistics retrieved successfully.').send(res);
});

const deleteMyAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!user) throw ApiError.notFound('User not found.');
  if (user.password) {
    if (!req.body.password || !await user.comparePassword(req.body.password)) {
      throw ApiError.unauthorized('Your current password is required to delete the account.');
    }
  }
  await anonymizeAccount({ userId: user._id, reason: 'Self-service account deletion' });
  clearAuthCookies(res);
  return ApiResponse.ok(null, 'Account deleted and personal data anonymized.').send(res);
});

export { updateProfile, changePassword, getUserStats, deleteMyAccount };
