import DuplicateReviewCluster from '../models/DuplicateReviewCluster.js';
import FoundItem from '../models/FoundItem.js';
import ImageAnalysis from '../models/ImageAnalysis.js';
import LostItem from '../models/LostItem.js';
import { fuseVisualEvidence } from './imageComparisonService.js';
import { calculateDuplicateScore } from './reportQualityService.js';
import { buildSearchDocument, semanticSimilarity } from './semanticSearchService.js';

const scoreDuplicateCandidate = ({ source, candidate, sourceAnalysis, candidateAnalysis }) => {
  const lexical = calculateDuplicateScore(source, candidate);
  const semanticScore = Math.round(semanticSimilarity(buildSearchDocument(source), candidate) * 100);
  const visual = fuseVisualEvidence(null, sourceAnalysis, candidateAnalysis);
  const visualScore = visual?.score || 0;
  const score = Math.max(lexical.score, Math.round(lexical.score * 0.55 + semanticScore * 0.3 + visualScore * 0.15));
  const reasons = [...lexical.reasons];
  if (semanticScore >= 70) reasons.push('Highly similar meaning across spelling or language variants');
  if (visualScore >= 70) reasons.push('Privacy-safe visual fingerprint overlap');
  return { score, lexicalScore: lexical.score, semanticScore, visualScore, reasons: [...new Set(reasons)].slice(0, 8) };
};

const assessCrossAccountDuplicates = async ({ item, itemType, now = new Date() }) => {
  const Model = itemType === 'FoundItem' ? FoundItem : LostItem;
  const since = new Date(now.getTime() - 30 * 86_400_000);
  const candidates = await Model.find({
    _id: { $ne: item._id },
    userId: { $ne: item.userId },
    category: item.category,
    createdAt: { $gte: since },
    isDeleted: { $ne: true },
    isArchived: { $ne: true },
  }).sort({ createdAt: -1 }).limit(100).lean();
  if (!candidates.length) return null;
  const analyses = await ImageAnalysis.find({ itemId: { $in: [item._id, ...candidates.map((entry) => entry._id)] } }).select('+visualFingerprint').lean();
  const analysisMap = new Map(analyses.map((entry) => [String(entry.itemId), entry]));
  const scored = candidates.map((candidate) => ({
    candidate,
    result: scoreDuplicateCandidate({
      source: item,
      candidate,
      sourceAnalysis: analysisMap.get(String(item._id)),
      candidateAnalysis: analysisMap.get(String(candidate._id)),
    }),
  })).filter(({ result }) => result.score >= 65).sort((left, right) => right.result.score - left.result.score).slice(0, 12);
  const velocity24h = await Model.countDocuments({ userId: item.userId, createdAt: { $gte: new Date(now.getTime() - 86_400_000) }, isDeleted: { $ne: true } });
  if (!scored.length && velocity24h < 8) return null;
  const accountCount = new Set([String(item.userId), ...scored.map(({ candidate }) => String(candidate.userId))]).size;
  const riskScore = Math.min(100, Math.max(scored[0]?.result.score || 0, velocity24h >= 8 ? 75 : 0));
  const signals = [];
  if (scored.length) signals.push('cross-account-content-similarity');
  if (scored.some(({ result }) => result.semanticScore >= 70)) signals.push('semantic-duplicate');
  if (scored.some(({ result }) => result.visualScore >= 70)) signals.push('visual-fingerprint-duplicate');
  if (velocity24h >= 8) signals.push('high-report-velocity');
  return DuplicateReviewCluster.findOneAndUpdate(
    { clusterKey: `${itemType}:${item._id}` },
    {
      itemType,
      sourceItemId: item._id,
      sourceUserId: item.userId,
      candidates: scored.map(({ candidate, result }) => ({ itemId: candidate._id, userId: candidate.userId, ...result })),
      accountCount,
      reportVelocity24h: velocity24h,
      riskScore,
      signals,
      status: 'pending',
    },
    { new: true, upsert: true, runValidators: true },
  );
};

export { assessCrossAccountDuplicates, scoreDuplicateCandidate };
