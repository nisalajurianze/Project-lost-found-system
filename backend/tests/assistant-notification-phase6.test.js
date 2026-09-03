import test from 'node:test';
import assert from 'node:assert/strict';
import AssistantHandoff from '../models/AssistantHandoff.js';
import OutboxEvent from '../models/OutboxEvent.js';
import { redactedSessionSummary } from '../controllers/assistantHandoffController.js';
import { normalizeNotificationPreferences } from '../services/notificationPreferenceService.js';
import { evaluateSmartMatchAlert, quietHoursDecision } from '../services/smartMatchNotificationService.js';

test('smart match alerts require user opt-in, confidence and evidence', () => {
  const match = { similarityScore: 84, confidencePercentage: 78, evidenceQuality: 64, confidenceBand: 'strong' };
  const eligible = evaluateSmartMatchAlert({ match, preferences: { minimumMatchConfidence: 80 } });
  assert.equal(eligible.eligible, true);
  const weak = evaluateSmartMatchAlert({ match: { ...match, evidenceQuality: 20 }, preferences: { minimumMatchConfidence: 80 } });
  assert.equal(weak.eligible, false);
  assert.ok(weak.reasons.includes('insufficient-evidence'));
  const disabled = evaluateSmartMatchAlert({ match, preferences: { smartMatchesEnabled: false } });
  assert.equal(disabled.eligible, false);
  assert.ok(disabled.reasons.includes('match-alerts-disabled'));
});

test('quiet hours defer proactive delivery until the configured Colombo end time', () => {
  const now = new Date('2026-09-03T17:30:00.000Z'); // 23:00 Asia/Colombo
  const result = quietHoursDecision({ enabled: true, start: '22:00', end: '07:00', timezone: 'Asia/Colombo' }, now);
  assert.equal(result.quiet, true);
  assert.equal(result.deliverAt.toISOString(), '2026-09-04T01:30:00.000Z');
  const daytime = quietHoursDecision({ enabled: true, start: '22:00', end: '07:00', timezone: 'Asia/Colombo' }, new Date('2026-09-03T06:30:00.000Z'));
  assert.equal(daytime.quiet, false);
});

test('notification preferences normalize safe defaults and bounded thresholds', () => {
  const result = normalizeNotificationPreferences({ minimumMatchConfidence: 200, quietHours: { enabled: true, start: 'bad', end: '06:30' } });
  assert.equal(result.minimumMatchConfidence, 95);
  assert.equal(result.quietHours.start, '22:00');
  assert.equal(result.quietHours.end, '06:30');
  assert.equal(result.quietHours.timezone, 'Asia/Colombo');
});

test('match alerts use the durable outbox and remain deduplicated', () => {
  assert.ok(OutboxEvent.schema.path('type').enumValues.includes('match.notify'));
  assert.ok(OutboxEvent.schema.indexes().some(([keys, options]) => keys.dedupeKey === 1 && options.unique));
});

test('human handoff stores only a consented redacted summary for authorized review', () => {
  const summary = redactedSessionSummary({
    reportType: 'lost',
    state: 'collecting',
    missing: ['date'],
    slots: { itemName: { value: 'Blue bag' }, uniqueFeatures: { value: 'Call 0771234567, ID ICT/2024/123' } },
  }, 'Need a person at me@example.com');
  assert.doesNotMatch(summary, /0771234567|me@example\.com|ICT\/2024\/123/);
  assert.equal(AssistantHandoff.schema.path('consent').options.immutable, true);
  assert.equal(AssistantHandoff.schema.path('policy').defaultValue, 'consented-redacted-summary-authorized-admin-only');
  assert.deepEqual(AssistantHandoff.schema.path('status').enumValues, ['queued', 'in-progress', 'resolved', 'closed']);
});
