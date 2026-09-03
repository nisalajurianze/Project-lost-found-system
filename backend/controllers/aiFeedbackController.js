import AIDecisionFeedback from '../models/AIDecisionFeedback.js';
import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { paginate } from '../utils/pagination.js';
import {
  createApprovedDatasetSnapshot,
  createChallengerExperiment,
  getCalibrationOverview,
  promoteExperiment,
} from '../services/aiCalibrationService.js';

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

const getAICalibrationOverview = asyncHandler(async (_req, res) => {
  const overview = await getCalibrationOverview();
  return ApiResponse.ok(overview, 'AI calibration governance overview retrieved.').send(res);
});

const sealAIDatasetSnapshot = asyncHandler(async (req, res) => {
  const threshold = Math.min(99, Math.max(1, Number(req.body?.threshold) || 70));
  const snapshot = await createApprovedDatasetSnapshot({ createdBy: req.user._id, threshold });
  return ApiResponse.created({
    _id: snapshot._id, name: snapshot.name, version: snapshot.version, checksum: snapshot.checksum,
    metrics: snapshot.metrics, sealedAt: snapshot.sealedAt, sourcePolicy: snapshot.sourcePolicy,
  }, 'Immutable approved-feedback dataset snapshot sealed.').send(res);
});

const createAIChallenger = asyncHandler(async (req, res) => {
  const snapshotId = String(req.body?.snapshotId || '');
  const algorithmVersion = String(req.body?.algorithmVersion || '').trim();
  if (!snapshotId.match(/^[a-f\d]{24}$/iu)) throw ApiError.badRequest('A valid dataset snapshot ID is required.');
  if (!algorithmVersion) throw ApiError.badRequest('Algorithm version is required.');
  const experiment = await createChallengerExperiment({
    snapshotId,
    algorithmVersion,
    threshold: Math.min(99, Math.max(1, Number(req.body?.threshold) || 70)),
    createdBy: req.user._id,
  });
  return ApiResponse.created(experiment, 'Offline challenger experiment created.').send(res);
});

const promoteAIChallenger = asyncHandler(async (req, res) => {
  if (!String(req.params.id).match(/^[a-f\d]{24}$/iu)) throw ApiError.badRequest('A valid experiment ID is required.');
  try {
    const experiment = await promoteExperiment({ experimentId: req.params.id, promotedBy: req.user._id });
    return ApiResponse.ok(experiment, 'Challenger promoted to champion by an administrator.').send(res);
  } catch (error) {
    if (error.message === 'INSUFFICIENT_APPROVED_SAMPLE') throw ApiError.conflict('At least 20 approved outcomes are required for promotion.');
    if (error.message === 'FALSE_POSITIVE_GUARDRAIL_FAILED') throw ApiError.conflict('False-positive guardrail failed; promotion is blocked.');
    if (error.message === 'EXPERIMENT_NOT_FOUND') throw ApiError.notFound('Experiment not found.');
    throw error;
  }
});

export {
  createAIChallenger,
  getAICalibrationOverview,
  listAIFeedback,
  promoteAIChallenger,
  reviewAIFeedback,
  sealAIDatasetSnapshot,
  submitAIFeedback,
};
