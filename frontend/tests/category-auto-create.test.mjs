import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(frontend, relative), 'utf8');

test('photo suggestions auto-resolve categories without blocking report submission', async () => {
  const { translations } = await import('../src/i18n/translations.js');
  const wizard = read('src/components/common/ReportItemWizard.jsx');
  const service = read('src/services/aiService.js');
  const route = fs.readFileSync(path.join(frontend, '../backend/routes/categoryRoutes.js'), 'utf8');
  const controller = fs.readFileSync(path.join(frontend, '../backend/controllers/categoryController.js'), 'utf8');

  for (const language of ['en', 'si', 'ta']) assert.ok(translations[language]?.['report.customCategoryPending']);
  assert.match(wizard, /if \(firstSuggestion\.category\) await ensureCategory\(firstSuggestion\.category, firstSuggestion\.categoryIcon\)/);
  assert.doesNotMatch(wizard, /firstSuggestion && !form\.itemName && !form\.description/);
  assert.match(wizard, /setExtraCategory\(\{ value: candidate, label:/);
  assert.match(wizard, /report\.customCategoryPending/);
  assert.doesNotMatch(wizard, /available\.find\(\(entry\) => entry\.name\?\.toLocaleLowerCase\(\) === 'other'\)/);
  assert.match(service, /categories\/report-auto-create/);
  assert.match(service, /timeout: 20_000/);
  assert.doesNotMatch(wizard, /images: undefined/);
  assert.match(wizard, /Object\.values\(errors\)\.some\(Boolean\)/);
  assert.match(route, /reportAutoCreateLimiter/);
  assert.match(controller, /normalizeCategoryIcon/);
});

test('final report submission resolves or creates a user-entered category', () => {
  const resolver = fs.readFileSync(path.join(frontend, '../backend/services/categoryResolutionService.js'), 'utf8');
  const lostController = fs.readFileSync(path.join(frontend, '../backend/controllers/lostItemController.js'), 'utf8');
  const foundController = fs.readFileSync(path.join(frontend, '../backend/controllers/foundItemController.js'), 'utf8');
  const validators = fs.readFileSync(path.join(frontend, '../backend/utils/validators.js'), 'utf8');

  assert.match(resolver, /fallbackCategoryIcon\(name\)/);
  assert.match(resolver, /deleteCache\('categories:all'\)/);
  assert.match(lostController, /resolveOrCreateUserCategory\(name\)/);
  assert.match(foundController, /resolveOrCreateUserCategory\(name\)/);
  assert.match(validators, /Category name cannot exceed 100 characters/g);
});
