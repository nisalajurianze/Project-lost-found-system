import ClaimRequest from '../models/ClaimRequest.js';
import { evaluateClaimRiskSignals } from './claimRiskPolicy.js';

const assessClaimRisk = async ({
  claimantId,
  proofImages = [],
  evidenceAssessment = {},
  rejectedClaimReviewThreshold = 3,
}) => {
  const since = new Date(Date.now() - 90 * 86_400_000);
  const [recentClaims, rejectedClaims, pendingClaims, reusedProof] = await Promise.all([
    ClaimRequest.countDocuments({ claimantId, createdAt: { $gte: since } }),
    ClaimRequest.countDocuments({ claimantId, status: 'rejected', createdAt: { $gte: since } }),
    ClaimRequest.countDocuments({ claimantId, status: 'pending' }),
    proofImages.length
      ? ClaimRequest.exists({
        claimantId: { $ne: claimantId },
        'proofImages.publicId': { $in: proofImages.map((image) => image.publicId).filter(Boolean) },
      })
      : false,
  ]);

  return evaluateClaimRiskSignals({
    recentClaims,
    rejectedClaims,
    pendingClaims,
    reusedProof: Boolean(reusedProof),
    evidenceAssessment,
    rejectedClaimReviewThreshold,
  });
};

export { assessClaimRisk };
