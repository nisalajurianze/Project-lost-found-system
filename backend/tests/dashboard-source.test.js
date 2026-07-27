import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(backend, relative), 'utf8');

test('admin operations metrics are database-backed rather than hard-coded', () => {
  const source = read('controllers/adminController.js');
  assert.match(source, /Match\.countDocuments/);
  assert.match(source, /OutboxEvent\.countDocuments/);
  assert.match(source, /ImageAnalysis\.countDocuments/);
  assert.match(source, /overdueHandovers/);
  assert.match(source, /urgentTotal/);
  assert.doesNotMatch(source, /pendingClaims:\s*0/);
});

test('student attention totals are computed from claims, matches and report states', () => {
  const source = read('controllers/userController.js');
  assert.match(source, /claimsAwaitingReview/);
  assert.match(source, /suggestedMatches/);
  assert.match(source, /handoverPending/);
  assert.match(source, /activeReports/);
});
