const clampInteger = (value, fallback, min, max) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const evaluateClaimRiskSignals = ({
  recentClaims = 0,
  rejectedClaims = 0,
  pendingClaims = 0,
  reusedProof = false,
  evidenceAssessment = {},
  rejectedClaimReviewThreshold = 3,
} = {}) => {
  const threshold = clampInteger(rejectedClaimReviewThreshold, 3, 1, 50);
  let score = 0;
  const reasons = [];

  if (evidenceAssessment.level === 'weak') {
    score += 25;
    reasons.push('Ownership evidence is incomplete and needs careful review.');
  }
  if (pendingClaims >= 3) {
    score += 15;
    reasons.push('The claimant has several unresolved claims.');
  }
  if (recentClaims >= 8) {
    score += 20;
    reasons.push('Claim frequency is higher than normal for the review window.');
  }

  const rejectedClaimReviewThresholdReached = rejectedClaims >= threshold;
  if (rejectedClaimReviewThresholdReached) {
    score += 20;
    reasons.push('The configured rejected-claim threshold was reached; an authorised human must review the pattern.');
  }
  if (reusedProof) {
    score += 40;
    reasons.push('A proof asset appears to have been used by another account.');
  }

  score = Math.min(100, score);
  const level = score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low';
  return {
    score,
    level,
    reasons,
    requiresHumanReview: level !== 'low' || rejectedClaimReviewThresholdReached,
    assessedAt: new Date(),
    policy: 'advisory-only',
    signals: {
      rejectedClaims90d: Math.max(0, Number(rejectedClaims) || 0),
      rejectedClaimReviewThreshold: threshold,
      rejectedClaimReviewThresholdReached,
    },
  };
};

export { clampInteger, evaluateClaimRiskSignals };
