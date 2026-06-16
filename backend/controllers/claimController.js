// ============================================
// Claim Request Controller
// Handles item ownership claims and admin approvals
// ============================================

import ClaimRequest from '../models/ClaimRequest.js';
import FoundItem from '../models/FoundItem.js';
import LostItem from '../models/LostItem.js';
import Match from '../models/Match.js';
import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { paginate } from '../utils/pagination.js';
import { uploadMultipleImages } from '../services/cloudinaryService.js';
import { sendEmail } from '../services/emailService.js';
import { createNotification } from '../services/notificationService.js';

/**
 * Submit a claim request for a found item.
 */
const createClaimRequest = asyncHandler(async (req, res) => {
  const { foundItemId, proofDescription, matchId } = req.body;
  const claimantId = req.user._id;

  // Verify found item exists and is not already claimed
  const foundItem = await FoundItem.findOne({ _id: foundItemId, isDeleted: { $ne: true } }).populate('userId');
  if (!foundItem) {
    throw ApiError.notFound('Found item not found.');
  }

  if (foundItem.status === 'claimed') {
    throw ApiError.badRequest('This item has already been successfully claimed.');
  }

  // Prevent user claiming their own found item
  const reporterIdStr = foundItem.userId ? foundItem.userId._id.toString() : null;
  if (reporterIdStr === claimantId.toString()) {
    throw ApiError.badRequest('You cannot submit a claim for an item you reported yourself.');
  }

  // Check if user has already submitted a pending/approved claim for this item
  const existingClaim = await ClaimRequest.findOne({
    claimantId,
    foundItemId,
    status: { $in: ['pending', 'approved'] }
  });
  if (existingClaim) {
    throw ApiError.conflict('You have already submitted an active claim for this item.');
  }

  // Upload proof images if provided
  let proofImages = [];
  if (req.files && req.files.length > 0) {
    proofImages = await uploadMultipleImages(req.files, 'claim-proofs');
  }

  // Create claim request
  const claim = await ClaimRequest.create({
    claimantId,
    foundItemId,
    matchId: matchId || null,
    proofDescription,
    proofImages,
    status: 'pending'
  });

  // Notify item reporter (if reported by a user)
  if (foundItem.userId) {
    await createNotification({
      userId: foundItem.userId._id,
      title: '📦 New Claim Submitted',
      message: `Someone has submitted a claim for the "${foundItem.itemName}" you reported.`,
      type: 'claim_submitted',
      relatedItem: { itemType: 'ClaimRequest', itemId: claim._id }
    });

    // Send email to Founder
    await sendEmail({
      to: foundItem.userId.email,
      template: 'claimReceived',
      data: {
        name: foundItem.userId.fullName,
        itemName: foundItem.itemName,
        claimantName: req.user.fullName
      }
    });
  }

  // Send admin notification
  await createNotification({
    userId: null, // Broadcast to admin room
    title: '🛡️ New Claim Verification Required',
    message: `A new claim has been submitted for item "${foundItem.itemName}". Verification needed.`,
    type: 'claim_submitted',
    relatedItem: { itemType: 'ClaimRequest', itemId: claim._id }
  });

  ApiResponse.created(claim, 'Claim request submitted successfully.').send(res);
});

/**
 * Get claim requests (with filters & pagination).
 * Users can see:
 * - Claims they submitted
 * - Claims submitted for found items they reported
 * Admins can see:
 * - All claims
 */
const getClaimRequests = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const isAdmin = req.user.role === 'admin';
  const filter = {};

  if (!isAdmin) {
    // Standard users: claims they made, OR claims on found items they reported
    // First find IDs of found items reported by this user
    const userReportedFoundItems = await FoundItem.find({ userId, isDeleted: { $ne: true } }).select('_id');
    const itemIds = userReportedFoundItems.map((item) => item._id);

    filter.$or = [
      { claimantId: userId },
      { foundItemId: { $in: itemIds } }
    ];
  } else {
    // Admin filters
    if (req.query.claimantId) {
      filter.claimantId = req.query.claimantId;
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }
  }

  const totalDocs = await ClaimRequest.countDocuments(filter);
  const pagination = paginate(req.query, totalDocs);

  const claims = await ClaimRequest.find(filter)
    .populate('claimantId', 'fullName email phone studentId profileImage')
    .populate({
      path: 'foundItemId',
      populate: { path: 'userId', select: 'fullName email' }
    })
    .sort({ createdAt: -1 })
    .skip(pagination.skip)
    .limit(pagination.limit);

  ApiResponse.ok({ claims, pagination }, 'Claim requests retrieved successfully.').send(res);
});

/**
 * Get claim request details by ID.
 */
const getClaimRequestById = asyncHandler(async (req, res) => {
  const claim = await ClaimRequest.findById(req.params.id)
    .populate('claimantId', 'fullName email phone studentId profileImage')
    .populate({
      path: 'foundItemId',
      populate: { path: 'userId', select: 'fullName email phone' }
    })
    .populate('reviewedBy', 'fullName');

  if (!claim) {
    throw ApiError.notFound('Claim request not found.');
  }

  // Access control
  const isClaimant = claim.claimantId._id.toString() === req.user._id.toString();
  const isReporter = claim.foundItemId.userId && claim.foundItemId.userId._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isClaimant && !isReporter && !isAdmin) {
    throw ApiError.forbidden('You are not authorised to view this claim request.');
  }

  ApiResponse.ok(claim, 'Claim request details retrieved successfully.').send(res);
});

/**
 * Review a claim request (Approve / Reject).
 * Admin and Founder.
 */
const reviewClaimRequest = asyncHandler(async (req, res) => {
  const { status, adminRemark } = req.body; // 'approved' or 'rejected'
  const adminId = req.user._id;

  const claim = await ClaimRequest.findById(req.params.id)
    .populate('claimantId')
    .populate({
      path: 'foundItemId',
      populate: { path: 'userId' }
    });

  if (!claim) {
    throw ApiError.notFound('Claim request not found.');
  }

  // Authorize: Only Admin or Founder can review
  const isAdmin = req.user.role === 'admin';
  const isFounder = claim.foundItemId.userId && claim.foundItemId.userId._id.toString() === adminId.toString();

  if (!isAdmin && !isFounder) {
    throw ApiError.forbidden('You do not have permission to review this claim.');
  }

  if (claim.status !== 'pending') {
    throw ApiError.badRequest(`This claim request has already been ${claim.status}.`);
  }

  // Update claim details
  claim.status = status;
  claim.adminRemark = adminRemark || '';
  claim.reviewedBy = adminId;
  claim.reviewedAt = new Date();
  await claim.save();

  const foundItem = claim.foundItemId;

  if (status === 'approved') {
    // 1. Update found item status
    foundItem.status = 'claimed';
    foundItem.resolvedAt = new Date();
    await foundItem.save();

    // 2. If claim had a match, update match status & lost item status
    if (claim.matchId) {
      const match = await Match.findById(claim.matchId);
      if (match) {
        match.status = 'confirmed';
        await match.save();

        // Update lost item status
        await LostItem.findByIdAndUpdate(match.lostItemId, { 
          status: 'claimed', 
          resolvedAt: new Date() 
        });
      }
    } else {
      // Try to find a matching lost item for this user & category to mark claimed
      const matchingLost = await LostItem.findOne({
        userId: claim.claimantId._id,
        category: foundItem.category,
        status: { $ne: 'claimed' }
      });
      if (matchingLost) {
        matchingLost.status = 'claimed';
        matchingLost.resolvedAt = new Date();
        await matchingLost.save();
      }
    }

    // 3. Send approval emails (Peer-to-Peer Contact Exchange)
    const founder = foundItem.userId;
    const claimant = claim.claimantId;

    const collectionDetails = adminRemark || `The owner has been notified to contact you.`;
    
    // Email to Claimant
    await sendEmail({
      to: claimant.email,
      template: 'claimApproved',
      data: {
        name: claimant.fullName,
        itemName: foundItem.itemName,
        collectionDetails: `${collectionDetails}\n\nFounder Contact Details:\nName: ${founder?.fullName || 'N/A'}\nEmail: ${founder?.email || 'N/A'}\nPhone: ${founder?.phone || 'N/A'}`
      }
    });

    // Email to Founder
    if (founder?.email) {
      await sendEmail({
        to: founder.email,
        template: 'claimApprovedFounder',
        data: {
          name: founder.fullName,
          itemName: foundItem.itemName,
          claimantDetails: `Name: ${claimant.fullName}\nEmail: ${claimant.email}\nPhone: ${claimant.phone || 'N/A'}\nRemark: ${adminRemark || 'N/A'}`
        }
      });
    }

    // 4. Create in-app notification
    await createNotification({
      userId: claimant._id,
      title: '✅ Claim Request Approved!',
      message: `Your claim for "${foundItem.itemName}" has been approved. Check your email for contact details.`,
      type: 'claim_approved',
      relatedItem: { itemType: 'ClaimRequest', itemId: claim._id }
    });

    // 5. Automatically reject other pending claims for this same found item
    const otherClaims = await ClaimRequest.find({
      foundItemId: foundItem._id,
      status: 'pending',
      _id: { $ne: claim._id }
    }).populate('claimantId');

    for (const otherClaim of otherClaims) {
      otherClaim.status = 'rejected';
      otherClaim.adminRemark = 'Item successfully claimed by another owner.';
      otherClaim.reviewedBy = adminId;
      otherClaim.reviewedAt = new Date();
      await otherClaim.save();

      // Notify other claimants
      await sendEmail({
        to: otherClaim.claimantId.email,
        template: 'claimRejected',
        data: {
          name: otherClaim.claimantId.fullName,
          itemName: foundItem.itemName,
          reason: otherClaim.adminRemark
        }
      });

      await createNotification({
        userId: otherClaim.claimantId._id,
        title: '❌ Claim Request Rejected',
        message: `Your claim for "${foundItem.itemName}" has been rejected: Item claimed by another owner.`,
        type: 'claim_rejected',
        relatedItem: { itemType: 'ClaimRequest', itemId: otherClaim._id }
      });
    }

  } else if (status === 'rejected') {
    // If claim is rejected:
    // Update found item back to available if it was marked matched
    const activeClaimsCount = await ClaimRequest.countDocuments({
      foundItemId: foundItem._id,
      status: 'pending'
    });

    // If no other pending claims, set found item back to available
    if (activeClaimsCount === 0 && foundItem.status === 'matched') {
      foundItem.status = 'available';
      await foundItem.save();
    }

    // Send rejection email
    await sendEmail({
      to: claim.claimantId.email,
      template: 'claimRejected',
      data: {
        name: claim.claimantId.fullName,
        itemName: foundItem.itemName,
        reason: adminRemark || 'Insufficient proof of ownership provided.'
      }
    });

    // In-app notification
    await createNotification({
      userId: claim.claimantId._id,
      title: '❌ Claim Request Rejected',
      message: `Your claim for "${foundItem.itemName}" has been rejected. Reason: ${adminRemark || 'Insufficient proof.'}`,
      type: 'claim_rejected',
      relatedItem: { itemType: 'ClaimRequest', itemId: claim._id }
    });
  }

  ApiResponse.ok(claim, `Claim request reviewed and ${status} successfully.`).send(res);
});

export {
  createClaimRequest,
  getClaimRequests,
  getClaimRequestById,
  reviewClaimRequest
};
