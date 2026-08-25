import mongoose from 'mongoose';
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
import { uploadMultipleImages, deleteMultipleImages, privateAssetView } from '../services/cloudinaryService.js';
import { sendWorkflowEmail } from '../services/workflowEmailService.js';
import { createNotification, createBulkNotifications } from '../services/notificationService.js';
import { claimView } from '../utils/serializers.js';
import { clientOrigins } from '../config/security.js';
import { buildClaimQuestions, parseVerificationAnswers, assessClaimEvidence } from '../services/claimVerificationService.js';
import { assessClaimRisk } from '../services/claimRiskService.js';


const clientUrl = () => clientOrigins[0] || 'http://localhost:5173';
const runSideEffects = async (label, tasks) => {
  const results = await Promise.allSettled(tasks);
  for (const result of results) {
    if (result.status === 'rejected') console.warn(`[claim] ${label} side effect failed`, { error: result.reason?.message || String(result.reason) });
  }
  return results;
};

const targetInfo = (claimOrBody) => {
  if (claimOrBody.foundItemId) return { itemType: 'FoundItem', itemId: claimOrBody.foundItemId?._id || claimOrBody.foundItemId, Model: FoundItem };
  if (claimOrBody.lostItemId) return { itemType: 'LostItem', itemId: claimOrBody.lostItemId?._id || claimOrBody.lostItemId, Model: LostItem };
  throw ApiError.badRequest('Exactly one target item is required.');
};

const populateClaim = (query) => query
  .populate('claimantId', 'fullName email phone studentId profileImage notificationPreferences')
  .populate({ path: 'foundItemId', populate: { path: 'userId', select: 'fullName email phone studentId profileImage notificationPreferences' } })
  .populate({ path: 'lostItemId', populate: { path: 'userId', select: 'fullName email phone studentId profileImage notificationPreferences' } })
  .populate('reviewedBy', 'fullName role');

const isAuthorized = (claim, user) => {
  const userId = user._id.toString();
  const target = claim.foundItemId || claim.lostItemId;
  return user.role === 'admin' || claim.claimantId?._id?.toString() === userId || target?.userId?._id?.toString() === userId;
};

const sendAdminClaimNotifications = async (claim, item) => {
  const admins = await User.find({ role: 'admin', isActive: true, deletedAt: null }).select('_id').lean();
  await createBulkNotifications(admins.map((admin) => ({
    userId: admin._id,
    title: 'Claim review required',
    message: `A claim was submitted for “${item.itemName}”.`,
    type: 'claim_submitted', relatedItem: { itemType: 'ClaimRequest', itemId: claim._id },
  })));
};

const getClaimQuestions = asyncHandler(async (req, res) => {
  const itemType = req.params.itemType;
  const Model = itemType === 'FoundItem' ? FoundItem : itemType === 'LostItem' ? LostItem : null;
  if (!Model) throw ApiError.badRequest('Item type must be FoundItem or LostItem.');
  const item = await Model.findOne({ _id: req.params.itemId, isDeleted: { $ne: true }, isArchived: { $ne: true } })
    .select('itemName category status userId')
    .lean();
  if (!item) throw ApiError.notFound('Item not found.');
  if (item.userId?.toString() === req.user._id.toString()) throw ApiError.badRequest('You cannot claim your own report.');
  if (['claimed', 'closed', 'in_progress'].includes(item.status)) throw ApiError.conflict('This item is not accepting new claims.');
  const questions = buildClaimQuestions({ itemType, item });
  return ApiResponse.ok({ questions }, 'Claim verification questions generated.').send(res);
});

const createClaimRequest = asyncHandler(async (req, res) => {
  const { itemType, itemId, Model } = targetInfo(req.body);
  const item = await Model.findOne({ _id: itemId, isDeleted: { $ne: true }, isArchived: { $ne: true } }).populate('userId');
  if (!item) throw ApiError.notFound('Item not found.');
  if (['claimed', 'closed', 'in_progress'].includes(item.status)) throw ApiError.conflict('This item is not accepting new claims.');
  if (item.userId?._id.toString() === req.user._id.toString()) throw ApiError.badRequest('You cannot claim your own report.');

  let verificationAnswers;
  try {
    verificationAnswers = parseVerificationAnswers(req.body.verificationAnswers);
  } catch (error) {
    throw ApiError.badRequest(error.message);
  }

  const evidenceAssessment = assessClaimEvidence({
    proofDescription: req.body.proofDescription,
    files: req.files || [],
    verificationAnswers,
  });

  const [maxPendingSetting, rejectedReviewSetting, maxDailySetting] = await Promise.all([
    SystemSetting.findOne({ key: 'spam_max_pending_claims' }).lean(),
    SystemSetting.findOne({ key: 'spam_max_rejected_claims' }).lean(),
    SystemSetting.findOne({ key: 'spam_max_claims_per_day' }).lean(),
  ]);
  const maxPending = Math.min(50, Math.max(1, Number(maxPendingSetting?.value || 5)));
  const rejectedClaimReviewThreshold = Math.min(50, Math.max(1, Number(rejectedReviewSetting?.value || 3)));
  const maxDaily = Math.min(100, Math.max(1, Number(maxDailySetting?.value || 5)));
  if (req.user.role !== 'admin' && await ClaimRequest.countDocuments({ claimantId: req.user._id, status: 'pending' }) >= maxPending) {
    throw ApiError.tooManyRequests(`You can have at most ${maxPending} pending claims.`);
  }
  if (req.user.role !== 'admin' && await ClaimRequest.countDocuments({ claimantId: req.user._id, createdAt: { $gte: new Date(Date.now() - 86_400_000) } }) >= maxDaily) {
    throw ApiError.tooManyRequests('Daily claim limit reached. Try again later.');
  }

  let match = null;
  if (req.body.matchId) {
    match = await Match.findById(req.body.matchId);
    if (!match) throw ApiError.badRequest('Match not found.');
    const valid = itemType === 'FoundItem'
      ? match.foundItemId.toString() === item._id.toString() && match.lostUserId.toString() === req.user._id.toString()
      : match.lostItemId.toString() === item._id.toString() && match.foundUserId.toString() === req.user._id.toString();
    if (!valid) throw ApiError.forbidden('The supplied match is not related to this item and claimant.');
  }

  const proofImages = await uploadMultipleImages(req.files || [], 'claim-proofs', { authenticated: true });
  let claim;
  try {
    const claimData = {
      claimantId: req.user._id, matchId: match?._id || null,
      proofDescription: req.body.proofDescription,
      proofImages,
      verificationAnswers,
      evidenceAssessment,
      status: 'pending',
      ...(itemType === 'FoundItem' ? { foundItemId: item._id } : { lostItemId: item._id }),
    };
    claimData.riskAssessment = await assessClaimRisk({
      claimantId: req.user._id,
      proofImages,
      evidenceAssessment,
      rejectedClaimReviewThreshold,
    });
    claim = await ClaimRequest.create(claimData);
  } catch (error) {
    await deleteMultipleImages(proofImages).catch(() => undefined);
    if (error?.code === 11000) throw ApiError.conflict('You already have a pending claim for this item.');
    throw error;
  }

  await runSideEffects('submission', [
    createNotification({
      userId: item.userId._id, title: 'New claim submitted', message: `A claim was submitted for “${item.itemName}”.`,
      type: 'claim_submitted', relatedItem: { itemType: 'ClaimRequest', itemId: claim._id },
      dedupeKey: `claim-submitted:reporter:${claim._id}`,
    }),
    sendAdminClaimNotifications(claim, item),
    sendWorkflowEmail({
      user: item.userId,
      category: 'claims',
      template: 'claimReceived',
      idempotencyKey: `claim-submitted-email:${claim._id}:reporter`,
      data: { name: item.userId.fullName, itemName: item.itemName, url: `${clientUrl()}/dashboard/claims` },
    }),
  ]);
  return ApiResponse.created({ _id: claim._id, status: claim.status, evidenceAssessment: claim.evidenceAssessment, riskAssessment: { level: claim.riskAssessment.level, requiresHumanReview: claim.riskAssessment.requiresHumanReview, policy: claim.riskAssessment.policy } }, 'Claim request submitted successfully.').send(res);
});

const getClaimRequests = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role !== 'admin') {
    const [found, lost] = await Promise.all([
      FoundItem.find({ userId: req.user._id }).select('_id').lean(),
      LostItem.find({ userId: req.user._id }).select('_id').lean(),
    ]);
    filter.$or = [
      { claimantId: req.user._id },
      { foundItemId: { $in: found.map((x) => x._id) } },
      { lostItemId: { $in: lost.map((x) => x._id) } },
    ];
  } else {
    if (req.query.status) filter.status = req.query.status;
    if (req.query.claimantId) filter.claimantId = req.query.claimantId;
  }
  const totalDocs = await ClaimRequest.countDocuments(filter);
  const pageInfo = paginate(req.query, totalDocs);
  const claims = await populateClaim(ClaimRequest.find(filter)).sort({ createdAt: -1 }).skip(pageInfo.skip).limit(pageInfo.limit);
  const safeClaims = await Promise.all(claims.map((claim) => claimView(claim, req.user, privateAssetView)));
  return ApiResponse.ok({ claims: safeClaims, pagination: pageInfo }, 'Claim requests retrieved successfully.').send(res);
});

const getClaimRequestById = asyncHandler(async (req, res) => {
  const claim = await populateClaim(ClaimRequest.findById(req.params.id));
  if (!claim) throw ApiError.notFound('Claim request not found.');
  if (!isAuthorized(claim, req.user)) throw ApiError.forbidden('You are not authorised to view this claim.');
  return ApiResponse.ok(await claimView(claim, req.user, privateAssetView), 'Claim request retrieved successfully.').send(res);
});

const reviewClaimRequest = asyncHandler(async (req, res) => {
  const dbSession = await mongoose.startSession();
  let postCommit;
  try {
    await dbSession.withTransaction(async () => {
      const claim = await ClaimRequest.findById(req.params.id).session(dbSession);
      if (!claim) throw ApiError.notFound('Claim request not found.');
      if (claim.status !== 'pending') throw ApiError.conflict(`This claim has already been ${claim.status}.`);
      const { itemType, itemId, Model } = targetInfo(claim);
      const item = await Model.findById(itemId).populate('userId').session(dbSession);
      if (!item) throw ApiError.notFound('Target item not found.');
      const isReporter = item.userId._id.toString() === req.user._id.toString();
      if (req.user.role !== 'admin' && !isReporter) throw ApiError.forbidden('Only the reporter or an administrator can review this claim.');
      const claimant = await User.findById(claim.claimantId).session(dbSession);
      if (!claimant) throw ApiError.notFound('Claimant not found.');

      if (req.body.status === 'approved' && ['claimed', 'closed', 'in_progress'].includes(item.status)) throw ApiError.conflict('Item is no longer available.');
      if (req.body.status === 'rejected' && !String(req.body.adminRemark || '').trim()) throw ApiError.badRequest('A rejection reason is required.');
      claim.status = req.body.status;
      claim.adminRemark = req.body.adminRemark || '';
      if (req.body.status === 'rejected') claim.isContactShared = false;
      claim.reviewedBy = req.user._id;
      claim.reviewedAt = new Date();
      await claim.save({ session: dbSession });

      const otherClaimants = [];
      if (req.body.status === 'approved') {
        item.status = 'in_progress'; item.connectedUserId = claimant._id; item.connectedAt = new Date(); item.reminderSent = false;
        await item.save({ session: dbSession });
        if (claim.matchId) {
          const match = await Match.findById(claim.matchId).session(dbSession);
          if (!match) throw ApiError.conflict('Related match no longer exists.');
          const valid = itemType === 'FoundItem'
            ? match.foundItemId.toString() === item._id.toString() && match.lostUserId.toString() === claimant._id.toString()
            : match.lostItemId.toString() === item._id.toString() && match.foundUserId.toString() === claimant._id.toString();
          if (!valid) throw ApiError.conflict('Related match does not belong to this claim and claimant.');
          const ReciprocalModel = itemType === 'FoundItem' ? LostItem : FoundItem;
          const reciprocalId = itemType === 'FoundItem' ? match.lostItemId : match.foundItemId;
          const reciprocal = await ReciprocalModel.findById(reciprocalId).session(dbSession);
          if (!reciprocal || reciprocal.userId.toString() !== claimant._id.toString()) throw ApiError.conflict('Reciprocal report is unavailable or changed ownership.');
          if (['claimed', 'closed', 'in_progress'].includes(reciprocal.status)) throw ApiError.conflict('Reciprocal report is no longer available.');
          reciprocal.status = 'in_progress'; reciprocal.connectedUserId = item.userId._id; reciprocal.connectedAt = new Date(); reciprocal.reminderSent = false;
          await reciprocal.save({ session: dbSession });
          match.status = 'confirmed'; await match.save({ session: dbSession });
        }
        const otherFilter = { _id: { $ne: claim._id }, status: 'pending', ...(itemType === 'FoundItem' ? { foundItemId: item._id } : { lostItemId: item._id }) };
        const others = await ClaimRequest.find(otherFilter).populate('claimantId', 'email fullName notificationPreferences').session(dbSession);
        for (const other of others) {
          other.status = 'rejected'; other.adminRemark = 'Another claim was approved.'; other.isContactShared = false; other.reviewedBy = req.user._id; other.reviewedAt = new Date();
          await other.save({ session: dbSession });
          otherClaimants.push({ id: other.claimantId._id, email: other.claimantId.email, fullName: other.claimantId.fullName, notificationPreferences: other.claimantId.notificationPreferences, claimId: other._id });
        }
      }
      postCommit = { claimId: claim._id, status: claim.status, itemType, itemName: item.itemName, reporter: item.userId, claimant, otherClaimants, remark: claim.adminRemark };
    });
  } finally { await dbSession.endSession(); }

  const sideEffects = [];
  if (postCommit.status === 'approved') {
    sideEffects.push(
      createNotification({ userId: postCommit.claimant._id, title: 'Claim approved', message: `Your claim for “${postCommit.itemName}” was approved.`, type: 'claim_approved', relatedItem: { itemType: 'ClaimRequest', itemId: postCommit.claimId }, dedupeKey: `claim-approved:claimant:${postCommit.claimId}` }),
      createNotification({ userId: postCommit.reporter._id, title: 'Handover in progress', message: `The claim for “${postCommit.itemName}” was approved.`, type: 'claim_approved', relatedItem: { itemType: 'ClaimRequest', itemId: postCommit.claimId }, dedupeKey: `claim-approved:reporter:${postCommit.claimId}` }),
      sendWorkflowEmail({ user: postCommit.claimant, category: 'handover', template: 'claimApproved', idempotencyKey: `claim-approved-email:claimant:${postCommit.claimId}`, data: { name: postCommit.claimant.fullName, itemName: postCommit.itemName, message: postCommit.remark, url: `${clientUrl()}/dashboard/claims` } }),
      sendWorkflowEmail({ user: postCommit.reporter, category: 'handover', template: 'claimApprovedReporter', idempotencyKey: `claim-approved-email:reporter:${postCommit.claimId}`, data: { name: postCommit.reporter.fullName, itemName: postCommit.itemName, url: `${clientUrl()}/dashboard/claims` } }),
    );
    for (const other of postCommit.otherClaimants) {
      sideEffects.push(
        createNotification({ userId: other.id, title: 'Claim rejected', message: `Another claim for “${postCommit.itemName}” was approved.`, type: 'claim_rejected', relatedItem: { itemType: 'ClaimRequest', itemId: other.claimId }, dedupeKey: `claim-rejected:competing:${other.claimId}` }),
        sendWorkflowEmail({ user: other, category: 'claims', template: 'claimRejected', idempotencyKey: `claim-rejected-email:competing:${other.claimId}`, data: { name: other.fullName, itemName: postCommit.itemName, reason: 'Another claim was approved.' } }),
      );
    }
  } else {
    sideEffects.push(
      createNotification({ userId: postCommit.claimant._id, title: 'Claim rejected', message: `Your claim for “${postCommit.itemName}” was rejected.`, type: 'claim_rejected', relatedItem: { itemType: 'ClaimRequest', itemId: postCommit.claimId }, dedupeKey: `claim-rejected:claimant:${postCommit.claimId}` }),
      sendWorkflowEmail({ user: postCommit.claimant, category: 'claims', template: 'claimRejected', idempotencyKey: `claim-rejected-email:claimant:${postCommit.claimId}`, data: { name: postCommit.claimant.fullName, itemName: postCommit.itemName, reason: postCommit.remark || 'Insufficient evidence.' } }),
    );
  }
  await runSideEffects('review', sideEffects);
  return ApiResponse.ok({ _id: postCommit.claimId, status: postCommit.status }, `Claim ${postCommit.status} successfully.`).send(res);
});

const shareClaimContact = asyncHandler(async (req, res) => {
  const claim = await populateClaim(ClaimRequest.findById(req.params.id));
  if (!claim) throw ApiError.notFound('Claim request not found.');
  if (claim.status !== 'approved') throw ApiError.conflict('Contact sharing is available only after the claim is approved.');
  const item = claim.foundItemId || claim.lostItemId;
  if (item.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') throw ApiError.forbidden('Only the reporter or an administrator can share contact access.');
  if (!claim.isContactShared) { claim.isContactShared = true; await claim.save(); }
  await runSideEffects('contact-share', [
    createNotification({ userId: claim.claimantId._id, title: 'Contact shared', message: `Contact access was granted for “${item.itemName}”.`, type: 'contact_shared', relatedItem: { itemType: 'ClaimRequest', itemId: claim._id }, dedupeKey: `contact-shared:${claim._id}` }),
    sendWorkflowEmail({ user: claim.claimantId, category: 'handover', template: 'contactShared', idempotencyKey: `contact-shared-email:${claim._id}`, data: { name: claim.claimantId.fullName, itemName: item.itemName, url: `${clientUrl()}/dashboard/claims` } }),
  ]);
  return ApiResponse.ok(await claimView(claim, req.user, privateAssetView), 'Contact access granted.').send(res);
});

const checkClaimExists = asyncHandler(async (req, res) => {
  const claim = await ClaimRequest.findOne({ claimantId: req.user._id, status: { $in: ['pending', 'approved'] }, $or: [{ foundItemId: req.params.itemId }, { lostItemId: req.params.itemId }] }).select('_id status isContactShared');
  return ApiResponse.ok({ hasClaim: Boolean(claim), claim }, 'Claim check completed.').send(res);
});

export { createClaimRequest, getClaimQuestions, getClaimRequests, getClaimRequestById, reviewClaimRequest, shareClaimContact, checkClaimExists };
