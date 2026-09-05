import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isSafeInternalPath, toSafeInternalPath } from '../src/utils/internalNavigation.js';
import { isChunkLoadError, shouldRetryChunkLoad } from '../src/utils/lazyWithRetry.js';
import { resolveApiBaseUrl } from '../src/utils/apiBaseUrl.js';

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

test('multilingual navigation stays compact until the wider desktop breakpoint', () => {
  const navbar = read('src/components/layout/Navbar.jsx');
  const mobile = read('src/components/layout/MobileBottomNav.jsx');
  const publicLayout = read('src/components/layout/PublicLayout.jsx');
  assert.match(navbar, /desktopNavigationVisibility = language === 'en'/);
  assert.match(navbar, /'hidden 2xl:flex'/);
  assert.match(navbar, /'flex 2xl:hidden'/);
  assert.match(mobile, /responsiveVisibility = language === 'en'/);
  assert.match(mobile, /'2xl:hidden'/);
  assert.match(publicLayout, /'2xl:pb-0'/);
});

test('home listing headers stack before long translated actions can overflow mobile', () => {
  const home = read('src/pages/public/Home.jsx');
  assert.match(home, /flex flex-col items-start gap-3 sm:flex-row/);
  assert.match(home, /inline-flex min-h-11 max-w-full items-center/);
});

test('footer links use one bounded column before translated labels can overflow mobile', () => {
  const footer = read('src/components/layout/Footer.jsx');
  assert.match(footer, /max-w-sm grid-cols-1/);
  assert.match(footer, /sm:grid-cols-2/);
  assert.doesNotMatch(footer, /transition-colors whitespace-nowrap/);
});

test('public search and authentication secondary actions expose 44px hit targets', () => {
  const search = read('src/pages/public/SearchItems.jsx');
  const login = read('src/pages/public/Login.jsx');
  const register = read('src/pages/public/Register.jsx');
  assert.match(search, /btn btn-outline btn-sm min-h-11/);
  assert.match(search, /btn btn-primary btn-sm min-h-11/);
  assert.doesNotMatch(search, /min-h-9/);
  assert.match(login, /inline-flex min-h-11 items-center cursor-pointer select-none/);
  assert.match(register, /inline-flex min-h-11 items-center px-1 font-bold/);
  assert.match(login, /role="separator" aria-label=\{t\('auth\.or'\)\}/);
  assert.match(register, /role="separator" aria-label=\{t\('auth\.or'\)\}/);
  assert.match(read('src/components/layout/Footer.jsx'), /text-xs text-surface-600 dark:text-surface-400/);
  assert.match(read('src/pages/public/Home.jsx'), /mt-1 text-sm text-surface-600 dark:text-surface-400/);
});

test('Vercel API requests use the cookie-preserving proxy despite stale deployment variables', () => {
  const configuredUrl = 'https://backend.up.railway.app/api';
  for (const hostname of ['smart-lost-and-found-system.vercel.app', 'preview-123.vercel.app']) {
    assert.equal(resolveApiBaseUrl({ configuredUrl, hostname, isProduction: true }), '/api');
  }
  assert.equal(resolveApiBaseUrl({ configuredUrl, hostname: 'localhost', isProduction: false }), configuredUrl);
  assert.equal(resolveApiBaseUrl({ configuredUrl, hostname: 'example.com', isProduction: true }), configuredUrl);
  assert.equal(resolveApiBaseUrl({ hostname: 'localhost', isProduction: false }), '/api');
});
