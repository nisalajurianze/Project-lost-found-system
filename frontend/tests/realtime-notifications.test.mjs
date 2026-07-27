import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(frontend, relative), 'utf8');

test('socket connection never prompts for notification permission or logs user identity', () => {
  const source = read('src/hooks/useSocket.js');
  assert.doesNotMatch(source, /Notification\.requestPermission/);
  assert.doesNotMatch(source, /user\.fullName|console\.(log|debug|info)/);
  assert.match(source, /document\.hidden/);
  assert.match(source, /Notification\.permission === 'granted'/);
});

test('socket hook owns one in-app toast and cleans its buffered timer', () => {
  const hook = read('src/hooks/useSocket.js');
  const slice = read('src/redux/slices/notificationSlice.js');
  assert.match(hook, /toast\.success/);
  assert.match(hook, /window\.clearTimeout\(timeoutId\)/);
  assert.doesNotMatch(slice, /react-hot-toast|toast\./);
});

test('push permission is requested only inside explicit subscription utility with stable error codes', () => {
  const utility = read('src/utils/pushNotifications.js');
  const dashboard = read('src/pages/user/Dashboard.jsx');
  assert.match(utility, /PUSH_NOTIFICATION_ERROR_CODES/);
  assert.match(utility, /Notification\.requestPermission\(\)/);
  assert.match(utility, /PERMISSION_DENIED/);
  assert.match(dashboard, /notifications\.pushUnsupported/);
  assert.match(dashboard, /notifications\.pushDenied/);
  assert.match(dashboard, /notifications\.pushSetupFailed/);
});

test('realtime and push guidance has complete trilingual translations', async () => {
  const { translations } = await import('../src/i18n/translations.js');
  const keys = [
    'notifications.realtimeFallbackTitle',
    'notifications.pushUnsupported',
    'notifications.pushDenied',
    'notifications.pushSetupFailed',
  ];
  for (const language of ['en', 'si', 'ta']) {
    assert.deepEqual(keys.filter((key) => !translations[language]?.[key]), []);
  }
});
