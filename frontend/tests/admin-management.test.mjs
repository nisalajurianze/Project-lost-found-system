import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(frontend, relative), 'utf8');

test('user administration is trilingual and describes privacy-safe anonymisation truthfully', async () => {
  const { translations } = await import('../src/i18n/translations.js');
  const keys = Object.keys(translations.en).filter((key) => key.startsWith('users.'));
  assert.ok(keys.length >= 40);
  for (const language of ['si', 'ta']) assert.deepEqual(keys.filter((key) => !translations[language]?.[key]), []);
  const page = read('src/pages/admin/ManageUsers.jsx');
  const service = read('src/services/adminService.js');
  assert.match(page, /useLanguage/);
  assert.match(page, /users\.anonymizeMessage/);
  assert.match(page, /users\.lastAdminError/);
  assert.doesNotMatch(page, /permanently deleted/i);
  assert.match(service, /Privacy-safe account anonymisation/);
});

test('category administration reports delete-versus-deactivate outcomes from the server response', async () => {
  const { translations } = await import('../src/i18n/translations.js');
  const keys = Object.keys(translations.en).filter((key) => key.startsWith('categories.'));
  assert.ok(keys.length >= 25);
  for (const language of ['si', 'ta']) assert.deepEqual(keys.filter((key) => !translations[language]?.[key]), []);
  const page = read('src/pages/admin/ManageCategories.jsx');
  const slice = read('src/redux/slices/categorySlice.js');
  assert.match(page, /categories\.deactivatedSuccess/);
  assert.match(page, /result\.category\?\.isActive === false/);
  assert.match(slice, /category: result\.data \|\| null/);
  assert.match(slice, /action\.payload\.id/);
});

test('lost and found administrator moderation shares trilingual archive semantics', async () => {
  const { translations } = await import('../src/i18n/translations.js');
  const keys = Object.keys(translations.en).filter((key) => key.startsWith('reportAdmin.'));
  assert.ok(keys.length >= 25);
  for (const language of ['si', 'ta']) assert.deepEqual(keys.filter((key) => !translations[language]?.[key]), []);
  const shared = read('src/components/admin/AdminReportModeration.jsx');
  const lost = read('src/pages/admin/ManageLostItems.jsx');
  const found = read('src/pages/admin/ManageFoundItems.jsx');
  const backendLost = fs.readFileSync(path.join(frontend, '../backend/controllers/lostItemController.js'), 'utf8');
  const backendFound = fs.readFileSync(path.join(frontend, '../backend/controllers/foundItemController.js'), 'utf8');
  assert.match(shared, /reportAdmin\.lostArchiveMessage/);
  assert.match(shared, /reportAdmin\.foundArchiveMessage/);
  assert.match(shared, /in_progress/);
  assert.match(lost, /AdminReportModeration type="lost"/);
  assert.match(found, /AdminReportModeration type="found"/);
  assert.match(backendLost, /isArchived: true, status: 'closed'/);
  assert.match(backendFound, /isArchived: true/);
  assert.doesNotMatch(shared, /permanently delete/i);
});

test('site settings are trilingual and anti-abuse thresholds remain human-review-only', async () => {
  const { translations } = await import('../src/i18n/translations.js');
  const keys = Object.keys(translations.en).filter((key) => key.startsWith('settings.'));
  assert.ok(keys.length >= 35);
  for (const language of ['si', 'ta']) assert.deepEqual(keys.filter((key) => !translations[language]?.[key]), []);
  const page = read('src/pages/admin/SiteSettings.jsx');
  const controller = fs.readFileSync(path.join(frontend, '../backend/controllers/claimController.js'), 'utf8');
  const policy = fs.readFileSync(path.join(frontend, '../backend/services/claimRiskPolicy.js'), 'utf8');
  assert.match(page, /useLanguage/);
  assert.match(page, /settings\.abuseNotice/);
  assert.match(page, /advisory human-review risk signal/);
  assert.doesNotMatch(page, /auto-ban|auto-suspend|instantly ban/i);
  assert.match(controller, /rejectedClaimReviewThreshold/);
  assert.match(policy, /policy:\s*'advisory-only'/);
  assert.doesNotMatch(policy, /isActive\s*=\s*false|status\s*=\s*['"]rejected/);
});

test('ownership claims honour dashboard filters and never present a blank loading area', async () => {
  const { translations } = await import('../src/i18n/translations.js');
  const page = read('src/pages/admin/ManageClaims.jsx');
  const service = read('src/services/claimService.js');

  for (const language of ['en', 'si', 'ta']) {
    assert.ok(translations[language]?.['claims.loading']);
  }
  assert.match(page, /useSearchParams/);
  assert.match(page, /searchParams\.get\('status'\)/);
  assert.match(page, /searchParams\.get\('page'\)/);
  assert.match(page, /t\('claims\.loading'\)/);
  assert.match(page, /handleRetry/);
  assert.match(service, /timeout:\s*20_000/);
});
