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

  for (const language of ['en', 'si', 'ta']) assert.ok(translations[language]?.['report.categoryFallback']);
  assert.match(wizard, /if \(firstSuggestion\.category\) await ensureCategory\(firstSuggestion\.category, firstSuggestion\.categoryIcon\)/);
  assert.doesNotMatch(wizard, /firstSuggestion && !form\.itemName && !form\.description/);
  assert.match(wizard, /report\.categoryFallback/);
  assert.match(service, /categories\/report-auto-create/);
  assert.match(service, /timeout: 20_000/);
  assert.doesNotMatch(wizard, /images: undefined/);
  assert.match(wizard, /Object\.values\(errors\)\.some\(Boolean\)/);
  assert.match(route, /reportAutoCreateLimiter/);
  assert.match(controller, /normalizeCategoryIcon/);
});
