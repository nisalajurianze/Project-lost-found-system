import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { calculateDuplicateScore, scoreReportQuality } from '../services/reportQualityService.js';

test('report quality rewards complete identifying evidence and remains advisory', () => {
  const result = scoreReportQuality({
    itemName: 'Black Samsung phone', category: 'Electronics',
    description: 'Black Samsung phone with a blue cover, cracked upper corner and a round university sticker.',
    location: 'SEUSL Library second floor', date: new Date().toISOString(), hasImage: true,
    brand: 'Samsung', model: 'Galaxy', colors: ['black', 'blue'], uniqueFeatures: ['cracked corner'], tags: ['phone'],
  });
  assert.ok(result.score >= 85);
  assert.equal(result.policy, 'advisory-only');
  assert.deepEqual(result.missingFields, []);
});

test('duplicate scoring identifies highly similar reports without claiming certainty', () => {
  const left = { itemName: 'black samsung phone', category: 'Electronics', description: 'blue cover cracked corner', location: 'library second floor', date: '2026-07-20', colors: ['black', 'blue'], uniqueFeatures: ['cracked corner'] };
  const right = { itemName: 'Samsung black phone', category: 'Electronics', description: 'phone with blue cover and cracked corner', location: 'SEUSL library 2nd floor', date: '2026-07-21', colors: ['black', 'blue'], uniqueFeatures: ['cracked corner'] };
  const result = calculateDuplicateScore(left, right);
  assert.ok(result.score >= 70);
  assert.equal(result.likelyDuplicate, true);
});

test('AI feedback requires admin approval and match decisions are recorded transactionally', () => {
  const model = fs.readFileSync(new URL('../models/AIDecisionFeedback.js', import.meta.url), 'utf8');
  const controller = fs.readFileSync(new URL('../controllers/matchController.js', import.meta.url), 'utf8');
  assert.match(model, /admin-approved-dataset-only/);
  assert.match(model, /pending.*approved.*rejected/s);
  assert.match(controller, /AIDecisionFeedback\.create/);
  assert.match(controller, /\{ session \}/);
});
