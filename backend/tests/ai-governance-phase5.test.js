import test from 'node:test';
import assert from 'node:assert/strict';
import AIEvaluationDatasetSnapshot from '../models/AIEvaluationDatasetSnapshot.js';
import AIExperiment from '../models/AIExperiment.js';
import DuplicateReviewCluster from '../models/DuplicateReviewCluster.js';
import { calculateCalibrationMetrics } from '../services/aiCalibrationService.js';
import { scoreDuplicateCandidate } from '../services/duplicateDetectionService.js';
import {
  answerAdminAnalyticsQuestion,
  buildGroundedAdminNarrative,
  mergeHourBuckets,
} from '../services/operationalIntelligenceService.js';

test('calibration computes confusion metrics only from approved-style labelled outcomes', () => {
  const metrics = calculateCalibrationMetrics([
    { label: 'confirmed', score: 90 },
    { label: 'confirmed', score: 50 },
    { label: 'not-same', score: 80 },
    { label: 'not-same', score: 20 },
    { label: 'other', score: 100 },
  ], 70);
  assert.equal(metrics.sampleSize, 4);
  assert.equal(metrics.truePositive, 1);
  assert.equal(metrics.falsePositive, 1);
  assert.equal(metrics.trueNegative, 1);
  assert.equal(metrics.falseNegative, 1);
  assert.equal(metrics.accuracy, 50);
  assert.equal(metrics.falsePositiveRate, 50);
});

test('calibration artifacts are sealed and experiments require human promotion', () => {
  assert.equal(AIEvaluationDatasetSnapshot.schema.path('checksum').options.immutable, true);
  assert.equal(AIEvaluationDatasetSnapshot.schema.path('sourcePolicy').defaultValue, 'admin-approved-feedback-only');
  assert.deepEqual(AIExperiment.schema.path('status').enumValues, ['draft', 'challenger', 'champion', 'retired']);
  assert.equal(AIExperiment.schema.path('policy').defaultValue, 'offline-evaluation-human-promotion-no-online-learning');
});

test('cross-account duplicate score combines typo-tolerant semantics and visual evidence', () => {
  const result = scoreDuplicateCandidate({
    source: { itemName: 'blue bag', category: 'Bags', description: 'canvas bag round sticker', lostLocation: 'cateen', colors: ['blue'] },
    candidate: { itemName: 'blu bag', category: 'Bags', description: 'blue canvas backpack with round sticker', lostLocation: 'canteen', colors: ['blue'] },
    sourceAnalysis: { visualFingerprint: 'blue:canvas:round-sticker', labels: ['bag'], colors: ['blue'] },
    candidateAnalysis: { visualFingerprint: 'blue:canvas:round-sticker', labels: ['bag'], colors: ['blue'] },
  });
  assert.ok(result.score >= 65);
  assert.ok(result.semanticScore > 0);
  assert.ok(result.visualScore >= 70);
});

test('duplicate clusters are advisory and can never encode an automatic ban', () => {
  assert.equal(DuplicateReviewCluster.schema.path('policy').defaultValue, 'human-review-only-never-auto-ban');
  assert.deepEqual(DuplicateReviewCluster.schema.path('status').enumValues, ['pending', 'dismissed', 'confirmed-duplicate']);
  assert.equal(DuplicateReviewCluster.schema.path('autoBan'), undefined);
});

test('analytics explains locations, categories and Colombo time bands from evidence only', () => {
  const times = mergeHourBuckets([{ _id: 8, count: 5 }, { _id: 14, count: 2 }], [{ _id: 9, count: 3 }]);
  assert.deepEqual(times[0], { label: '06:00-11:59', count: 8 });
  const groundedNarrative = buildGroundedAdminNarrative({
    recovery: { totalReports: 20, recoveries: 5, recoveryRate: 25 },
    hotspots: { locations: [{ label: 'Main Library', count: 7 }], categories: [{ label: 'Bags', count: 9 }], times },
    operations: { overdueClaims: 2 },
  });
  const answer = answerAdminAnalyticsQuestion({ groundedNarrative }, 'which location has the most reports?');
  assert.match(answer.answer, /Main Library/);
  assert.equal(answer.evidence[0].metric, 'top-location');
  assert.match(answer.limitations, /does not infer causes/i);
});
