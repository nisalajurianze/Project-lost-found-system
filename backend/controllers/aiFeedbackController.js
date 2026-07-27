import AIDecisionFeedback from '../models/AIDecisionFeedback.js';
import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { paginate } from '../utils/pagination.js';

const TARGET_TYPES = ['Match', 'ImageAnalysis', 'LocationKnowledge', 'ReportSuggestion'];
const DECISIONS = ['confirmed', 'not-same', 'useful', 'wrong-category', 'wrong-colour', 'wrong-location', 'wrong-description', 'other'];

const submitAIFeedback = asyncHandler(async (req, res) => {
  const targetType = String(req.body?.targetType || '');
  const targetId = String(req.body?.targetId || '');
  const decision = String(req.body?.decision || '');
  if (!TARGET_TYPES.includes(targetType)) throw ApiError.badRequest('Unsupported AI feedback target.');
  if (!DECISIONS.includes(decision)) throw ApiError.badRequest('Unsupported AI feedback decision.');
  if (!targetId.match(/^[a-f\d]{24}$/i)) throw ApiError.badRequest('A valid target ID is required.');
  const feedback = await AIDecisionFeedback.create({
    targetType,
    targetId,
    submittedBy: req.user._id,
    decision,
    dimension: String(req.body?.dimension || '').slice(0, 80),
    note: String(req.body?.note || '').slice(0, 1000),
    source: 'user-action',
    status: 'pending',
    algorithmVersion: String(req.body?.algorithmVersion || '').slice(0, 50),
  });
  return ApiResponse.created({
    _id: feedback._id,
    decision: feedback.decision,
    status: feedback.status,
    policy: feedback.policy,
  }, 'AI feedback recorded for human review.').send(res);
});

const listAIFeedback = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.targetType) filter.targetType = req.query.targetType;
  if (req.query.decision) filter.decision = req.query.decision;
  const totalDocs = await AIDecisionFeedback.countDocuments(filter);
  const pagination = paginate(req.query, totalDocs);
  const feedback = await AIDecisionFeedback.find(filter)
    .populate('submittedBy', 'fullName email')
    .populate('reviewedBy', 'fullName')
    .sort({ createdAt: -1 })
    .skip(pagination.skip)
    .limit(pagination.limit)
    .lean();
  return ApiResponse.ok({ feedback, pagination, policy: 'Admin approval is required before feedback enters any evaluation or training dataset.' }, 'AI feedback retrieved.').send(res);
});

const reviewAIFeedback = asyncHandler(async (req, res) => {
  const status = String(req.body?.status || '');
  if (!['approved', 'rejected'].includes(status)) throw ApiError.badRequest('Status must be approved or rejected.');
  const feedback = await AIDecisionFeedback.findById(req.params.id);
  if (!feedback) throw ApiError.notFound('AI feedback record not found.');
  feedback.status = status;
  feedback.reviewedBy = req.user._id;
  feedback.reviewedAt = new Date();
  feedback.reviewNote = String(req.body?.reviewNote || '').slice(0, 1000);
  await feedback.save();
  return ApiResponse.ok(feedback, `AI feedback ${status}.`).send(res);
});

export { submitAIFeedback, listAIFeedback, reviewAIFeedback };
