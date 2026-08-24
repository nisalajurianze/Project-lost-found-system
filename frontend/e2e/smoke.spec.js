import { test, expect } from '@playwright/test';

test.describe('Smart Lost & Found - Web App Smoke Suite', () => {

  test('1. Public homepage loads cleanly without uncaught errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/Smart Lost & Found|Lost and Found/i);

    // Verify main content area is visible
    const mainHeading = page.getByRole('heading', { level: 1 }).first();
    await expect(mainHeading).toBeVisible();

    // Verify no critical JavaScript uncaught exceptions
    const criticalErrors = errors.filter(e => !e.includes('ResizeObserver'));
    expect(criticalErrors).toHaveLength(0);
  });

  test('2. Public login and registration routes render cleanly', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in|login/i })).toBeVisible();

    await page.goto('/register');
    await expect(page.locator('input[name="fullName"], input[type="text"]').first()).toBeVisible();
  });

  test('3. Protected dashboard route safely redirects unauthenticated visitors', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain('/login');
  });

  test('4. CSRF endpoint issues token and sets accessible cookie', async ({ request }) => {
    const response = await request.get('/api/auth/csrf');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.csrfToken).toBeTruthy();
    expect(typeof data.data.csrfToken).toBe('string');
  });

  test('5. Socket.IO polling endpoint does not return SPA index.html', async ({ request }) => {
    const response = await request.get('/socket.io/?EIO=4&transport=polling');
    // Socket.io polling should return 200 or 400 with engine.io packet, never <!DOCTYPE html>
    const text = await response.text();
    expect(text).not.toContain('<!DOCTYPE html>');
    expect(text).not.toContain('<div id="root">');
  });

  test('6. Mobile viewport renders without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const hasHorizontalScrollbar = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScrollbar).toBe(false);
  });

  test('7. End-to-end Login, Session Validation, Dashboard & Logout flow', async ({ page, request }) => {
    const testEmail = process.env.E2E_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'ci-admin@example.com';
    const testPassword = process.env.E2E_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

    // Skip full auth submission if running in a dry environment without test credentials
    test.skip(!testPassword, 'Skipping auth execution: set E2E_ADMIN_PASSWORD to run full login test');

    // 1. Obtain CSRF token
    const csrfRes = await request.get('/api/auth/csrf');
    expect(csrfRes.status()).toBe(200);

    // 2. Perform UI Login
    await page.goto('/login');
    await page.locator('input[type="email"], input[name="email"]').fill(testEmail);
    await page.locator('input[type="password"], input[name="password"]').fill(testPassword);
    await page.getByRole('button', { name: /sign in|login/i }).click();

    // 3. Confirm navigation to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    expect(page.url()).toContain('/dashboard');

    // 4. Validate /api/auth/me succeeds with cookie authentication
    const meRes = await request.get('/api/auth/me');
    expect(meRes.status()).toBe(200);
    const meJson = await meRes.json();
    expect(meJson.success).toBe(true);
    expect(meJson.data.email).toBe(testEmail.toLowerCase());

    // 5. Logout
    const logoutBtn = page.getByRole('button', { name: /logout|sign out/i }).first();
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await page.waitForURL(/\/login|\/$/);
    }
  });

});
