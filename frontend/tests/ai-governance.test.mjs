import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(frontend, relative), 'utf8');

test('report review exposes quality scoring and own-account duplicate recovery without blocking submission', () => {
  const wizard = read('src/components/common/ReportItemWizard.jsx');
  const service = read('src/services/aiService.js');
  assert.match(service, /\/ai\/report\/assess/);
  assert.match(wizard, /report\.qualityTitle/);
  assert.match(wizard, /report\.duplicatesTitle/);
  assert.match(wizard, /report\.qualityDesc/);
  assert.match(wizard, /edit-\$\{isLost \? 'lost' : 'found'\}/);
});

test('match correction and admin feedback review enforce human-approved dataset use', () => {
  const card = read('src/components/cards/MatchCard.jsx');
  const page = read('src/pages/admin/AIFeedbackReview.jsx');
  const app = read('src/App.jsx');
  assert.match(card, /match\.correctDetail/);
  assert.match(card, /wrong-category/);
  assert.match(card, /match\.correctionDesc/);
  assert.match(page, /aiFeedback\.subtitle/);
  assert.match(page, /aiFeedback\.approve/);
  assert.match(app, /\/admin\/ai-feedback/);
});
