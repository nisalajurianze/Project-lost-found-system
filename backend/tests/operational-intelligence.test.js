import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildOperationalIntelligence,
  buildOutcomeCohorts,
  mergeBuckets,
  wilsonInterval,
} from '../services/operationalIntelligenceService.js';

test('operational intelligence merges hotspots and produces grounded daily summaries', () => {
  const locations = mergeBuckets([{ _id: 'Library', count: 3 }], [{ _id: 'library', count: 2 }, { _id: 'Main Gate', count: 1 }]);
  const result = buildOperationalIntelligence({
    summary: { totalLostItems: 30, totalFoundItems: 20, successfulRecoveries: 12 },
    operations: { pendingClaims: 4, overdueClaims: 2, strongSuggestedMatches: 3, privacyReviewItems: 1 },
    newLost24: 2, newFound24: 1, approvedClaims30: 8,
    locations, categories: [{ label: 'Electronics', count: 9 }],
    averageRecoveryHours: 31.26, recoverySampleSize: 12,
    categoryOutcomeCohorts: [{ _id: 'Electronics', sampleSize: 20, recovered: 12, averageRecoveryHours: 28.4, recoveryDurationSample: 12 }],
    locationOutcomeCohorts: [{ _id: { canonicalName: 'SEUSL Main Library' }, sampleSize: 14, recovered: 8, averageRecoveryHours: 19.2, recoveryDurationSample: 8 }],
  });
  assert.equal(locations[0].count, 5);
  assert.equal(result.recovery.recoveryRate, 40);
  assert.equal(result.recovery.averageRecoveryHours, 31.3);
  assert.match(result.dailyBrief[0], /last 24 hours/);
  assert.equal(result.dailyBriefItems[0].type, 'reports-created-24h');
  assert.deepEqual(result.dailyBriefItems[0].params, { lost: 2, found: 1 });
  assert.equal(result.recommendations.classification, 'experimental-advisory-not-fact');
  assert.ok(result.recommendations.items.some((item) => item.type === 'hotspot-prevention' && item.params.count === 5));
  assert.equal(result.predictions.noticeCode, 'available');
  assert.equal(result.predictions.dataSufficient, true);
  assert.equal(result.predictions.categoryCohorts[0].eligible, true);
  assert.equal(result.predictions.locationCohorts[0].label, 'SEUSL Main Library');
  assert.match(result.predictions.notice, /historical aggregate outcomes/i);
});

test('recommendations fail safely when the historical sample is insufficient', () => {
  const result = buildOperationalIntelligence({
    summary: { totalLostItems: 5, totalFoundItems: 4, successfulRecoveries: 1 },
    operations: {},
  });
  assert.equal(result.recommendations.dataSufficient, false);
  assert.equal(result.recommendations.items[0].type, 'insufficient-data');
  assert.doesNotMatch(result.recommendations.items[0].message, /guarantee/i);
  assert.equal(result.predictions.dataSufficient, false);
  assert.match(result.predictions.notice, /withheld/i);
});

test('cohort evidence uses minimum samples, smoothing and uncertainty intervals', () => {
  const cohorts = buildOutcomeCohorts([
    { _id: 'Electronics', sampleSize: 20, recovered: 12, averageRecoveryHours: 24.26, recoveryDurationSample: 12 },
    { _id: 'Books', sampleSize: 4, recovered: 4, averageRecoveryHours: 8, recoveryDurationSample: 4 },
  ], { minimumSample: 10 });
  assert.equal(cohorts[0].label, 'Electronics');
  assert.equal(cohorts[0].eligible, true);
  assert.equal(cohorts[0].observedRecoveryRate, 60);
  assert.equal(cohorts[0].smoothedRecoveryRate, 59.1);
  assert.ok(cohorts[0].interval95.lower < 60 && cohorts[0].interval95.upper > 60);
  assert.equal(cohorts[1].eligible, false);
  assert.equal(wilsonInterval(0, 0).upper, 0);
});

test('governed location cohort source excludes raw or restricted locations', () => {
  const source = fs.readFileSync(new URL('../controllers/adminController.js', import.meta.url), 'utf8');
  assert.match(source, /'locationIntelligence\.needsReview': false/);
  assert.match(source, /'locationIntelligence\.canonicalId': \{ \$nin: \['', null\] \}/);
  assert.match(source, /'locationIntelligence\.sensitivity': \{ \$in: \['public', 'zone-only'\] \}/);
  assert.match(source, /map-source-verified.*field-verified.*university-approved/s);
  const governedStart = source.indexOf("'locationIntelligence.needsReview': false");
  const governedEnd = source.indexOf(']),', governedStart);
  const governedBlock = source.slice(governedStart, governedEnd);
  assert.ok(governedStart > 0 && governedEnd > governedStart);
  assert.doesNotMatch(governedBlock, /\$ifNull|\$lostLocation/);
});
