import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('admin analytics exposes grounded aggregate questions and time trends', () => {
  const page = read('../src/pages/admin/Analytics.jsx');
  const service = read('../src/services/adminService.js');
  assert.match(page, /adminService\.explainAnalytics/);
  assert.match(page, /groundedNarrative/);
  assert.match(page, /analytics\.times/);
  assert.match(service, /admin\/analytics\/explain/);
});

test('feedback service exposes sealed dataset and human promotion workflow', () => {
  const service = read('../src/services/aiFeedbackService.js');
  assert.match(service, /getCalibration/);
  assert.match(service, /sealSnapshot/);
  assert.match(service, /createChallenger/);
  assert.match(service, /promoteChallenger/);
});
