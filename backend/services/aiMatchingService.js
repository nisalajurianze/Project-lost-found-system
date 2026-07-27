import LostItem from '../models/LostItem.js';
import FoundItem from '../models/FoundItem.js';
import Match from '../models/Match.js';
import ImageAnalysis from '../models/ImageAnalysis.js';
import User from '../models/User.js';
import { createNotification } from './notificationService.js';
import { sendWorkflowEmail } from './workflowEmailService.js';
import { compareItemImages, isSafeRemoteImageUrl } from './imageComparisonService.js';
import {
  calculateArrayOverlap,
  calculateTextSimilarity,
  confidenceBand,
  dateTimeDimension,
  evaluateMatch,
} from './matchScoringService.js';

const notifyStrongMatch = async (match, lost, found) => {
  const [lostUser, foundUser] = await Promise.all([
    User.findById(lost.userId).select('fullName email isActive notificationPreferences'),
    User.findById(found.userId).select('fullName email isActive notificationPreferences'),
  ]);
  const baseUrl = String(process.env.CLIENT_URLS || process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].replace(/\/$/, '');
  const url = `${baseUrl}/dashboard/matches`;
  const recipients = [
    { user: lostUser, itemName: lost.itemName, message: `A found report has a ${match.similarityScore}% similarity score with “${lost.itemName}”.` },
    { user: foundUser, itemName: found.itemName, message: `A lost report has a ${match.similarityScore}% similarity score with “${found.itemName}”.` },
  ];
  await Promise.allSettled(recipients.filter(({ user }) => user?.isActive).flatMap(({ user, itemName, message }) => [
    createNotification({
      userId: user._id,
      title: 'Potential match found',
      message,
      type: 'match_found',
      relatedItem: { itemType: 'Match', itemId: match._id },
      dedupeKey: `strong-match:${match._id}:${user._id}`,
    }),
    sendWorkflowEmail({
      user,
      category: 'matches',
      template: 'matchFound',
      data: { itemName, score: match.similarityScore, url, eventId: `strong-match:${match._id}:${user._id}` },
      idempotencyKey: `strong-match:${match._id}:${user._id}`,
    }),
  ]));
};

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
  const analyses = await ImageAnalysis.find({ itemId: { $in: ids } }).lean();
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
    const visualComparison = visualMap.get(`${lost._id}:${found._id}`) || null;
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
        match.notifiedAt = new Date();
        await match.save();
        await notifyStrongMatch(match, lost, found);
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
