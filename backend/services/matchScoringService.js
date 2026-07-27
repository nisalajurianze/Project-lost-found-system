import { boundedFuzzyMatch, expandKeywords, normalizeText } from './chatSearchService.js';
import { compareLocations, publicLocationView } from './locationIntelligenceService.js';

const tokenise = (value) => [...new Set([
  ...normalizeText(value).split(' '),
  ...expandKeywords(value, 40),
].map((entry) => String(entry).replace(/\s/g, '')).filter((word) => word.length > 1))];

const overlap = (left = [], right = []) => {
  if (!left.length || !right.length) return 0;
  const matches = left.filter((entry) => right.some((candidate) => entry === candidate || boundedFuzzyMatch(entry, candidate))).length;
  return Math.min(1, matches / Math.max(1, Math.min(left.length, right.length)));
};

const calculateTextSimilarity = (left, right) => overlap(tokenise(left), tokenise(right));
const calculateArrayOverlap = (left = [], right = []) => overlap(
  left.map((entry) => normalizeText(entry).replace(/\s/g, '')).filter(Boolean),
  right.map((entry) => normalizeText(entry).replace(/\s/g, '')).filter(Boolean),
);

const hasValue = (value) => Array.isArray(value) ? value.length > 0 : Boolean(String(value || '').trim());
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, Number(value) || 0));
const confidenceBand = (score) => {
  if (score >= 80) return 'very-strong';
  if (score >= 60) return 'strong';
  if (score >= 40) return 'possible';
  return 'weak';
};

const dateTimeDimension = (lostDateValue, foundDateValue) => {
  const lostDate = new Date(lostDateValue).getTime();
  const foundDate = new Date(foundDateValue).getTime();
  if (!Number.isFinite(lostDate) || !Number.isFinite(foundDate)) {
    return { score: 0.25, available: false, explanation: 'One report is missing reliable date/time evidence.', cap: 100 };
  }
  const diffHours = (foundDate - lostDate) / 3_600_000;
  if (diffHours < -72) return { score: 0, available: true, explanation: 'The found date is more than three days before the reported loss.', cap: 20 };
  if (diffHours < 0) return { score: 0.05, available: true, explanation: 'The found report is dated before the reported loss.', cap: 35 };
  if (diffHours <= 24) return { score: 1, available: true, explanation: 'The item was found within 24 hours after the reported loss.', cap: 100 };
  if (diffHours <= 72) return { score: 0.9, available: true, explanation: 'The reports are within three days in a plausible order.', cap: 100 };
  if (diffHours <= 168) return { score: 0.75, available: true, explanation: 'The reports are within one week in a plausible order.', cap: 100 };
  if (diffHours <= 720) return { score: 0.5, available: true, explanation: 'The reports are within one month.', cap: 100 };
  if (diffHours <= 2160) return { score: 0.25, available: true, explanation: 'The reports are separated by up to three months.', cap: 100 };
  return { score: 0.1, available: true, explanation: 'The reports are far apart in time.', cap: 100 };
};

const addDimension = (dimensions, { key, label, score, weight, available, explanation }) => {
  const normalizedScore = Math.round(clamp(score) * 100);
  dimensions.push({
    key,
    label,
    score: normalizedScore,
    weight,
    contribution: Math.round(clamp(score) * weight * 100) / 100,
    evidenceAvailable: Boolean(available),
    explanation,
  });
};

const evaluateMatch = (lost, found, lostAnalysis = null, foundAnalysis = null, visualComparison = null) => {
  const dimensions = [];
  const categoryScore = normalizeText(lost.category) === normalizeText(found.category) ? 1 : calculateTextSimilarity(lost.category, found.category);
  addDimension(dimensions, {
    key: 'category', label: 'Category', score: categoryScore, weight: 12, available: hasValue(lost.category) && hasValue(found.category),
    explanation: categoryScore >= 0.9 ? 'Both reports use the same item category.' : 'The item categories differ.',
  });

  const nameScore = calculateTextSimilarity(lost.itemName, found.itemName);
  addDimension(dimensions, {
    key: 'item-name', label: 'Item name', score: nameScore, weight: 12, available: hasValue(lost.itemName) && hasValue(found.itemName),
    explanation: nameScore >= 0.65 ? 'The item names contain strongly related terms.' : nameScore >= 0.3 ? 'The item names have some related terms.' : 'The item names have limited overlap.',
  });

  const descriptionScore = calculateTextSimilarity(lost.description, found.description);
  addDimension(dimensions, {
    key: 'description', label: 'Description', score: descriptionScore, weight: 10, available: hasValue(lost.description) && hasValue(found.description),
    explanation: descriptionScore >= 0.55 ? 'The report descriptions share several characteristics.' : descriptionScore >= 0.25 ? 'The descriptions share a few characteristics.' : 'The descriptions do not share many details.',
  });

  const keywordScore = Math.max(calculateArrayOverlap(lost.aiKeywords, found.aiKeywords), calculateArrayOverlap(lost.tags, found.tags));
  addDimension(dimensions, {
    key: 'keywords', label: 'Tags and keywords', score: keywordScore, weight: 8,
    available: (hasValue(lost.aiKeywords) || hasValue(lost.tags)) && (hasValue(found.aiKeywords) || hasValue(found.tags)),
    explanation: keywordScore >= 0.5 ? 'AI/search keywords overlap.' : 'Keyword evidence is limited.',
  });

  const brandModelLeft = [lostAnalysis?.brand, lostAnalysis?.model].filter(Boolean).join(' ');
  const brandModelRight = [foundAnalysis?.brand, foundAnalysis?.model].filter(Boolean).join(' ');
  const brandModelScore = calculateTextSimilarity(brandModelLeft, brandModelRight);
  addDimension(dimensions, {
    key: 'brand-model', label: 'Brand and model', score: brandModelScore, weight: 12,
    available: hasValue(brandModelLeft) && hasValue(brandModelRight),
    explanation: brandModelScore >= 0.65 ? 'Detected brand/model details are similar.' : hasValue(brandModelLeft) && hasValue(brandModelRight) ? 'Detected brand/model details differ.' : 'Brand/model evidence is incomplete.',
  });

  const colorScore = calculateArrayOverlap(lostAnalysis?.colors, foundAnalysis?.colors);
  addDimension(dimensions, {
    key: 'colours', label: 'Colours', score: colorScore, weight: 8,
    available: hasValue(lostAnalysis?.colors) && hasValue(foundAnalysis?.colors),
    explanation: colorScore >= 0.5 ? 'Detected colours overlap.' : hasValue(lostAnalysis?.colors) && hasValue(foundAnalysis?.colors) ? 'Detected colours have limited overlap.' : 'Colour evidence is incomplete.',
  });

  const materialScore = calculateTextSimilarity(lostAnalysis?.material, foundAnalysis?.material);
  addDimension(dimensions, {
    key: 'material', label: 'Material', score: materialScore, weight: 5,
    available: hasValue(lostAnalysis?.material) && hasValue(foundAnalysis?.material),
    explanation: materialScore >= 0.6 ? 'Detected materials are similar.' : 'Material evidence is incomplete or different.',
  });

  const uniqueLeft = [...(lostAnalysis?.uniqueMarks || []), ...(lostAnalysis?.visibleTextMasked || [])];
  const uniqueRight = [...(foundAnalysis?.uniqueMarks || []), ...(foundAnalysis?.visibleTextMasked || [])];
  const uniqueScore = calculateArrayOverlap(uniqueLeft, uniqueRight);
  addDimension(dimensions, {
    key: 'unique-marks', label: 'Unique marks and masked text', score: uniqueScore, weight: 10,
    available: hasValue(uniqueLeft) && hasValue(uniqueRight),
    explanation: uniqueScore >= 0.5 ? 'Unique marks or privacy-safe visible text overlap.' : hasValue(uniqueLeft) && hasValue(uniqueRight) ? 'Unique marks do not clearly overlap.' : 'Unique-mark evidence is incomplete.',
  });

  const location = compareLocations(lost.lostLocation, found.foundLocation);
  addDimension(dimensions, {
    key: 'location', label: 'Location context', score: location.score, weight: 10,
    available: hasValue(lost.lostLocation) && hasValue(found.foundLocation), explanation: location.explanation,
  });

  const dateTime = dateTimeDimension(lost.lostDate, found.foundDate);
  addDimension(dimensions, {
    key: 'date-time', label: 'Date and time plausibility', score: dateTime.score, weight: 8,
    available: dateTime.available, explanation: dateTime.explanation,
  });

  const visualLabelScore = calculateArrayOverlap(lostAnalysis?.labels, foundAnalysis?.labels);
  const directVisualAvailable = Number.isFinite(Number(visualComparison?.score));
  const directVisualScore = directVisualAvailable ? clamp(Number(visualComparison.score) / 100) : 0;
  const visualScore = directVisualAvailable
    ? clamp(directVisualScore * 0.8 + visualLabelScore * 0.2)
    : visualLabelScore;
  const sharedVisualFeatures = Array.isArray(visualComparison?.sharedFeatures)
    ? visualComparison.sharedFeatures.filter(Boolean).slice(0, 3).join(', ')
    : '';
  const visualExplanation = directVisualAvailable
    ? `${String(visualComparison?.explanation || 'A bounded dual-image comparison was completed.').slice(0, 220)}${sharedVisualFeatures ? ` Shared visual cues: ${sharedVisualFeatures}.` : ''}`
    : visualLabelScore >= 0.5
      ? 'Image-analysis labels overlap; no direct dual-image comparison evidence was available.'
      : 'Direct image comparison was unavailable and visual-label evidence is incomplete or weak.';
  addDimension(dimensions, {
    key: 'visual-similarity', label: 'Visual similarity', score: visualScore, weight: 5,
    available: directVisualAvailable || (hasValue(lostAnalysis?.labels) && hasValue(foundAnalysis?.labels)),
    explanation: visualExplanation.slice(0, 300),
  });

  let similarityScore = Math.round(dimensions.reduce((sum, dimension) => sum + dimension.contribution, 0));
  similarityScore = Math.min(similarityScore, dateTime.cap);
  const availableWeight = dimensions.filter((dimension) => dimension.evidenceAvailable).reduce((sum, dimension) => sum + dimension.weight, 0);
  const evidenceQuality = Math.round(availableWeight);
  const confidencePercentage = Math.max(0, Math.min(95, Math.round(similarityScore * 0.72 + evidenceQuality * 0.28)));
  const positive = dimensions
    .filter((dimension) => dimension.score >= 45 && dimension.evidenceAvailable)
    .sort((a, b) => b.contribution - a.contribution)
    .map((dimension) => dimension.explanation)
    .slice(0, 6);
  const caution = dimensions
    .filter((dimension) => dimension.score < 20 && dimension.evidenceAvailable && ['date-time', 'brand-model', 'unique-marks'].includes(dimension.key))
    .map((dimension) => dimension.explanation)
    .slice(0, 2);
  const explanations = [...positive, ...caution];
  const band = confidenceBand(similarityScore);
  const reason = explanations.join(' ') || 'Available report evidence has limited overlap.';
  const aiSummary = `${similarityScore}% similarity (${band.replace('-', ' ')}) across ${dimensions.filter((dimension) => dimension.evidenceAvailable).length} evidence dimensions. This is a ranking signal, not proof of ownership.`;

  return {
    similarityScore,
    confidencePercentage,
    confidenceBand: band,
    evidenceQuality,
    reason,
    explanations,
    dimensionScores: dimensions,
    locationContext: {
      left: publicLocationView(location.left) || undefined,
      right: publicLocationView(location.right) || undefined,
    },
    aiSummary,
    algorithmVersion: directVisualAvailable ? 'matching-v3-vision' : 'matching-v3',
  };
};


export {
  calculateArrayOverlap,
  calculateTextSimilarity,
  confidenceBand,
  dateTimeDimension,
  evaluateMatch,
};
