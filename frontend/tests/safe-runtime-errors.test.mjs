import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.join(frontend, 'src');

const collect = (dir, files = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full, files);
    else if (/\.(?:js|jsx|mjs)$/.test(entry.name)) files.push(full);
  }
  return files;
};

test('user-facing toasts do not render raw technical error.message or response messages', () => {
  const offenders = [];
  for (const file of collect(sourceRoot)) {
    const source = fs.readFileSync(file, 'utf8');
    if (/toast\.(?:error|success)\([^\n]*(?:error|err)\??\.message/.test(source)
      || /toast\.(?:error|success)\([^\n]*error\.response/.test(source)
      || /toast\.(?:error|success)\([^\n]*typeof err/.test(source)) {
      offenders.push(path.relative(frontend, file));
    }
  }
  assert.deepEqual(offenders, []);
});

test('principal account assistant and report failures use localized fallback keys', () => {
  const expectations = {
    'src/pages/user/Profile.jsx': ['profile.updateError', 'profile.passwordUpdateError'],
    'src/pages/user/Notifications.jsx': ['notifications.saveFailed', 'notifications.markFailed'],
    'src/components/common/AIChatbot.jsx': ['assistant.connectionFailed'],
    'src/components/common/ReportItemWizard.jsx': ['report.categoryCreateFailed', 'report.validCategory'],
    'src/pages/public/Login.jsx': ['auth.authFailed', 'auth.googleLoginFailed'],
    'src/pages/public/Register.jsx': ['auth.registrationFailed', 'auth.googleRegisterFailed'],
    'src/pages/public/VerifyEmail.jsx': ['auth.verificationFailedToast'],
  };
  for (const [relative, keys] of Object.entries(expectations)) {
    const source = fs.readFileSync(path.join(frontend, relative), 'utf8');
    for (const key of keys) assert.match(source, new RegExp(key.replaceAll('.', '\\.')));
  }
});
