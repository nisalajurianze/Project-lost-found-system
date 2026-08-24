# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.js >> Smart Lost & Found - Web App Smoke Suite >> 1. Public homepage loads cleanly without uncaught errors
- Location: e2e\smoke.spec.js:5:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:3000/
Call log:
  - navigating to "http://127.0.0.1:3000/", waiting until "load"

```

# Test source

```ts
  1   | ﻿import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Smart Lost & Found - Web App Smoke Suite', () => {
  4   | 
  5   |   test('1. Public homepage loads cleanly without uncaught errors', async ({ page }) => {
  6   |     const errors = [];
  7   |     page.on('pageerror', (err) => errors.push(err.message));
  8   | 
> 9   |     const response = await page.goto('/');
      |                                 ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:3000/
  10  |     expect(response?.status()).toBe(200);
  11  |     await expect(page).toHaveTitle(/Smart Lost & Found|Lost and Found/i);
  12  | 
  13  |     // Verify main content area is visible
  14  |     const mainHeading = page.getByRole('heading', { level: 1 }).first();
  15  |     await expect(mainHeading).toBeVisible();
  16  | 
  17  |     // Verify no critical JavaScript uncaught exceptions
  18  |     const criticalErrors = errors.filter(e => !e.includes('ResizeObserver'));
  19  |     expect(criticalErrors).toHaveLength(0);
  20  |   });
  21  | 
  22  |   test('2. Public login and registration routes render cleanly', async ({ page }) => {
  23  |     await page.goto('/login');
  24  |     await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
  25  |     await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
  26  |     await expect(page.getByRole('button', { name: /sign in|login/i })).toBeVisible();
  27  | 
  28  |     await page.goto('/register');
  29  |     await expect(page.locator('input[name="fullName"], input[type="text"]').first()).toBeVisible();
  30  |   });
  31  | 
  32  |   test('3. Protected dashboard route safely redirects unauthenticated visitors', async ({ page }) => {
  33  |     await page.goto('/dashboard');
  34  |     await page.waitForURL(/\/login/);
  35  |     expect(page.url()).toContain('/login');
  36  |   });
  37  | 
  38  |   test('4. CSRF endpoint issues token and sets accessible cookie', async ({ request }) => {
  39  |     const response = await request.get('/api/auth/csrf');
  40  |     expect(response.status()).toBe(200);
  41  |     const data = await response.json();
  42  |     expect(data.success).toBe(true);
  43  |     expect(data.data.csrfToken).toBeTruthy();
  44  |     expect(typeof data.data.csrfToken).toBe('string');
  45  |   });
  46  | 
  47  |   test('5. Socket.IO polling endpoint does not return SPA index.html', async ({ request }) => {
  48  |     const response = await request.get('/socket.io/?EIO=4&transport=polling');
  49  |     // Socket.io polling should return 200 or 400 with engine.io packet, never <!DOCTYPE html>
  50  |     const text = await response.text();
  51  |     expect(text).not.toContain('<!DOCTYPE html>');
  52  |     expect(text).not.toContain('<div id="root">');
  53  |   });
  54  | 
  55  |   test('6. Mobile viewport renders without horizontal overflow', async ({ page }) => {
  56  |     await page.setViewportSize({ width: 390, height: 844 });
  57  |     await page.goto('/');
  58  |     await page.waitForLoadState('domcontentloaded');
  59  | 
  60  |     const hasHorizontalScrollbar = await page.evaluate(() => {
  61  |       return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  62  |     });
  63  |     expect(hasHorizontalScrollbar).toBe(false);
  64  |   });
  65  | 
  66  |   test('7. End-to-end Login, Session Validation, Dashboard & Logout flow', async ({ page, request }) => {
  67  |     const testEmail = process.env.E2E_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'ci-admin@example.com';
  68  |     const testPassword = process.env.E2E_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  69  | 
  70  |     // Skip full auth submission if running in a dry environment without test credentials
  71  |     test.skip(!testPassword, 'Skipping auth execution: set E2E_ADMIN_PASSWORD to run full login test');
  72  | 
  73  |     // 1. Obtain CSRF token
  74  |     const csrfRes = await request.get('/api/auth/csrf');
  75  |     expect(csrfRes.status()).toBe(200);
  76  | 
  77  |     // 2. Perform UI Login
  78  |     await page.goto('/login');
  79  |     await page.locator('input[type="email"], input[name="email"]').fill(testEmail);
  80  |     await page.locator('input[type="password"], input[name="password"]').fill(testPassword);
  81  |     await page.getByRole('button', { name: /sign in|login/i }).click();
  82  | 
  83  |     // 3. Confirm navigation to dashboard
  84  |     await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  85  |     expect(page.url()).toContain('/dashboard');
  86  | 
  87  |     // 4. Validate /api/auth/me succeeds with cookie authentication
  88  |     const meRes = await request.get('/api/auth/me');
  89  |     expect(meRes.status()).toBe(200);
  90  |     const meJson = await meRes.json();
  91  |     expect(meJson.success).toBe(true);
  92  |     expect(meJson.data.email).toBe(testEmail.toLowerCase());
  93  | 
  94  |     // 5. Logout
  95  |     const logoutBtn = page.getByRole('button', { name: /logout|sign out/i }).first();
  96  |     if (await logoutBtn.isVisible()) {
  97  |       await logoutBtn.click();
  98  |       await page.waitForURL(/\/login|\/$/);
  99  |     }
  100 |   });
  101 | 
  102 | });
  103 | 
```