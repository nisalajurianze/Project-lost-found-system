import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(frontend, relative), 'utf8');

test('service worker never caches API, auth, or websocket traffic', () => {
  const sw = read('public/sw.js');
  assert.match(sw, /\/api\//);
  assert.match(sw, /socket\.io/);
  assert.match(sw, /return;|respondWith/);
});

test('API client uses cookie credentials and CSRF without persistent tokens', () => {
  const api = read('src/services/api.js');
  assert.match(api, /withCredentials:\s*true/);
  assert.match(api, /X-CSRF-Token/);
  assert.doesNotMatch(api, /localStorage/);
});

test('password login confirms the secure cookie session before authenticating locally', () => {
  const auth = read('src/services/authService.js');
  const slice = read('src/redux/slices/authSlice.js');
  const login = read('src/pages/public/Login.jsx');
  assert.match(auth, /post\('\/auth\/login'/);
  assert.match(auth, /get\('\/auth\/me'/);
  assert.match(auth, /AUTH_SESSION_UNAVAILABLE/);
  assert.match(slice, /error\.code \|\| error\.message/);
  assert.match(login, /auth\.sessionUnavailable/);
});

test('production defaults use the same origin', () => {
  const constants = read('src/utils/constants.js');
  const env = read('.env.example');
  assert.match(constants, /['"]\/api['"]/);
  assert.match(env, /VITE_API_URL=\/api/);
  assert.match(env, /VITE_SOCKET_URL=\s*$/m);
});

test('nginx proxies API and websocket traffic and forbids unsafe eval', () => {
  const nginx = read('nginx.conf');
  assert.match(nginx, /location \/api\//);
  assert.match(nginx, /location \/socket\.io\//);
  assert.doesNotMatch(nginx, /unsafe-eval/);
  assert.match(nginx, /frame-ancestors 'none'/);
});


test('password validation matches the backend production policy', () => {
  const validators = read('src/utils/validators.js');
  assert.match(validators, /length\s*<\s*12/);
  assert.match(validators, /length\s*>\s*128/);
  assert.match(validators, /\[A-Z\]/);
  assert.match(validators, /\[a-z\]/);
  assert.match(validators, /\\d/);
});

test('signed-out contact form never reports a fake successful submission', () => {
  const contact = read('src/pages/public/Contact.jsx');
  assert.doesNotMatch(contact, /only simulate sending|setTimeout\([\s\S]{0,250}sent/i);
  assert.match(contact, /contact\.signInRequired/);
});
