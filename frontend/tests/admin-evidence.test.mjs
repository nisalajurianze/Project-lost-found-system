import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(frontend, relative), 'utf8');

test('audit trail is trilingual and never fabricates missing network evidence', async () => {
  const { translations } = await import('../src/i18n/translations.js');
  const keys = Object.keys(translations.en).filter((key) => key.startsWith('audit.'));
  assert.ok(keys.length >= 20);
  for (const language of ['si', 'ta']) assert.deepEqual(keys.filter((key) => !translations[language]?.[key]), []);
  const page = read('src/pages/admin/AdminLogs.jsx');
  assert.match(page, /useLanguage/);
  assert.match(page, /audit\.rawEvidenceNotice/);
  assert.match(page, /audit\.notRecorded/);
  assert.doesNotMatch(page, /127\.0\.0\.1/);
});

test('analytics uses structured aggregate evidence for locale rendering', async () => {
  const { translations } = await import('../src/i18n/translations.js');
  const keys = Object.keys(translations.en).filter((key) => key.startsWith('analytics.'));
  assert.ok(keys.length >= 60);
  for (const language of ['si', 'ta']) assert.deepEqual(keys.filter((key) => !translations[language]?.[key]), []);
  const page = read('src/pages/admin/Analytics.jsx');
  const service = fs.readFileSync(path.join(frontend, '../backend/services/operationalIntelligenceService.js'), 'utf8');
  assert.match(page, /dailyBriefItems/);
  assert.match(page, /analytics\.recommendation\.\$\{item\.type\}/);
  assert.match(service, /dailyBriefItems/);
  assert.match(service, /params: \{ minimumSample: 20 \}/);
  assert.match(service, /noticeCode:/);
  assert.match(page, /analytics\.recommendationNotice/);
});

test('feedback administration matches backend enums and official response route', async () => {
  const { translations } = await import('../src/i18n/translations.js');
  const keys = Object.keys(translations.en).filter((key) => key.startsWith('feedbackAdmin.'));
  assert.ok(keys.length >= 35);
  for (const language of ['si', 'ta']) assert.deepEqual(keys.filter((key) => !translations[language]?.[key]), []);
  const page = read('src/pages/admin/Feedback.jsx');
  const model = fs.readFileSync(path.join(frontend, '../backend/models/Feedback.js'), 'utf8');
  const route = fs.readFileSync(path.join(frontend, '../backend/routes/feedbackRoutes.js'), 'utf8');
  for (const value of ['general', 'bug_report', 'feature_request', 'complaint', 'praise']) {
    assert.match(page, new RegExp(value));
    assert.match(model, new RegExp(value));
  }
  assert.doesNotMatch(page, /value: 'lost'|value: 'found'|value: 'matching'|value: 'other'/);
  assert.match(page, /\/feedback\/\$\{responseItem\._id\}\/respond/);
  assert.match(route, /:\\?id\/respond|:\w+\/respond|\/:id\/respond/);
  const validators = fs.readFileSync(path.join(frontend, '../backend/utils/validators.js'), 'utf8');
  assert.match(validators, /adminResponse.*max: 1000/s);
  assert.match(page, /feedbackAdmin\.originalContentNotice/);
});
