import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolveItemId, requireItemId } from '../src/utils/itemId.js';

const read = (relative) => fs.readFileSync(new URL(`../${relative}`, import.meta.url), 'utf8');

test('found item identifiers support API and normalized response shapes', () => {
  assert.equal(resolveItemId({ _id: 'mongo-id' }), 'mongo-id');
  assert.equal(resolveItemId({ id: 'normalized-id' }), 'normalized-id');
  assert.equal(resolveItemId('  direct-id  '), 'direct-id');
  assert.equal(resolveItemId(undefined), '');
  assert.equal(resolveItemId({}), '');
});

test('invalid identifiers are rejected before a found-item API URL is built', () => {
  assert.throws(() => requireItemId(undefined), /Invalid item ID/);
  assert.throws(() => requireItemId({}), /Invalid item ID/);

  const service = read('src/services/foundItemService.js');
  assert.match(service, /const targetId = requireItemId\(id\);\s*const res = await api\.delete\(`\/found-items\/\$\{targetId\}`\)/);
});

test('my found listings resolves the selected record before opening delete confirmation', () => {
  const page = read('src/pages/user/MyFoundItems.jsx');
  const slice = read('src/redux/slices/foundItemSlice.js');

  assert.match(page, /const itemId = resolveItemId\(item\)/);
  assert.match(page, /if \(!itemId\)[\s\S]*?return;[\s\S]*?setDeleteId\(itemId\)/);
  assert.match(page, /onClick=\{\(\) => handleDeleteClick\(item\)\}/);
  assert.match(page, /if \(!deleteId\)[\s\S]*?setDeleteDialogOpen\(false\);[\s\S]*?return;/);
  assert.match(slice, /state\.items = state\.items\.filter\(item => resolveItemId\(item\) !== action\.payload\)/);
});
