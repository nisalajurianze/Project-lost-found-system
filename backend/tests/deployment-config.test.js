import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isSafeEmailFrom } from '../config/security.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(here, '..');

test('production sender validation accepts normal mailboxes and display names', () => {
  assert.equal(isSafeEmailFrom('noreply@smartlf.seu.ac.lk'), true);
  assert.equal(isSafeEmailFrom('Smart Lost & Found <noreply@smartlf.seu.ac.lk>'), true);
});

test('production sender validation rejects injection, malformed and placeholder senders', () => {
  assert.equal(isSafeEmailFrom(''), false);
  assert.equal(isSafeEmailFrom('not-an-email'), false);
  assert.equal(isSafeEmailFrom('Smart L&F <noreply@example.invalid>'), false);
  assert.equal(isSafeEmailFrom('noreply@example.com'), false);
  assert.equal(isSafeEmailFrom('noreply@smartlf.seu.ac.lk\r\nBcc: attacker@example.net'), false);
});

test('legacy plaintext refresh-token utility is not present', () => {
  assert.equal(fs.existsSync(path.join(backendRoot, 'utils/generateTokens.js')), false);
});

test('backend container healthcheck follows the runtime PORT variable', () => {
  const dockerfile = fs.readFileSync(path.join(backendRoot, 'Dockerfile'), 'utf8');
  assert.match(dockerfile, /process\.env\.PORT \|\| 5000/);
  assert.doesNotMatch(dockerfile, /fetch\('http:\/\/127\.0\.0\.1:5000\/api\/health\/ready'/);
});
