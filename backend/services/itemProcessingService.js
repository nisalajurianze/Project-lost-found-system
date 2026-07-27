import LostItem from '../models/LostItem.js';
import FoundItem from '../models/FoundItem.js';
import ImageAnalysis from '../models/ImageAnalysis.js';
import { analyzeItemImage, generateKeywordsFromText } from './imageAnalysisService.js';
import { runMatchingForItem } from './aiMatchingService.js';
import { assessReport } from './reportIntelligenceService.js';

const processItem = async (itemType, itemId) => {
  const Model = itemType === 'LostItem' ? LostItem : FoundItem;
  const item = await Model.findById(itemId);
  if (!item || item.isDeleted || item.isArchived) return null;
  const imageUrl = item.images?.[0]?.url || '';
  const analysis = await analyzeItemImage(itemType, item._id, imageUrl, item.itemName, item.description);
  const keywords = await generateKeywordsFromText(item.itemName, item.description);
  item.aiKeywords = [...new Set([
    ...keywords,
    ...(analysis?.labels || []).map((entry) => String(entry).toLowerCase()),
    ...(analysis?.colors || []).map((entry) => String(entry).toLowerCase()),
  ])].slice(0, 30);
  const intelligence = await assessReport({
    report: item.toObject(),
    itemType,
    userId: item.userId,
    excludeItemId: item._id,
  });
  item.reportQuality = { ...intelligence.quality, assessedAt: new Date(intelligence.quality.assessedAt) };
  item.duplicateCandidates = intelligence.duplicateCandidates.map((candidate) => ({
    itemId: candidate.itemId,
    itemType: candidate.itemType,
    score: candidate.score,
    reasons: candidate.reasons,
  }));
  await item.save();
  await runMatchingForItem(item, itemType);
  return item;
};

const removeItemAnalysis = (itemId) => ImageAnalysis.deleteMany({ itemId });
export { processItem, removeItemAnalysis };
