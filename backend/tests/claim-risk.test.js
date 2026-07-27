import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { evaluateClaimRiskSignals } from '../services/claimRiskPolicy.js';

test('claim risk is advisory-only and never auto approves rejects or suspends', () => {
  const service = fs.readFileSync(new URL('../services/claimRiskService.js', import.meta.url), 'utf8');
  const policy = fs.readFileSync(new URL('../services/claimRiskPolicy.js', import.meta.url), 'utf8');
  const controller = fs.readFileSync(new URL('../controllers/claimController.js', import.meta.url), 'utf8');
  const model = fs.readFileSync(new URL('../models/ClaimRequest.js', import.meta.url), 'utf8');
  assert.match(policy, /policy:\s*'advisory-only'/);
  assert.match(service, /reusedProof/);
  assert.match(model, /requiresHumanReview/);
  assert.match(controller, /assessClaimRisk/);
  assert.doesNotMatch(`${service}\n${policy}`, /status\s*=\s*['"]rejected/);
  assert.doesNotMatch(`${service}\n${policy}`, /isActive\s*=\s*false/);
});

test('configured rejected-claim threshold creates a human-review signal only', () => {
  const below = evaluateClaimRiskSignals({ rejectedClaims: 3, rejectedClaimReviewThreshold: 4 });
  assert.equal(below.signals.rejectedClaimReviewThresholdReached, false);

  const reached = evaluateClaimRiskSignals({ rejectedClaims: 4, rejectedClaimReviewThreshold: 4 });
  assert.equal(reached.signals.rejectedClaimReviewThresholdReached, true);
  assert.equal(reached.requiresHumanReview, true);
  assert.equal(reached.policy, 'advisory-only');
  assert.match(reached.reasons.join(' '), /authorised human must review/i);
});

test('risk thresholds are bounded and request limits match the settings allowlist', () => {
  const low = evaluateClaimRiskSignals({ rejectedClaims: 1, rejectedClaimReviewThreshold: -50 });
  const high = evaluateClaimRiskSignals({ rejectedClaims: 49, rejectedClaimReviewThreshold: 500 });
  assert.equal(low.signals.rejectedClaimReviewThreshold, 1);
  assert.equal(high.signals.rejectedClaimReviewThreshold, 50);

  const controller = fs.readFileSync(new URL('../controllers/claimController.js', import.meta.url), 'utf8');
  assert.match(controller, /Math\.min\(50, Math\.max\(1, Number\(maxPendingSetting/);
  assert.match(controller, /Math\.min\(100, Math\.max\(1, Number\(maxDailySetting/);
  assert.match(controller, /rejectedClaimReviewThreshold/);
});
