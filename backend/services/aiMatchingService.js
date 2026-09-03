import LostItem from '../models/LostItem.js';
import FoundItem from '../models/FoundItem.js';
import Match from '../models/Match.js';
import ImageAnalysis from '../models/ImageAnalysis.js';
import { compareItemImages, fuseVisualEvidence, isSafeRemoteImageUrl } from './imageComparisonService.js';
import { queueStrongMatchNotifications } from './smartMatchNotificationService.js';
import {
  calculateArrayOverlap,
  calculateTextSimilarity,
  confidenceBand,
  dateTimeDimension,
  evaluateMatch,
} from './matchScoringService.js';

const executeMatching = async (item, itemType) => {
  if (!item || item.isDeleted || item.isArchived) return [];
  const Opposite = itemType === 'LostItem' ? FoundItem : LostItem;
  const sourceDate = new Date(item.lostDate || item.foundDate);
  const dateField = itemType === 'LostItem' ? 'foundDate' : 'lostDate';
  const windowDays = Math.min(365, Math.max(1, Number(process.env.MATCH_DATE_WINDOW_DAYS || process.env.MATCH_CANDIDATE_DAYS || 90)));
  const candidateLimit = Math.min(1000, Math.max(10, Number(process.env.MATCH_CANDIDATE_LIMIT || 300)));
  const saveThreshold = Math.min(100, Math.max(1, Number(process.env.MATCH_SAVE_THRESHOLD || 50)));
  const strongThreshold = Math.min(100, Math.max(saveThreshold, Number(process.env.MATCH_STRONG_THRESHOLD || 70)));
  const statuses = itemType === 'LostItem' ? ['available', 'matched'] : ['pending', 'matched'];
  const candidates = await Opposite.find({
    category: item.category,
    status: { $in: statuses },
    userId: { $ne: item.userId },
    isDeleted: { $ne: true },
    isArchived: { $ne: true },
    [dateField]: {
      $gte: new Date(sourceDate.getTime() - windowDays * 86_400_000),
      $lte: new Date(sourceDate.getTime() + windowDays * 86_400_000),
    },
  }).sort({ createdAt: -1 }).limit(candidateLimit);

  const ids = [item._id, ...candidates.map((candidate) => candidate._id)];
  const analyses = await ImageAnalysis.find({ itemId: { $in: ids } }).select('+visualFingerprint').lean();
  const analysisMap = new Map(analyses.map((analysis) => [String(analysis.itemId), analysis]));
  const preliminary = candidates.map((candidate) => {
    const lost = itemType === 'LostItem' ? item : candidate;
    const found = itemType === 'FoundItem' ? item : candidate;
    return {
      candidate,
      lost,
      found,
      lostAnalysis: analysisMap.get(String(lost._id)),
      foundAnalysis: analysisMap.get(String(found._id)),
    };
  }).map((entry) => ({
    ...entry,
    preliminaryResult: evaluateMatch(entry.lost, entry.found, entry.lostAnalysis, entry.foundAnalysis),
  })).sort((left, right) => right.preliminaryResult.similarityScore - left.preliminaryResult.similarityScore);

  const visualCompareLimit = Math.min(5, Math.max(0, Number(process.env.MATCH_VISUAL_COMPARE_LIMIT || 3)));
  const visualCompareFloor = Math.min(100, Math.max(0, Number(process.env.MATCH_VISUAL_COMPARE_FLOOR || Math.max(30, saveThreshold - 15))));
  const visualEligible = preliminary
    .filter((entry) => entry.preliminaryResult.similarityScore >= visualCompareFloor)
    .filter((entry) => isSafeRemoteImageUrl(entry.lostAnalysis?.imageUrl) && isSafeRemoteImageUrl(entry.foundAnalysis?.imageUrl))
    .slice(0, visualCompareLimit);
  const visualResults = await Promise.all(visualEligible.map(async (entry) => ({
    key: `${entry.lost._id}:${entry.found._id}`,
    comparison: await compareItemImages(entry.lostAnalysis.imageUrl, entry.foundAnalysis.imageUrl),
  })));
  const visualMap = new Map(visualResults.filter((entry) => entry.comparison).map((entry) => [entry.key, entry.comparison]));
  const saved = [];

  for (const entry of preliminary) {
    const { lost, found, lostAnalysis, foundAnalysis } = entry;
    const visualComparison = fuseVisualEvidence(
      visualMap.get(`${lost._id}:${found._id}`) || null,
      lostAnalysis,
      foundAnalysis,
    );
    const result = visualComparison
      ? evaluateMatch(lost, found, lostAnalysis, foundAnalysis, visualComparison)
      : entry.preliminaryResult;
    if (result.similarityScore < saveThreshold) continue;

    let match = await Match.findOne({ lostItemId: lost._id, foundItemId: found._id });
    if (match?.status === 'rejected') continue;
    const wasNew = !match;
    if (!match) {
      match = new Match({
        lostItemId: lost._id,
        foundItemId: found._id,
        lostUserId: lost.userId,
        foundUserId: found.userId,
        status: 'suggested',
      });
    }
    Object.assign(match, result, { lastEvaluatedAt: new Date() });
    await match.save();
    saved.push(match);

    if (result.similarityScore >= strongThreshold && match.status !== 'rejected') {
      if (lost.status === 'pending') { lost.status = 'matched'; await lost.save(); }
      if (found.status === 'available') { found.status = 'matched'; await found.save(); }
      if (wasNew || !match.notifiedAt) {
        const alertDecisions = await queueStrongMatchNotifications({ match, lost, found });
        if (alertDecisions.some((decision) => decision.eligible)) {
          match.notifiedAt = new Date();
          await match.save();
        }
      }
    }
  }
  return saved;
};

const runMatchingForItem = async (itemOrId, itemType) => {
  const Model = itemType === 'LostItem' ? LostItem : FoundItem;
  const item = itemOrId?._id ? itemOrId : await Model.findById(itemOrId);
  return executeMatching(item, itemType);
};

export {
  runMatchingForItem,
  evaluateMatch,
  executeMatching as _executeMatching,
  calculateTextSimilarity,
  calculateArrayOverlap,
  dateTimeDimension,
  confidenceBand,
};
