import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(frontend, relative), 'utf8');

test('student dashboard is attention-first and keeps optional prompts after primary work', () => {
  const source = read('src/pages/user/Dashboard.jsx');
  const attentionIndex = source.indexOf("t('dashboard.needsAttention')");
  const optionalIndex = source.indexOf("t('dashboard.optionalSetup')");
  assert.ok(attentionIndex >= 0);
  assert.ok(optionalIndex > attentionIndex);
  assert.match(source, /claimsAwaitingReview/);
  assert.match(source, /handoverPending/);
  assert.match(source, /dashboard\.matchesDesc/);
  assert.doesNotMatch(source, /3x more accurate/i);
});

test('admin dashboard exposes real operational queues and human-review wording', () => {
  const source = read('src/pages/admin/AdminDashboard.jsx');
  assert.match(source, /admin\.urgentTitle/);
  assert.match(source, /overdueClaims/);
  assert.match(source, /strongSuggestedMatches/);
  assert.match(source, /deadOutboxEvents/);
  assert.match(source, /privacyReviewItems/);
  assert.match(source, /admin\.urgentDesc/);
});

test('analytics exposes database-backed structured briefs and advisory-only recovery evidence', () => {
  const analytics = read('src/pages/admin/Analytics.jsx');
  const service = fs.readFileSync(path.join(frontend, '../backend/services/operationalIntelligenceService.js'), 'utf8');
  assert.match(analytics, /analytics\.dailyBrief/);
  assert.match(analytics, /intelligence\.dailyBriefItems/);
  assert.match(analytics, /averageRecoveryHours/);
  assert.match(analytics, /analytics\.hotspots/);
  assert.match(analytics, /analytics\.recommendationNotice/);
  assert.match(analytics, /analytics\.cohortNotice/);
  assert.match(analytics, /intelligence\.predictions\.categoryCohorts/);
  assert.match(analytics, /intelligence\.predictions\.locationCohorts/);
  assert.match(analytics, /analytics\.interval/);
  assert.match(service, /dailyBriefItems/);
  assert.match(service, /noticeCode:/);
  assert.match(service, /minimumSample/);
});
