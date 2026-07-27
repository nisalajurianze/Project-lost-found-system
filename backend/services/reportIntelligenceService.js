import LostItem from '../models/LostItem.js';
import FoundItem from '../models/FoundItem.js';
import { calculateDuplicateScore, scoreReportQuality } from './reportQualityService.js';

const publicDuplicateView = (item, itemType, result) => ({
  itemId: item._id,
  itemType,
  itemName: item.itemName,
  category: item.category,
  location: item.lostLocation || item.foundLocation,
  date: item.lostDate || item.foundDate,
  status: item.status,
  score: result.score,
  reasons: result.reasons,
});

const findOwnDuplicateReports = async ({ report, itemType, userId, excludeItemId = null, limit = 5 }) => {
  const Model = itemType === 'FoundItem' ? FoundItem : LostItem;
  const query = {
    userId,
    isDeleted: { $ne: true },
    isArchived: { $ne: true },
  };
  if (report.category) query.category = report.category;
  if (excludeItemId) query._id = { $ne: excludeItemId };
  const candidates = await Model.find(query).sort({ createdAt: -1 }).limit(40).lean();
  return candidates
    .map((candidate) => ({ candidate, result: calculateDuplicateScore(report, candidate) }))
    .filter(({ result }) => result.score >= 45)
    .sort((left, right) => right.result.score - left.result.score)
    .slice(0, Math.min(10, Math.max(1, Number(limit) || 5)))
    .map(({ candidate, result }) => publicDuplicateView(candidate, itemType, result));
};

const assessReport = async ({ report, itemType, userId, excludeItemId = null }) => {
  const quality = scoreReportQuality(report);
  const duplicateCandidates = await findOwnDuplicateReports({ report, itemType, userId, excludeItemId });
  return {
    quality,
    duplicateCandidates,
    duplicateNotice: duplicateCandidates.some((entry) => entry.score >= 70)
      ? 'A similar report already exists in your account. Review or edit it before creating another report.'
      : '',
    policy: 'advisory-only',
  };
};

export { assessReport, findOwnDuplicateReports };
