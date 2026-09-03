import crypto from 'node:crypto';
import mongoose from 'mongoose';
import AIDecisionFeedback from '../models/AIDecisionFeedback.js';
import AIEvaluationDatasetSnapshot from '../models/AIEvaluationDatasetSnapshot.js';
import AIExperiment from '../models/AIExperiment.js';
import Match from '../models/Match.js';

const percentage = (numerator, denominator) => denominator ? Math.round((numerator / denominator) * 10_000) / 100 : 0;

const calculateCalibrationMetrics = (entries = [], threshold = 70) => {
  const usable = entries.filter((entry) => ['confirmed', 'not-same'].includes(entry.label) && Number.isFinite(Number(entry.score)));
  let truePositive = 0; let falsePositive = 0; let trueNegative = 0; let falseNegative = 0;
  for (const entry of usable) {
    const predicted = Number(entry.score) >= threshold;
    const actual = entry.label === 'confirmed';
    if (predicted && actual) truePositive += 1;
    else if (predicted) falsePositive += 1;
    else if (actual) falseNegative += 1;
    else trueNegative += 1;
  }
  return {
    threshold,
    sampleSize: usable.length,
    truePositive,
    falsePositive,
    trueNegative,
    falseNegative,
    accuracy: percentage(truePositive + trueNegative, usable.length),
    precision: percentage(truePositive, truePositive + falsePositive),
    recall: percentage(truePositive, truePositive + falseNegative),
    falsePositiveRate: percentage(falsePositive, falsePositive + trueNegative),
    policy: 'offline-approved-feedback-only',
  };
};

const loadApprovedMatchEntries = async () => {
  const feedback = await AIDecisionFeedback.find({
    targetType: 'Match',
    status: 'approved',
    decision: { $in: ['confirmed', 'not-same'] },
  }).sort({ reviewedAt: 1, _id: 1 }).lean();
  const matches = await Match.find({ _id: { $in: feedback.map((entry) => entry.targetId) } })
    .select('_id similarityScore algorithmVersion')
    .lean();
  const matchMap = new Map(matches.map((entry) => [String(entry._id), entry]));
  return feedback.flatMap((entry) => {
    const match = matchMap.get(String(entry.targetId));
    return match ? [{
      feedbackId: entry._id,
      targetId: entry.targetId,
      targetType: 'Match',
      label: entry.decision,
      score: Math.max(0, Math.min(100, Number(match.similarityScore) || 0)),
      algorithmVersion: match.algorithmVersion || entry.algorithmVersion || '',
    }] : [];
  });
};

const createApprovedDatasetSnapshot = async ({ createdBy, threshold = 70, now = new Date() }) => {
  const entries = await loadApprovedMatchEntries();
  const checksum = crypto.createHash('sha256').update(JSON.stringify(entries.map((entry) => ({
    feedbackId: String(entry.feedbackId), targetId: String(entry.targetId), label: entry.label,
    score: entry.score, algorithmVersion: entry.algorithmVersion,
  })))).digest('hex');
  const existing = await AIEvaluationDatasetSnapshot.findOne({ checksum });
  if (existing) return existing;
  const version = `approved-match-${now.toISOString().replace(/[:.]/gu, '-')}`;
  return AIEvaluationDatasetSnapshot.create({
    name: 'Approved match decision dataset',
    version,
    checksum,
    entries,
    metrics: calculateCalibrationMetrics(entries, threshold),
    createdBy,
    sealedAt: now,
  });
};

const createChallengerExperiment = async ({ snapshotId, algorithmVersion, threshold = 70, createdBy }) => {
  const snapshot = await AIEvaluationDatasetSnapshot.findById(snapshotId).lean();
  if (!snapshot) throw Object.assign(new Error('DATASET_SNAPSHOT_NOT_FOUND'), { statusCode: 404 });
  const metrics = calculateCalibrationMetrics(snapshot.entries, threshold);
  return AIExperiment.create({
    name: `Match calibration ${String(algorithmVersion).slice(0, 50)}`,
    algorithmVersion: String(algorithmVersion).slice(0, 50),
    datasetSnapshotId: snapshot._id,
    threshold,
    metrics,
    status: 'challenger',
    createdBy,
  });
};

const promoteExperiment = async ({ experimentId, promotedBy }) => {
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const experiment = await AIExperiment.findById(experimentId).session(session);
      if (!experiment) throw Object.assign(new Error('EXPERIMENT_NOT_FOUND'), { statusCode: 404 });
      if (experiment.metrics.sampleSize < 20) throw Object.assign(new Error('INSUFFICIENT_APPROVED_SAMPLE'), { statusCode: 409 });
      if (experiment.metrics.falsePositiveRate > 15) throw Object.assign(new Error('FALSE_POSITIVE_GUARDRAIL_FAILED'), { statusCode: 409 });
      await AIExperiment.updateMany({ status: 'champion', _id: { $ne: experiment._id } }, { status: 'retired' }, { session });
      experiment.status = 'champion';
      experiment.promotedBy = promotedBy;
      experiment.promotedAt = new Date();
      await experiment.save({ session });
      result = experiment;
    });
  } finally { await session.endSession(); }
  return result;
};

const getCalibrationOverview = async () => {
  const [approvedCount, pendingCount, latestSnapshot, champion, challengers] = await Promise.all([
    AIDecisionFeedback.countDocuments({ targetType: 'Match', status: 'approved', decision: { $in: ['confirmed', 'not-same'] } }),
    AIDecisionFeedback.countDocuments({ targetType: 'Match', status: 'pending' }),
    AIEvaluationDatasetSnapshot.findOne().sort({ sealedAt: -1 }).select('-entries').lean(),
    AIExperiment.findOne({ status: 'champion' }).sort({ promotedAt: -1 }).lean(),
    AIExperiment.find({ status: 'challenger' }).sort({ createdAt: -1 }).limit(10).lean(),
  ]);
  return { approvedCount, pendingCount, latestSnapshot, champion, challengers, policy: 'No online learning. Only sealed admin-approved datasets can be evaluated, and promotion is a human action.' };
};

export {
  calculateCalibrationMetrics,
  createApprovedDatasetSnapshot,
  createChallengerExperiment,
  getCalibrationOverview,
  loadApprovedMatchEntries,
  promoteExperiment,
};
