import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalCategoryName, findEquivalentCategory } from '../utils/categoryIdentity.js';
import Category from '../models/Category.js';
import { resolveOrCreateUserCategory } from '../services/categoryResolutionService.js';
import { autoCreateCategory } from '../controllers/categoryController.js';

const tablet = { _id: 'tablet', name: 'Tablet', isActive: true };
test('plural, breadcrumb and unicode category aliases reuse Tablet', () => {
  for (const name of ['Tablets', 'Electronics > Tablets', 'Electronics › Tablet computers', ' ＴＡＢＬＥＴＳ ']) {
    assert.equal(findEquivalentCategory(name, [tablet]), tablet);
    assert.equal(canonicalCategoryName(name), 'Tablet');
  }
});
test('canonical flat category wins over legacy breadcrumb duplicates', () => {
  const duplicate = { name: 'Electronics > Tablets', isActive: true };
  assert.equal(findEquivalentCategory(duplicate.name, [duplicate, tablet]), tablet);
  assert.equal(findEquivalentCategory('Tablet', [{ name: 'Tablets' }]).name, 'Tablets');
});
test('modifiers, inactive categories and unrelated words are not merged', () => {
  for (const name of ['Tablet cases', 'Tablet chargers', 'Table', 'Medicine']) {
    assert.equal(findEquivalentCategory(name, [tablet]), null);
  }
  assert.equal(findEquivalentCategory('Tablets', [{ ...tablet, isActive: false }]), null);
  assert.equal(canonicalCategoryName('Audio > Microphones'), 'Microphone');
  assert.equal(canonicalCategoryName('Batteries'), 'Battery');
});
test('report submission returns the existing category without creating a duplicate', async (t) => {
  t.mock.method(Category, 'find', async () => [tablet]);
  t.mock.method(Category, 'create', async () => { throw new Error('Duplicate category creation attempted'); });
  assert.equal(await resolveOrCreateUserCategory('Electronics > Tablets'), tablet);
});
test('photo category endpoint maps the existing category before any AI or creation', async (t) => {
  t.mock.method(Category, 'find', async () => [tablet]);
  t.mock.method(Category, 'create', async () => { throw new Error('Duplicate category creation attempted'); });
  const body = await new Promise((resolve, reject) => {
    const res = { status(code) { assert.equal(code, 200); return this; }, json: resolve };
    autoCreateCategory({ body: { name: 'Electronics > Tablets' } }, res, reject);
  });
  assert.equal(body.data._id, tablet._id);
  assert.equal(body.data.name, 'Tablet');
});
