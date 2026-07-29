import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isSafeInternalPath, toSafeInternalPath } from '../src/utils/internalNavigation.js';
import { isChunkLoadError, shouldRetryChunkLoad } from '../src/utils/lazyWithRetry.js';

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(frontend, relative), 'utf8');

test('internal navigation rejects external, scheme-relative, encoded, and backslash paths', () => {
  for (const unsafe of ['https://evil.example', '//evil.example', '/\\evil.example', '/%2f%2fevil.example', '/%5cevil.example', 'javascript:alert(1)']) {
    assert.equal(isSafeInternalPath(unsafe), false, unsafe);
    assert.equal(toSafeInternalPath(unsafe, '/dashboard'), '/dashboard');
  }
  assert.equal(toSafeInternalPath('/lost-items/abc?q=phone#details'), '/lost-items/abc?q=phone#details');
});

test('chunk reload recovery is limited to one retry for a known chunk error', () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const error = new TypeError('Failed to fetch dynamically imported module');
  assert.equal(isChunkLoadError(error), true);
  assert.equal(shouldRetryChunkLoad(error, 'https://app.example/search', storage, 1_000), true);
  assert.equal(shouldRetryChunkLoad(error, 'https://app.example/search', storage, 2_000), false);
  assert.equal(shouldRetryChunkLoad(error, 'https://app.example/search', storage, 40_000), true);
  assert.equal(shouldRetryChunkLoad(new TypeError('Network request failed'), 'https://app.example/search', storage), false);
});

test('shared mobile controls preserve 44px touch targets', () => {
  assert.doesNotMatch(read('src/components/layout/Navbar.jsx'), /LanguageSwitcher compact className="scale-90/);
  assert.match(read('src/components/layout/Navbar.jsx'), /min-h-11 min-w-11 items-center justify-center/);
  assert.match(read('src/components/common/Input.jsx'), /min-w-11/);
  assert.ok((read('src/components/common/SearchFilter.jsx').match(/className="min-h-11 text-sm/g)?.length || 0) >= 2);
  assert.match(read('src/components/layout/Footer.jsx'), /inline-flex min-h-11 items-center/g);
});

test('desktop footer reserves the fixed assistant action area', () => {
  assert.match(read('src/components/layout/Footer.jsx'), /md:pr-44/);
  assert.match(read('src/components/common/AIChatbot.jsx'), /sm:bottom-6 sm:right-6/);
});

test('desktop navigation keeps primary links and actions at 44px minimum height', () => {
  const navbar = read('src/components/layout/Navbar.jsx');
  assert.match(navbar, /inline-flex min-h-11 items-center text-sm font-medium/);
  assert.match(navbar, /inline-flex min-h-11 items-center px-1 text-sm font-semibold/);
  assert.match(navbar, /btn btn-primary btn-sm min-h-11/);
  assert.ok((navbar.match(/flex min-h-11 min-w-11 items-center justify-center/g)?.length || 0) >= 5);
});
