import test from 'node:test';
import assert from 'node:assert/strict';
import LostItem from '../models/LostItem.js';
import FoundItem from '../models/FoundItem.js';
import User from '../models/User.js';
import PosterAsset from '../models/PosterAsset.js';
import { previewPoster, approvePoster } from '../controllers/posterController.js';

const ownerId = '6a9c1b828e518e201dfd3ebb';
const otherId = '6a9c1b828e518e201dfd3ebc';
const item = { _id: '6a9c1b828e518e201dfd3ebd', userId: ownerId, itemName: 'Bag', category: 'Bags', description: 'Call 0771234567', lostDate: '2026-09-04', images: [] };
const invoke = (handler, { body = {}, user = { _id: ownerId, role: 'user' }, type = 'lost' } = {}) => new Promise((resolve, reject) => {
  handler({ body, user, params: { type, id: item._id } }, { status() { return this; }, json: resolve }, reject);
});

const setup = (t, phone = '0771234567') => {
  t.mock.method(LostItem, 'findById', async () => item);
  t.mock.method(FoundItem, 'findById', async () => item);
  let phoneReads = 0;
  t.mock.method(User, 'findById', (id) => {
    assert.equal(String(id), ownerId);
    phoneReads += 1;
    return { select: () => ({ lean: async () => ({ phone }) }) };
  });
  const assets = [];
  t.mock.method(PosterAsset, 'create', async (value) => { assets.push(value); return { ...value, _id: 'preview-1', status: 'preview' }; });
  return { assets, reads: () => phoneReads };
};

test('poster contact stays private by default, including injected phone fields', async (t) => {
  const state = setup(t);
  const response = await invoke(previewPoster, { body: { phone: '0771234567', contactPhone: '0771234567' } });
  assert.equal(response.data.phoneIncluded, false);
  assert.doesNotMatch(response.data.svg, /0771234567/);
  assert.equal(state.reads(), 0);
  assert.equal(state.assets[0].phoneConsentAt, null);
});

test('explicit owner opt-in renders the profile phone and records consent', async (t) => {
  const state = setup(t, '+94 77 123 4567');
  const response = await invoke(previewPoster, { body: { includePhone: true, phone: '0000000000' } });
  assert.equal(response.data.phoneIncluded, true);
  assert.match(response.data.svg, /Contact: \+94 77 123 4567/);
  assert.doesNotMatch(response.data.svg, /0000000000/);
  assert.equal(state.assets[0].phoneIncluded, true);
  assert.ok(state.assets[0].phoneConsentAt instanceof Date);
  assert.ok(state.assets[0].safeFields.includes('contactPhone'));
  assert.equal(state.assets[0].contactPhone, undefined);
  assert.equal(response.data.status, 'preview');
});

test('admins and other users cannot consent to expose an owner phone', async (t) => {
  const state = setup(t);
  for (const role of ['admin', 'user']) {
    await assert.rejects(() => invoke(previewPoster, { body: { includePhone: true }, user: { _id: otherId, role } }), { statusCode: 403 });
  }
  assert.equal(state.reads(), 0);
  assert.equal(state.assets.length, 0);
});

test('invalid consent, missing phone and found reports fail closed', async (t) => {
  const state = setup(t, '');
  await assert.rejects(() => invoke(previewPoster, { body: { includePhone: 'true' } }), { statusCode: 400 });
  await assert.rejects(() => invoke(previewPoster, { body: { includePhone: true }, type: 'found' }), { statusCode: 400 });
  await assert.rejects(() => invoke(previewPoster, { body: { includePhone: true } }), { statusCode: 400 });
  assert.equal(state.assets.length, 0);
});

test('admin cannot approve a poster containing another owner phone', async (t) => {
  let saved = false;
  t.mock.method(PosterAsset, 'findById', async () => ({ ownerId, phoneIncluded: true, expiresAt: new Date(Date.now() + 86400000), save: async () => { saved = true; } }));
  await assert.rejects(() => invoke(approvePoster, { user: { _id: otherId, role: 'admin' } }), { statusCode: 403 });
  assert.equal(saved, false);
  await invoke(approvePoster);
  assert.equal(saved, true);
});
