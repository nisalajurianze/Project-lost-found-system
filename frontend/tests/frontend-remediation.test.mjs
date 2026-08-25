import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validatePassword } from '../src/utils/validators.js';

test('profile uses the boolean password validator contract', () => {
  const source = fs.readFileSync(new URL('../src/pages/user/Profile.jsx', import.meta.url), 'utf8');
  assert.equal(validatePassword('StrongPassword1!'), true);
  assert.equal(validatePassword('weak'), false);
  assert.match(source, /if \(!validatePassword\(newPassword\)\)/);
  assert.doesNotMatch(source, /\{ isValid, message \} = validatePassword/);
});

test('global assistant is a deferred lazy chunk with an isolated fallback', () => {
  const source = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.match(source, /const AIChatbot = lazyWithRetry\(\(\) => import\('\.\/components\/common\/AIChatbot'\)\)/);
  assert.match(source, /requestIdleCallback/);
  assert.match(source, /<Suspense fallback=\{null\}>/);
  assert.match(source, /assistantReady && <AIChatbot/);
});
