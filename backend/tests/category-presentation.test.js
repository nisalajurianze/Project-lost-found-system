import test from 'node:test';
import assert from 'node:assert/strict';
import { fallbackCategoryIcon, normalizeCategoryIcon } from '../utils/categoryPresentation.js';
import { cleanCategoryName } from '../services/categoryResolutionService.js';

test('deterministic category icons cover common lost-item categories', () => {
  assert.equal(fallbackCategoryIcon('Cat'), '🐱');
  assert.equal(fallbackCategoryIcon('DOG'), '🐶');
  assert.equal(fallbackCategoryIcon('keys'), '🔑');
  assert.equal(fallbackCategoryIcon('battry'), '🔋');
  assert.equal(fallbackCategoryIcon('USB microphone'), '🎙️');
  assert.equal(fallbackCategoryIcon('phone accessories'), '📱');
  assert.equal(fallbackCategoryIcon('custom physical item'), '📦');
});

test('provider category icons retain one valid emoji and reject plain text', () => {
  assert.equal(normalizeCategoryIcon('Suggested: 🐱 cat'), '🐱');
  assert.equal(normalizeCategoryIcon('not-an-emoji'), '📦');
});

test('user category names are normalized and bounded before creation', () => {
  assert.equal(cleanCategoryName('  Cat\t accessories  '), 'Cat accessories');
  assert.equal(cleanCategoryName('ＡＢＣ'), 'ABC');
  assert.equal(cleanCategoryName('x'.repeat(120)).length, 100);
});
