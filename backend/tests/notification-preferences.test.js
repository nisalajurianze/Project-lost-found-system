import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeNotificationPreferences,
  notificationCategory,
  isNotificationChannelEnabled,
} from '../services/notificationPreferenceService.js';

test('notification preferences default safely and preserve in-app audit delivery', () => {
  const preferences = normalizeNotificationPreferences({ emailEnabled: false, categories: { matches: false } });
  assert.equal(preferences.pushEnabled, true);
  assert.equal(preferences.emailEnabled, false);
  assert.equal(preferences.categories.matches, false);
  assert.equal(preferences.categories.claims, true);
  assert.equal(isNotificationChannelEnabled(preferences, 'inApp', 'matches'), true);
});

test('push and email delivery respect channel and category choices', () => {
  const preferences = normalizeNotificationPreferences({
    pushEnabled: true,
    emailEnabled: true,
    categories: { matches: false, claims: true, handover: false, reminders: true, system: true },
  });
  assert.equal(isNotificationChannelEnabled(preferences, 'push', 'matches'), false);
  assert.equal(isNotificationChannelEnabled(preferences, 'email', 'claims'), true);
  assert.equal(isNotificationChannelEnabled(preferences, 'email', 'handover'), false);
  assert.equal(notificationCategory('match_found'), 'matches');
  assert.equal(notificationCategory('claim_approved'), 'handover');
});
