// ============================================
// User Controller
// Handles user profile updates, password changes, and user statistics
// ============================================

import User from '../models/User.js';
import LostItem from '../models/LostItem.js';
import FoundItem from '../models/FoundItem.js';
import ClaimRequest from '../models/ClaimRequest.js';
import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { uploadImage, deleteImage } from '../services/cloudinaryService.js';

/**
 * Update user profile details (fullName, phone, studentId, and profileImage).
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { fullName, phone, studentId } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    throw ApiError.notFound('User not found.');
  }

  // Check unique constraints if studentId is changed
  if (studentId && studentId !== user.studentId) {
    const existing = await User.findOne({ studentId });
    if (existing) {
      throw ApiError.conflict('Student ID is already taken.');
    }
    user.studentId = studentId;
  }

  // Update text fields
  if (fullName) user.fullName = fullName;
  if (phone !== undefined) user.phone = phone;

  // Handle profile image upload if provided
  if (req.file) {
    // Delete old image if it exists in Cloudinary
    if (user.profileImage && user.profileImage.publicId) {
      await deleteImage(user.profileImage.publicId);
    }

    // Upload new image
    const uploadResult = await uploadImage(req.file.buffer, 'profile-images', {
      transformation: [{ width: 300, height: 300, crop: 'fill', gravity: 'face' }]
    });

    user.profileImage = {
      url: uploadResult.url,
      publicId: uploadResult.publicId
    };
  }

  await user.save();

  ApiResponse.ok(user, 'Profile updated successfully.').send(res);
});

/**
 * Change account password.
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  // Fetch user with password
  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    throw ApiError.notFound('User not found.');
  }

  // Verify current password
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw ApiError.unauthorized('Incorrect current password.');
  }

  // Save new password (pre-save hook hashes it)
  user.password = newPassword;
  user.refreshToken = undefined; // Invalidate refresh token to force re-login
  await user.save();

  ApiResponse.ok(null, 'Password changed successfully. Please login again.').send(res);
});

/**
 * Get aggregated statistics for the logged-in user.
 */
const getUserStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [lostCount, foundCount, claimsCount, resolvedClaims] = await Promise.all([
    LostItem.countDocuments({ userId, isDeleted: { $ne: true } }),
    FoundItem.countDocuments({ userId, isDeleted: { $ne: true } }),
    ClaimRequest.countDocuments({ claimantId: userId }),
    ClaimRequest.countDocuments({ claimantId: userId, status: 'approved' })
  ]);

  const stats = {
    totalLostItems: lostCount,
    totalFoundItems: foundCount,
    totalClaims: claimsCount,
    successfulRecoveries: resolvedClaims
  };

  ApiResponse.ok(stats, 'User statistics retrieved successfully.').send(res);
});

export {
  updateProfile,
  changePassword,
  getUserStats
};
