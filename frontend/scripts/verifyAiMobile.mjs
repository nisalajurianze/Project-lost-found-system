import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { chromium } from 'playwright';

const baseUrl = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
const systemBrowser = [process.env.PLAYWRIGHT_BROWSER_PATH, 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].find((candidate) => candidate && fs.existsSync(candidate));
const browser = await chromium.launch({ headless: true, ...(systemBrowser ? { executablePath: systemBrowser } : {}) });
const evidence = [];

try {
  for (const viewport of [{ name: 'desktop', width: 1280, height: 800 }, { name: 'mobile', width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    await page.addInitScript(() => window.localStorage.setItem('lf-language', 'ta'));
    const runtimeErrors = [];
    const unavailableBackendResources = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      if (/Failed to load resource: the server responded with a status of (?:401|502)/u.test(message.text())) unavailableBackendResources.push(message.text());
      else runtimeErrors.push(message.text());
    });
    await page.route('**/api/**', async (route) => {
      if (new URL(route.request().url()).pathname.endsWith('/auth/me')) {
        await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Signed out test fixture' }) });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            _id: 'browser-verification-user', role: 'user', fullName: 'Browser Verification', phone: '0770000000', studentId: 'SEU-TEST-001',
            items: [], lostItems: [], foundItems: [], notifications: [], categories: [], unreadCount: 0,
            completedRecoveries: 0, activeAccounts: 0, matchSuggestions: 0,
            pagination: { page: 1, pages: 1, total: 0, totalPages: 1, totalDocs: 0 },
          },
        }),
      });
    });
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(900);
    assert.ok((await page.locator('body').innerText()).trim().length > 100, `${viewport.name}: page is blank`);
    assert.equal(await page.locator('.vite-error-overlay, #webpack-dev-server-client-overlay').count(), 0, `${viewport.name}: framework error overlay`);

    assert.equal(await page.locator('html').getAttribute('data-language'), 'ta', `${viewport.name}: Tamil locale was not applied`);

    const overflow = await page.evaluate(() => ({ viewport: window.innerWidth, body: document.body.scrollWidth, root: document.documentElement.scrollWidth }));
    assert.ok(overflow.body <= overflow.viewport + 1 && overflow.root <= overflow.viewport + 1, `${viewport.name}: horizontal overflow ${JSON.stringify(overflow)}`);

    if (viewport.name === 'mobile') {
      await page.getByRole('button', { name: /Smart L&F/u }).last().click();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor({ state: 'visible' });
      const box = await dialog.boundingBox();
      assert.ok(box && box.width <= viewport.width + 1 && box.x >= -1, `mobile: assistant exceeds viewport ${JSON.stringify(box)}`);
      const dialogText = await dialog.innerText();
      assert.match(dialogText, /Smart L&F/u);
      assert.doesNotMatch(dialogText, /Lost Something|Found an Item|Library Area|My Activity|Suggested Inquiries/u, 'mobile: Tamil assistant contains English starter copy');
      const screenshot = path.join(os.tmpdir(), 'smart-lf-ai-mobile-verification.png');
      await page.screenshot({ path: screenshot, fullPage: false });
      evidence.push({ viewport: viewport.name, overflow, dialog: box, screenshot, unavailableBackendResources: unavailableBackendResources.length });
    } else evidence.push({ viewport: viewport.name, overflow, unavailableBackendResources: unavailableBackendResources.length });

    assert.deepEqual(runtimeErrors, [], `${viewport.name}: runtime console errors: ${runtimeErrors.join(' | ')}`);
    await page.close();
  }
  console.log(JSON.stringify({ passed: true, baseUrl, evidence }, null, 2));
} finally {
  await browser.close();
}
