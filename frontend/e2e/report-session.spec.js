import { test, expect } from '@playwright/test';
import { Buffer } from 'node:buffer';

if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });

const user = { _id: 'session-test-user', fullName: 'Session Test', email: 'session@example.test', phone: '0771234567', studentId: 'SEU-2026-TEST', role: 'student', isVerified: true };

const setupReport = async (page, { refreshSucceeds, providerUnavailable = false }) => {
  const requests = { uploads: 0, refreshes: 0, multipartBodies: [], uploadUrls: [] };
  await page.route('**/socket.io/**', (route) => route.abort());
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const reply = (status, data, message = '') => route.fulfill({ status, json: { success: status === 200, data, message } });
    if (pathname === '/api/auth/me') return reply(200, user);
    if (pathname === '/api/auth/csrf') return reply(200, { csrfToken: 'test-csrf' });
    if (pathname === '/api/auth/refresh-token') {
      requests.refreshes += 1;
      return reply(refreshSucceeds ? 200 : 401, {}, 'Session expired');
    }
    if (pathname === '/api/ai/suggest-details') {
      requests.uploads += 1;
      requests.uploadUrls.push(request.url());
      requests.multipartBodies.push(request.postDataBuffer());
      if (providerUnavailable) return reply(503, {}, 'AI image suggestions are temporarily unavailable.');
      if (requests.uploads === 1) return reply(401, {}, 'Access token expired.');
      return reply(200, { isSpam: false, itemName: 'Red striped bag', category: '', description: 'A red bag with dark stripes.', moderationDecision: 'allow', privacyWarnings: [], redactionRegions: [] });
    }
    return reply(200, []);
  });
  await page.goto('/dashboard/report-lost');
  await expect(page.locator('#image-upload-input')).toBeAttached();
  const image = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#eeeeee';
    ctx.fillRect(0, 0, 800, 800);
    for (let y = 100; y < 700; y += 40) {
      ctx.fillStyle = y % 80 === 20 ? '#dc2626' : '#202020';
      ctx.fillRect(160, y, 480, 40);
    }
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.locator('#image-upload-input').setInputFiles({ name: 'bag.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') });
  return requests;
};

test('expired upload session refreshes once and retries the image successfully', async ({ page }) => {
  const requests = await setupReport(page, { refreshSucceeds: true });
  await expect(page.locator('#ai-suggestion-title')).toBeVisible();
  await expect(page.getByText('Red striped bag', { exact: true })).toBeVisible();
  expect(requests.refreshes).toBe(1);
  expect(requests.uploads).toBe(2);
  expect(requests.uploadUrls).toEqual(Array(2).fill(`${new URL(page.url()).origin}/api/ai/suggest-details`));
  const imageParts = requests.multipartBodies.map((body) => {
    expect(body.toString()).toContain('name="image"');
    expect(body.toString()).toContain('Content-Type: image/png');
    return body.subarray(body.indexOf('\r\n\r\n') + 4, body.lastIndexOf('\r\n--'));
  });
  expect(imageParts[0].length).toBeGreaterThan(100);
  expect(imageParts[1].equals(imageParts[0])).toBe(true);
  await expect(page).toHaveURL(/\/dashboard\/report-lost$/);
});

test('failed upload session refresh returns the protected report to login', async ({ page }) => {
  const requests = await setupReport(page, { refreshSucceeds: false });
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('input[type="password"]')).toBeVisible();
  expect(requests.refreshes).toBe(1);
  expect(requests.uploads).toBe(1);
});

test('provider outage finishes image preparation and offers manual review', async ({ page }) => {
  const requests = await setupReport(page, { providerUnavailable: true });
  await expect(page.locator('#image-privacy-review-title')).toBeVisible();
  await expect(page.getByText(/Preparing images/)).toHaveCount(0);
  await expect(page.locator('#ai-suggestion-title')).toHaveCount(0);
  await expect(page.locator('[aria-labelledby="image-privacy-review-title"] button')).toBeVisible();
  expect(requests.uploads).toBe(1);
  expect(requests.refreshes).toBe(0);
});
