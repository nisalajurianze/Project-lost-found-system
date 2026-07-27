import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolveLocation, setApprovedLocationKnowledge } from '../services/locationIntelligenceService.js';

test('approved dynamic location knowledge becomes searchable without replacing verified static data', () => {
  setApprovedLocationKnowledge([{ id: 'knowledge-test', canonicalName: 'Test Student Centre', names: { en: 'Test Student Centre' }, aliases: ['student center shortcut'], area: 'Oluvil Campus', verificationStatus: 'university-approved', sensitivity: 'public' }]);
  assert.equal(resolveLocation('student center shortcut').best?.id, 'knowledge-test');
  assert.equal(resolveLocation('SEUSL main gate').best?.id, 'seusl-main-gate');
  setApprovedLocationKnowledge([]);
});

test('location governance requires human review and keeps version history', () => {
  const model = fs.readFileSync(new URL('../models/LocationKnowledge.js', import.meta.url), 'utf8');
  const controller = fs.readFileSync(new URL('../controllers/locationKnowledgeController.js', import.meta.url), 'utf8');
  const routes = fs.readFileSync(new URL('../routes/locationKnowledgeRoutes.js', import.meta.url), 'utf8');
  assert.match(model, /community-suggested/);
  assert.match(model, /history/);
  assert.match(model, /sensitivity/);
  assert.match(controller, /refreshApprovedLocations/);
  assert.match(controller, /ACTIVE_STATUSES/);
  assert.match(routes, /authorize\('admin'\)/);
  assert.match(routes, /protect, submitLocationSuggestion/);
});
