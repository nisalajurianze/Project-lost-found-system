import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateMatch } from '../services/matchScoringService.js';
import { compareLocations, resolveLocation } from '../services/locationIntelligenceService.js';
import { maskSensitiveText } from '../services/imagePrivacyService.js';

const lost = {
  itemName: 'Black Samsung Galaxy Phone',
  category: 'Electronics',
  description: 'Blue protective cover with a cracked upper right corner and round sticker',
  tags: ['mobile', 'blue cover'],
  aiKeywords: ['phone', 'samsung', 'cracked corner'],
  lostLocation: 'library laga campus eka',
  lostDate: new Date('2026-07-25T10:00:00Z'),
};

const found = {
  itemName: 'Samsung smartphone with blue case',
  category: 'Electronics',
  description: 'Black device, round sticker and crack near the top right',
  tags: ['smartphone', 'blue case'],
  aiKeywords: ['mobile', 'samsung', 'crack'],
  foundLocation: 'SEUSL Main Library entrance',
  foundDate: new Date('2026-07-25T14:00:00Z'),
};

const analysis = {
  labels: ['phone', 'smartphone', 'protective case'],
  colors: ['black', 'blue'],
  brand: 'Samsung',
  model: 'Galaxy',
  material: 'plastic and glass',
  uniqueMarks: ['round sticker', 'cracked upper right corner'],
  visibleTextMasked: ['SAM***NG'],
};

test('explainable matching combines semantic, visual, location and temporal evidence', () => {
  const result = evaluateMatch(lost, found, analysis, {
    ...analysis,
    uniqueMarks: ['round sticker', 'top right crack'],
  });
  assert.ok(result.similarityScore >= 70, `expected strong score, got ${result.similarityScore}`);
  assert.ok(['strong', 'very-strong'].includes(result.confidenceBand));
  assert.equal(result.algorithmVersion, 'matching-v3');
  assert.equal(result.dimensionScores.length, 11);
  assert.ok(result.dimensionScores.some((dimension) => dimension.key === 'location' && dimension.score >= 70));
  assert.match(result.aiSummary, /not proof of ownership/i);
});

test('bounded direct image comparison strengthens visual evidence without claiming ownership proof', () => {
  const result = evaluateMatch(lost, found, analysis, analysis, {
    score: 92,
    confidence: 84,
    sharedFeatures: ['blue protective case', 'round sticker'],
    differences: ['lighting'],
    explanation: 'Object shape, case and sticker placement are strongly similar.',
  });
  const visual = result.dimensionScores.find((dimension) => dimension.key === 'visual-similarity');
  assert.ok(visual.score >= 85);
  assert.match(visual.explanation, /dual-image|shape|sticker/i);
  assert.equal(result.algorithmVersion, 'matching-v3-vision');
  assert.match(result.aiSummary, /not proof of ownership/i);
});

test('impossible date ordering caps the match score', () => {
  const result = evaluateMatch(lost, { ...found, foundDate: new Date('2026-07-20T10:00:00Z') }, analysis, analysis);
  assert.ok(result.similarityScore <= 20);
  assert.equal(result.confidenceBand, 'weak');
  assert.ok(result.explanations.some((value) => /before the reported loss/i.test(value)));
});

test('SEUSL aliases resolve and compare without exposing private precision', () => {
  const resolved = resolveLocation('campus handiya near Oluvil');
  assert.equal(resolved.best?.id, 'oluvil-junction');
  const comparison = compareLocations('library laga', 'SEUSL main library entrance');
  assert.ok(comparison.score >= 0.8);
  assert.equal(comparison.left.best?.verificationStatus, 'university-approved');
});

test('sensitive OCR values are masked before storage or matching', () => {
  assert.match(maskSensitiveText('0712345678'), /\*{4,}/);
  assert.match(maskSensitiveText('student ID ICT/2024/123'), /\*{4}/);
  assert.match(maskSensitiveText('person@example.com'), /\*{3}@/);
});
