import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(frontend, relative), 'utf8');

test('shared loading navigation and dashboard setup controls have complete trilingual keys', async () => {
  const { translations } = await import('../src/i18n/translations.js');
  const prefixes = ['common.', 'aiLoading.', 'loader.', 'profileCompletion.'];
  const explicitDashboardKeys = [
    'dashboard.refreshError', 'dashboard.installSuccess', 'dashboard.pushSuccess', 'dashboard.pushError',
    'dashboard.profileSetupTitle', 'dashboard.installTitle', 'dashboard.pushTitle', 'dashboard.iosTitle',
  ];
  const keys = Object.keys(translations.en).filter((key) => prefixes.some((prefix) => key.startsWith(prefix)) || explicitDashboardKeys.includes(key));
  for (const language of ['si', 'ta']) assert.deepEqual(keys.filter((key) => !translations[language]?.[key]), []);
});

test('dashboard and profile completion use localized accessible controls without raw toast copy', () => {
  const dashboard = read('src/pages/user/Dashboard.jsx');
  const profile = read('src/components/modals/ProfileCompletionModal.jsx');
  assert.match(dashboard, /dashboard\.iosStep1/);
  assert.match(dashboard, /<Modal isOpen=\{showIosPrompt\}/);
  assert.match(dashboard, /dashboard\.accountTotals/);
  assert.doesNotMatch(dashboard, /toast\.(success|error)\(['"]/);
  assert.match(profile, /<Modal/);
  assert.match(profile, /profileCompletion\.choosePicture/);
  assert.match(profile, /autoComplete="tel"/);
  assert.doesNotMatch(profile, /Complete Your Profile|Profile completed successfully|Please select an image file/);
});

test('shared controls remove fake AI percentage progress and localize accessibility labels', () => {
  const aiToast = read('src/components/common/AILoadingToast.jsx');
  const loader = read('src/components/common/Loader.jsx');
  const select = read('src/components/common/Select.jsx');
  const scroll = read('src/components/common/ScrollToTopButton.jsx');
  const navbar = read('src/components/layout/Navbar.jsx');
  const itemCard = read('src/components/cards/ItemCard.jsx');
  assert.doesNotMatch(aiToast, /setInterval|Math\.floor\(progress\)|95%/);
  assert.match(aiToast, /aiLoading\.extracting/);
  assert.match(loader, /loader\.application/);
  assert.match(select, /common\.required/);
  assert.match(scroll, /common\.scrollTop/);
  assert.match(navbar, /common\.toggleAdminMenu/);
  assert.match(itemCard, /common\.feedback/);
});
