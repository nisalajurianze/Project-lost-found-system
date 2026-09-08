import { test, expect } from '@playwright/test';

if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });

test('poster phone opt-in defaults off and option changes revoke the old download', async ({ page }) => {
  const id = '6a9c1b828e518e201dfd3ebb';
  const user = { _id: '6a9c1b828e518e201dfd3ebc', fullName: 'Poster Test', email: 'poster@example.test', phone: '0771234567', role: 'student', isVerified: true };
  const previews = [];
  await page.route('**/socket.io/**', (route) => route.abort());
  await page.route('**/api/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const reply = (data) => route.fulfill({ status: 200, json: { success: true, data } });
    if (pathname === '/api/auth/me') return reply(user);
    if (pathname === '/api/auth/csrf') return reply({ csrfToken: 'test-csrf' });
    if (pathname === `/api/lost-items/${id}`) return reply({ _id: id, itemName: 'Poster test bag', category: 'Bags', description: 'A black bag for testing', userId: user, lostDate: '2026-09-04', lostLocation: 'Canteen', status: 'pending', images: [], createdAt: '2026-09-04', isOwner: true });
    if (pathname.endsWith('/preview')) {
      const body = route.request().postDataJSON();
      previews.push(body);
      return reply({ assetId: 'preview-test', status: 'preview', deepLink: `/lost-items/${id}`, downloadDataUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="1120"/%3E', phoneIncluded: body.includePhone, privacyNotice: body.includePhone ? 'Phone included with permission.' : 'No contact details.' });
    }
    if (pathname.endsWith('/approve')) return reply({ status: 'approved' });
    return reply([]);
  });
  await page.goto(`/lost-items/${id}`);
  const optIn = page.getByRole('checkbox', { name: 'Include my phone number on this poster' });
  await expect(optIn).not.toBeChecked();
  await page.getByRole('button', { name: 'Create preview' }).click();
  await expect(page.getByText('No contact details.', { exact: true })).toBeVisible();
  expect(previews[0].includePhone).toBe(false);
  await page.getByRole('button', { name: 'Approve poster', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Download SVG' })).toBeVisible();
  await optIn.check();
  await expect(page.getByRole('link', { name: 'Download SVG' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Create preview' }).click();
  await expect(page.getByText('Phone included with permission.', { exact: true })).toBeVisible();
  expect(previews[1].includePhone).toBe(true);
  await page.getByRole('button', { name: 'Approve poster', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Download SVG' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Poster language' }).selectOption('si');
  await expect(page.getByRole('link', { name: 'Download SVG' })).toHaveCount(0);
  await optIn.uncheck();
  await page.getByRole('button', { name: 'Create preview' }).click();
  await expect(page.getByText('No contact details.', { exact: true })).toBeVisible();
  expect(previews[2]).toEqual({ language: 'si', includePhone: false });
});
