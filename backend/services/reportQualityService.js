import { calculateArrayOverlap, calculateTextSimilarity } from './matchScoringService.js';

const asList = (value) => Array.isArray(value)
  ? value.map((entry) => String(entry || '').trim()).filter(Boolean)
  : String(value || '').split(',').map((entry) => entry.trim()).filter(Boolean);

const hasText = (value, min = 1) => String(value || '').trim().length >= min;
const clamp = (value) => Math.max(0, Math.min(100, Math.round(value)));

const scoreReportQuality = (report = {}) => {
  let score = 0;
  const missingFields = [];
  const suggestions = [];
  const images = Array.isArray(report.images) ? report.images : [];
  const unique = asList(report.uniqueFeatures || report.uniqueMarks);
  const colours = asList(report.colors);
  const tags = asList(report.tags);
  const location = report.location || report.lostLocation || report.foundLocation;
  const date = report.date || report.lostDate || report.foundDate;

  if (hasText(report.itemName, 2)) score += 10;
  else missingFields.push('itemName');
  if (hasText(report.category, 2)) score += 10;
  else missingFields.push('category');

  const descriptionLength = String(report.description || '').trim().length;
  if (descriptionLength >= 80) score += 20;
  else if (descriptionLength >= 30) score += 14;
  else if (descriptionLength >= 10) score += 8;
  else missingFields.push('description');
  if (descriptionLength < 30) suggestions.push('Add a clearer description with distinguishing characteristics.');

  if (hasText(location, 4)) score += 15;
  else missingFields.push('location');
  if (date && Number.isFinite(new Date(date).getTime())) score += 10;
  else missingFields.push('date');

  if (images.length > 0 || report.hasImage) score += 15;
  else suggestions.push('A clear item photo can improve visual matching.');

  const identitySignals = [report.brand, report.model, report.material].filter((value) => hasText(value, 2)).length
    + Math.min(2, unique.length)
    + Math.min(1, colours.length)
    + Math.min(1, tags.length);
  score += Math.min(20, identitySignals * 4);
  if (identitySignals < 2) suggestions.push('Add a brand, colour, material, model, sticker, scratch, or another unique feature.');

  const normalizedScore = clamp(score);
  const level = normalizedScore >= 85 ? 'excellent' : normalizedScore >= 70 ? 'good' : normalizedScore >= 50 ? 'fair' : 'weak';
  return {
    score: normalizedScore,
    level,
    missingFields: [...new Set(missingFields)],
    suggestions: [...new Set(suggestions)].slice(0, 5),
    assessedAt: new Date().toISOString(),
    policy: 'advisory-only',
  };
};

const calculateDuplicateScore = (source = {}, candidate = {}) => {
  const sourceLocation = source.location || source.lostLocation || source.foundLocation;
  const candidateLocation = candidate.location || candidate.lostLocation || candidate.foundLocation;
  const category = String(source.category || '').toLowerCase() === String(candidate.category || '').toLowerCase() ? 1 : 0;
  const name = calculateTextSimilarity(source.itemName, candidate.itemName);
  const description = calculateTextSimilarity(source.description, candidate.description);
  const location = calculateTextSimilarity(sourceLocation, candidateLocation);
  const attributes = Math.max(
    calculateArrayOverlap(asList(source.colors), asList(candidate.colors)),
    calculateArrayOverlap(asList(source.uniqueFeatures || source.uniqueMarks), asList(candidate.uniqueFeatures || candidate.uniqueMarks)),
    calculateArrayOverlap(asList(source.tags), asList(candidate.tags)),
  );
  const sourceDate = new Date(source.date || source.lostDate || source.foundDate).getTime();
  const candidateDate = new Date(candidate.date || candidate.lostDate || candidate.foundDate).getTime();
  const dateScore = Number.isFinite(sourceDate) && Number.isFinite(candidateDate)
    ? Math.max(0, 1 - Math.abs(sourceDate - candidateDate) / (30 * 86_400_000))
    : 0;
  const score = clamp((category * 25) + (name * 25) + (description * 15) + (location * 15) + (attributes * 10) + (dateScore * 10));
  const reasons = [];
  if (category >= 1) reasons.push('Same category');
  if (name >= 0.6) reasons.push('Very similar item name');
  if (description >= 0.45) reasons.push('Similar description');
  if (location >= 0.55) reasons.push('Similar location');
  if (attributes >= 0.5) reasons.push('Overlapping characteristics');
  if (dateScore >= 0.75) reasons.push('Reported within a similar date range');
  return { score, reasons, likelyDuplicate: score >= 70 };
};

export { scoreReportQuality, calculateDuplicateScore };
