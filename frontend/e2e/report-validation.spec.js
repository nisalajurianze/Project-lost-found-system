import { test, expect } from '@playwright/test';

if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });

for (const mode of ['lost', 'found']) {
  test(`${mode} report recovers a stale public draft and shows server field errors before retry`, async ({ page }, testInfo) => {
    const user = { _id: '507f1f77bcf86cd799439011', fullName: 'Report Test', phone: '0771234567', studentId: 'TEST-01', role: 'student', isVerified: true };
    const submissions = [];
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.stack || error.message));
    await page.addInitScript(({ mode, userId }) => {
      localStorage.setItem('smart-lf-theme-v2', 'dark');
      localStorage.setItem(`lf-report-draft:${mode}:create:${userId}`, JSON.stringify({ step: 4, form: {
        itemName: 'Headphones', category: 'Electronics', description: 'Black wireless headphones with padded earcups.',
        location: 'SEUSL Main Entrance', date: '2025-09-09T03:21', contactVisibility: 'public', contactPreference: 'both',
      } }));
    }, { mode, userId: user._id });
    await page.route('**/socket.io/**', (route) => route.abort());
    await page.route('**/api/**', async (route) => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      const reply = (data) => route.fulfill({ status: 200, json: { success: true, data } });
      if (pathname === '/api/auth/me') return reply(user);
      if (pathname === '/api/auth/csrf') return reply({ csrfToken: 'test-csrf' });
      if (pathname.startsWith('/api/notifications')) return reply({ notifications: [], unreadCount: 0 });
      if (pathname === '/api/categories') return reply([{ _id: 'category-test', name: 'Electronics', icon: '🎧' }]);
      if (pathname === '/api/ai/report/assess') return reply({ quality: { score: 100, level: 'excellent', suggestions: [] }, duplicates: [] });
      if (pathname === `/api/${mode}-items` && request.method() === 'POST') {
        const form = await new globalThis.Response(request.postDataBuffer(), { headers: { 'content-type': request.headers()['content-type'] } }).formData();
        submissions.push(Object.fromEntries(form));
        if (submissions.length === 1) return route.fulfill({ status: 400, json: {
          success: false, message: 'Validation failed', errors: [{ field: `${mode}Date`, message: 'Please choose an earlier report date.' }],
        } });
        return route.fulfill({ status: 201, json: { success: true, data: { _id: '507f1f77bcf86cd799439012', itemName: 'Headphones' } } });
      }
      if (pathname === `/api/${mode}-items`) return reply({ items: [], pagination: { page: 1, totalPages: 1, totalDocs: 0 } });
      return reply([]);
    });

    await page.goto(`/dashboard/report-${mode}`);
    await expect(page.getByRole('button', { name: 'Submit report', exact: true })).toBeVisible();
    const visibility = page.locator('#contactVisibility');
    await expect(visibility).toHaveValue('request_only');
    await expect(visibility.locator('option[value="public"]')).toHaveCount(0);
    await page.getByRole('button', { name: 'Submit report', exact: true }).click();
    await expect(page.getByRole('alert').getByText('Please choose an earlier report date.', { exact: true })).toBeVisible();
    expect(submissions[0].contactVisibility).toBe('request_only');

    const date = page.locator('input[name="date"]');
    await expect(date).toBeVisible();
    await expect(date).toHaveValue('2025-09-09T03:21');
    await expect(date).toHaveCSS('color-scheme', 'dark');
    await date.evaluate((input) => input.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await date.screenshot({ path: testInfo.outputPath('date-dark-error.png') });
    await date.focus();
    await expect(date).toBeFocused();
    await date.screenshot({ path: testInfo.outputPath('date-dark-focus.png') });
    await page.evaluate(() => document.documentElement.classList.remove('dark'));
    await date.screenshot({ path: testInfo.outputPath('date-light-error.png') });
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await date.fill('2025-09-08T03:21');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('button', { name: 'Submit report', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/dashboard/my-${mode}$`));
    expect(submissions).toHaveLength(2);
    expect(submissions[1].contactVisibility).toBe('request_only');
    expect(pageErrors).toEqual([]);
  });
}
