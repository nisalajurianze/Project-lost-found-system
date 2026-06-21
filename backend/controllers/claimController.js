// ============================================
// Claim Request Controller
// Handles item ownership claims and admin approvals
// ============================================

import ClaimRequest from '../models/ClaimRequest.js';
import FoundItem from '../models/FoundItem.js';
import LostItem from '../models/LostItem.js';
import Match from '../models/Match.js';
import SystemSetting from '../models/SystemSetting.js';
import User from '../models/User.js';
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
  const { foundItemId, lostItemId, proofDescription, matchId } = req.body;
  const claimantId = req.user._id;

  let targetItem = null;
  let itemType = '';
  let reporter = null;

  if (foundItemId) {
    targetItem = await FoundItem.findOne({ _id: foundItemId, isDeleted: { $ne: true } }).populate('userId');
    itemType = 'FoundItem';
  } else if (lostItemId) {
    targetItem = await LostItem.findOne({ _id: lostItemId, isDeleted: { $ne: true } }).populate('userId');
    itemType = 'LostItem';
  } else {
    throw ApiError.badRequest('Either foundItemId or lostItemId is required.');
  }

  if (!targetItem) {
    throw ApiError.notFound(`${itemType === 'FoundItem' ? 'Found' : 'Lost'} item not found.`);
  }

  if (targetItem.status === 'claimed') {
    throw ApiError.badRequest('This item has already been successfully resolved.');
  }

  // Prevent user claiming their own reported item
  reporter = targetItem.userId;
  const reporterIdStr = reporter ? reporter._id.toString() : null;
  if (reporterIdStr === claimantId.toString()) {
    throw ApiError.badRequest('You cannot submit a claim for an item you reported yourself.');
  }

  // --- ANTI-SPAM: Check pending claims limit ---
  const spamSettingPending = await SystemSetting.findOne({ key: 'spam_max_pending_claims' });
  const maxPendingAllowed = spamSettingPending && spamSettingPending.value !== undefined ? parseInt(spamSettingPending.value, 10) : 5;
  
  const pendingClaimsCount = await ClaimRequest.countDocuments({ claimantId, status: 'pending' });
  if (pendingClaimsCount >= maxPendingAllowed) {
    throw ApiError.badRequest(`You have reached the maximum allowed active claims (${maxPendingAllowed}). Please wait for them to be reviewed.`);
  }

  // Check if user has already submitted a pending/approved claim for this item
  const query = { claimantId, status: { $in: ['pending', 'approved'] } };
  if (foundItemId) query.foundItemId = foundItemId;
  if (lostItemId) query.lostItemId = lostItemId;

  const existingClaim = await ClaimRequest.findOne(query);
  if (existingClaim) {
    throw ApiError.conflict('You have already submitted an active claim for this item.');
  }

  // Upload proof images if provided
  let proofImages = [];
  if (req.files && req.files.length > 0) {
    proofImages = await uploadMultipleImages(req.files, 'claim-proofs');
  }

  // Create claim request
  const claimData = {
    claimantId,
    matchId: matchId || null,
    proofDescription,
    proofImages,
    status: 'pending'
  };
  if (foundItemId) claimData.foundItemId = foundItemId;
  if (lostItemId) claimData.lostItemId = lostItemId;

  const claim = await ClaimRequest.create(claimData);

  // Notify item reporter (if reported by a user)
  if (reporter) {
    await createNotification({
      userId: reporter._id,
      title: '📦 New Claim Submitted',
      message: `Someone has submitted a claim for the "${targetItem.itemName}" you reported.`,
      type: 'claim_submitted',
      relatedItem: { itemType: 'ClaimRequest', itemId: claim._id }
    });

    // Send email to reporter
    await sendEmail({
      to: reporter.email,
      template: 'claimReceived',
      data: {
        name: reporter.fullName || reporter.name,
        itemName: targetItem.itemName,
        claimantName: req.user.fullName || req.user.name
      }
    });
  }

  // Send admin notification
  await createNotification({
    userId: null, // Broadcast to admin room
    title: '🛡️ New Claim Verification Required',
    message: `A new claim has been submitted for item "${targetItem.itemName}". Verification needed.`,
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
    // Standard users: claims they made, OR claims on found/lost items they reported
    const userReportedFoundItems = await FoundItem.find({ userId, isDeleted: { $ne: true } }).select('_id');
    const foundItemIds = userReportedFoundItems.map((item) => item._id);

    const userReportedLostItems = await LostItem.find({ userId, isDeleted: { $ne: true } }).select('_id');
    const lostItemIds = userReportedLostItems.map((item) => item._id);

    filter.$or = [
      { claimantId: userId },
      { foundItemId: { $in: foundItemIds } },
      { lostItemId: { $in: lostItemIds } }
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
      populate: { path: 'userId', select: 'fullName email phone' }
    })
    .populate({
      path: 'lostItemId',
      populate: { path: 'userId', select: 'fullName email phone' }
    })
    .sort({ createdAt: -1 })
    .skip(pagination.skip)
    .limit(pagination.limit)
    .lean();

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
    .populate({
      path: 'lostItemId',
      populate: { path: 'userId', select: 'fullName email phone' }
    })
    .populate('reviewedBy', 'fullName');

  if (!claim) {
    throw ApiError.notFound('Claim request not found.');
  }

  // Access control
  const isClaimant = claim.claimantId._id.toString() === req.user._id.toString();
  
  let isReporter = false;
  if (claim.foundItemId && claim.foundItemId.userId) {
    isReporter = claim.foundItemId.userId._id.toString() === req.user._id.toString();
  } else if (claim.lostItemId && claim.lostItemId.userId) {
    isReporter = claim.lostItemId.userId._id.toString() === req.user._id.toString();
  }
  
  const isAdmin = req.user.role === 'admin';

  if (!isClaimant && !isReporter && !isAdmin) {
    throw ApiError.forbidden('You are not authorised to view this claim request.');
  }

  ApiResponse.ok(claim, 'Claim request details retrieved successfully.').send(res);
});

/**
 * Review a claim request (Approve / Reject).
 * Admin and Reporter.
 */
const reviewClaimRequest = asyncHandler(async (req, res) => {
  const { status, adminRemark } = req.body; // 'approved' or 'rejected'
  const adminId = req.user._id;

  const claim = await ClaimRequest.findById(req.params.id)
    .populate('claimantId')
    .populate({
      path: 'foundItemId',
      populate: { path: 'userId' }
    })
    .populate({
      path: 'lostItemId',
      populate: { path: 'userId' }
    });

  if (!claim) {
    throw ApiError.notFound('Claim request not found.');
  }

  // Authorize: Only Admin or Reporter can review
  const isAdmin = req.user.role === 'admin';
  let isReporter = false;
  let targetItem = null;
  let itemType = '';
  
  if (claim.foundItemId) {
    targetItem = claim.foundItemId;
    itemType = 'FoundItem';
    isReporter = targetItem.userId && targetItem.userId._id.toString() === adminId.toString();
  } else if (claim.lostItemId) {
    targetItem = claim.lostItemId;
    itemType = 'LostItem';
    isReporter = targetItem.userId && targetItem.userId._id.toString() === adminId.toString();
  }

  if (!isAdmin && !isReporter) {
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

  const claimant = claim.claimantId;

  // --- ANTI-FRAUD: Check rejected claims limit if this was rejected ---
  if (status === 'rejected') {
    const spamSettingRejected = await SystemSetting.findOne({ key: 'spam_max_rejected_claims' });
    const maxRejectedAllowed = spamSettingRejected && spamSettingRejected.value !== undefined ? parseInt(spamSettingRejected.value, 10) : 3;

    const rejectedCount = await ClaimRequest.countDocuments({ claimantId: claimant._id, status: 'rejected' });
    if (rejectedCount >= maxRejectedAllowed) {
      // Suspend user
      await User.findByIdAndUpdate(claimant._id, { isActive: false });
      
      // Notify them
      await sendEmail({
        to: claimant.email,
        template: 'accountSuspended',
        data: {
          name: claimant.fullName || claimant.name,
          reason: 'suspicious claim behavior (too many rejected claims)'
        }
      });
    }
  }

  const poster = targetItem.userId;

  if (status === 'approved') {
    // 1. Update target item status
    targetItem.status = 'in_progress'; // Changed from 'claimed' to 'in_progress' to allow "Mark as Done" handover phase
    targetItem.connectedUserId = claimant._id;
    targetItem.connectedAt = new Date();
    await targetItem.save();

    // 2. If claim had a match, update match status & reciprocal item status
    if (claim.matchId) {
      const match = await Match.findById(claim.matchId);
      if (match) {
        match.status = 'confirmed';
        await match.save();

        if (itemType === 'FoundItem') {
           await LostItem.findByIdAndUpdate(match.lostItemId, { status: 'in_progress', connectedUserId: targetItem.userId._id, connectedAt: new Date() });
        } else {
           await FoundItem.findByIdAndUpdate(match.foundItemId, { status: 'in_progress', connectedUserId: targetItem.userId._id, connectedAt: new Date() });
        }
      }
    } else {
      // Auto-update any matching lost/found items they might have posted for this
      if (itemType === 'FoundItem') {
        const matchingLost = await LostItem.findOne({ userId: claimant._id, category: targetItem.category, status: { $ne: 'claimed' } });
        if (matchingLost) {
          matchingLost.status = 'in_progress';
          matchingLost.connectedUserId = targetItem.userId._id;
          matchingLost.connectedAt = new Date();
          await matchingLost.save();
        }
      } else {
        const matchingFound = await FoundItem.findOne({ userId: claimant._id, category: targetItem.category, status: { $ne: 'claimed' } });
        if (matchingFound) {
          matchingFound.status = 'in_progress';
          matchingFound.connectedUserId = targetItem.userId._id;
          matchingFound.connectedAt = new Date();
          await matchingFound.save();
        }
      }
    }

    // 3. Send approval emails (Peer-to-Peer Contact Exchange)
    const collectionDetails = adminRemark || `Please contact each other to arrange the handover.`;
    
    // Email to Claimant
    import('../services/emailService.js').then(async (emailService) => {
      await emailService.sendEmail({
        to: claimant.email,
        template: 'claimApproved',
        data: {
          name: claimant.fullName,
          itemName: targetItem.itemName,
          collectionDetails: `${collectionDetails}\n\nPoster Contact Details:\nName: ${poster?.fullName || 'N/A'}\nEmail: ${poster?.email || 'N/A'}\nPhone: ${poster?.phone || 'N/A'}`
        }
      }).catch(err => console.error('Failed to send email to claimant:', err));

      // Email to Poster
      if (poster?.email) {
        await emailService.sendEmail({
          to: poster.email,
          template: 'claimApprovedFounder',
          data: {
            name: poster.fullName,
            itemName: targetItem.itemName,
            claimantDetails: `Name: ${claimant.fullName}\nEmail: ${claimant.email}\nPhone: ${claimant.phone || 'N/A'}\nRemark: ${adminRemark || 'N/A'}`
          }
        }).catch(err => console.error('Failed to send email to poster:', err));
      }
    });

    // 4. Create in-app notification
    await createNotification({
      userId: claimant._id,
      title: '✅ Claim Request Approved!',
      message: `Your claim for "${targetItem.itemName}" has been approved. Handover is in progress. Check email for details.`,
      type: 'claim_approved',
      relatedItem: { itemType: 'ClaimRequest', itemId: claim._id }
    });

    // 5. Automatically reject other pending claims for this same item
    const query = { status: 'pending', _id: { $ne: claim._id } };
    if (claim.foundItemId) query.foundItemId = targetItem._id;
    if (claim.lostItemId) query.lostItemId = targetItem._id;

    const otherClaims = await ClaimRequest.find(query).populate('claimantId');

    for (const otherClaim of otherClaims) {
      otherClaim.status = 'rejected';
      otherClaim.adminRemark = 'Item successfully claimed by another user.';
      otherClaim.reviewedBy = adminId;
      otherClaim.reviewedAt = new Date();
      await otherClaim.save();

      import('../services/emailService.js').then(async (emailService) => {
        await emailService.sendEmail({
          to: otherClaim.claimantId.email,
          template: 'claimRejected',
          data: {
            name: otherClaim.claimantId.fullName,
            itemName: targetItem.itemName,
            reason: otherClaim.adminRemark
          }
        }).catch(err => console.error('Failed to send reject email:', err));
      });

      await createNotification({
        userId: otherClaim.claimantId._id,
        title: '❌ Claim Request Rejected',
        message: `Your claim for "${targetItem.itemName}" has been rejected: Item claimed by another user.`,
        type: 'claim_rejected',
        relatedItem: { itemType: 'ClaimRequest', itemId: otherClaim._id }
      });
    }

  } else if (status === 'rejected') {
    // If claim is rejected:
    // Update target item back to available if it was marked matched
    const query = { status: 'pending' };
    if (claim.foundItemId) query.foundItemId = targetItem._id;
    if (claim.lostItemId) query.lostItemId = targetItem._id;

    const activeClaimsCount = await ClaimRequest.countDocuments(query);

    // If no other pending claims, set item back to available
    if (activeClaimsCount === 0 && targetItem.status === 'matched') {
      targetItem.status = 'available';
      await targetItem.save();
    }

    // Send rejection email
    import('../services/emailService.js').then(async (emailService) => {
      await emailService.sendEmail({
        to: claim.claimantId.email,
        template: 'claimRejected',
        data: {
          name: claim.claimantId.fullName,
          itemName: targetItem.itemName,
          reason: adminRemark || 'Insufficient proof of ownership provided.'
        }
      }).catch(err => console.error('Failed to send reject email:', err));
    });

    // In-app notification
    await createNotification({
      userId: claim.claimantId._id,
      title: '❌ Claim Request Rejected',
      message: `Your claim for "${targetItem.itemName}" has been rejected. Reason: ${adminRemark || 'Insufficient proof.'}`,
      type: 'claim_rejected',
      relatedItem: { itemType: 'ClaimRequest', itemId: claim._id }
    });
  }

  ApiResponse.ok(claim, `Claim request reviewed and ${status} successfully.`).send(res);
});

/**
 * Share contact info for a pending claim without approving it.
 * Only the item owner can do this.
 */
const shareClaimContact = asyncHandler(async (req, res) => {
  const claim = await ClaimRequest.findById(req.params.id)
    .populate('foundItemId')
    .populate('lostItemId')
    .populate('claimantId', 'fullName email phone');

  if (!claim) {
    throw ApiError.notFound('Claim request not found.');
  }

  if (claim.status !== 'pending') {
    throw ApiError.badRequest('Contact can only be shared for pending claims.');
  }

  if (claim.isContactShared) {
    throw ApiError.badRequest('Contact has already been shared for this claim.');
  }

  const targetItem = claim.foundItemId || claim.lostItemId;
  if (!targetItem) {
    throw ApiError.internal('Claim has no associated item.');
  }

  // Ensure user is the item owner
  if (targetItem.userId.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('Only the item owner can share contact information.');
  }

  claim.isContactShared = true;
  await claim.save();

  // In-app notification to claimant
  const { createNotification } = await import('../services/notificationService.js');
  await createNotification({
    userId: claim.claimantId._id,
    title: '📱 Contact Shared',
    message: `The poster of "${targetItem.itemName}" has shared their contact details with you. Please call them to verify ownership.`,
    type: 'contact_shared',
    relatedItem: { itemType: 'ClaimRequest', itemId: claim._id }
  });

  // Optional: Send email
  import('../services/emailService.js').then(async (emailService) => {
    await emailService.sendEmail({
      to: claim.claimantId.email,
      template: 'claimUpdate',
      data: {
        name: claim.claimantId.fullName,
        itemName: targetItem.itemName,
        message: `The poster has requested to share contacts to verify your claim over the phone.\n\nPoster Contact Details:\nName: ${req.user.fullName || 'N/A'}\nEmail: ${req.user.email || 'N/A'}\nPhone: ${req.user.phone || 'N/A'}`
      }
    }).catch(err => console.error('Failed to send contact share email:', err));
  });

  ApiResponse.ok(claim, 'Contact shared successfully.').send(res);
});

export {
  createClaimRequest,
  getClaimRequests,
  getClaimRequestById,
  reviewClaimRequest,
  shareClaimContact
};
