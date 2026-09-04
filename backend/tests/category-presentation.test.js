import test from 'node:test';
import assert from 'node:assert/strict';
import { fallbackCategoryIcon, normalizeCategoryIcon } from '../utils/categoryPresentation.js';

test('deterministic category icons cover common lost-item categories', () => {
  assert.equal(fallbackCategoryIcon('Cat'), '🐱');
  assert.equal(fallbackCategoryIcon('DOG'), '🐶');
  assert.equal(fallbackCategoryIcon('keys'), '🔑');
  assert.equal(fallbackCategoryIcon('custom physical item'), '📦');
});

test('provider category icons retain one valid emoji and reject plain text', () => {
  assert.equal(normalizeCategoryIcon('Suggested: 🐱 cat'), '🐱');
  assert.equal(normalizeCategoryIcon('not-an-emoji'), '📦');
});
