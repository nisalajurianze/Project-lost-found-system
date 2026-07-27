import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(frontend, relative), 'utf8');
const readBackend = (relative) => fs.readFileSync(path.join(frontend, '../backend', relative), 'utf8');

test('handover resolution is trilingual, human-confirmed and records a bounded cancellation reason', async () => {
  const { translations } = await import('../src/i18n/translations.js');
  const keys = Object.keys(translations.en).filter((key) => key.startsWith('resolution.'));
  assert.ok(keys.length >= 25);
  for (const language of ['si', 'ta']) assert.deepEqual(keys.filter((key) => !translations[language]?.[key]), []);

  const page = read('src/pages/protected/VerifyResolution.jsx');
  const foundService = read('src/services/foundItemService.js');
  const lostService = read('src/services/lostItemService.js');
  const foundRoute = readBackend('routes/foundItemRoutes.js');
  const lostRoute = readBackend('routes/lostItemRoutes.js');
  const validators = readBackend('utils/validators.js');

  assert.match(page, /useLanguage/);
  assert.match(page, /resolution\.notice/);
  assert.match(page, /resolution\.cancelReasonRequired/);
  assert.match(page, /cancelConnection\(id, reason\)/);
  assert.doesNotMatch(page, /AI suggestions are not proof|Yes, it was resolved|Connection cancelled/);
  assert.match(foundService, /cancelConnection: async \(id, reason\)/);
  assert.match(foundService, /cancel-connection`, \{ reason \}/);
  assert.match(lostService, /cancelConnection: async \(id, reason\)/);
  assert.match(lostService, /cancel-connection`, \{ reason \}/);
  assert.match(foundRoute, /handoverCancellationValidator/);
  assert.match(lostRoute, /handoverCancellationValidator/);
  assert.match(validators, /handoverCancellationValidator[\s\S]*exists\(\{ checkFalsy: true \}\)[\s\S]*min: 5, max: 1000/);
});

test('recovery feedback modal localizes copy and exposes an accessible star radio group', async () => {
  const { translations } = await import('../src/i18n/translations.js');
  const keys = Object.keys(translations.en).filter((key) => key.startsWith('feedbackModal.'));
  assert.ok(keys.length >= 12);
  for (const language of ['si', 'ta']) assert.deepEqual(keys.filter((key) => !translations[language]?.[key]), []);

  const modal = read('src/components/common/FeedbackModal.jsx');
  assert.match(modal, /useLanguage/);
  assert.match(modal, /role="radiogroup"/);
  assert.match(modal, /role="radio"/);
  assert.match(modal, /aria-checked=\{rating === star\}/);
  assert.match(modal, /feedbackModal\.description/);
  assert.match(modal, /message\.trim\(\)\.length < 10/);
  assert.doesNotMatch(modal, /Leave Feedback|Thank you for your feedback|Message must be at least/);
});
