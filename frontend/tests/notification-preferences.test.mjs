import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync(new URL('../src/pages/user/Notifications.jsx', import.meta.url), 'utf8');
const routes = fs.readFileSync(new URL('../../backend/routes/notificationRoutes.js', import.meta.url), 'utf8');
const service = fs.readFileSync(new URL('../../backend/services/notificationService.js', import.meta.url), 'utf8');
const workflowEmail = fs.readFileSync(new URL('../../backend/services/workflowEmailService.js', import.meta.url), 'utf8');

test('notification centre exposes persisted channel and category controls', () => {
  assert.match(page, /\/notifications\/preferences/);
  assert.match(page, /pushEnabled/);
  assert.match(page, /emailEnabled/);
  assert.match(page, /preferences\.categories\?\.\[key\]/);
  assert.match(page, /notifications\.emailDesc/);
  assert.match(page, /useLanguage/);
  assert.match(routes, /router\.put\('\/preferences'/);
});

test('delivery enforcement keeps in-app audit records and gates push and workflow email', () => {
  assert.match(service, /pushAllowed/);
  assert.match(service, /isNotificationChannelEnabled/);
  assert.match(workflowEmail, /isNotificationChannelEnabled\(user\.notificationPreferences, 'email', category\)/);
  assert.doesNotMatch(workflowEmail, /deleteMany|findOneAndDelete/);
});
