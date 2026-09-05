import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { itemView, claimView } from '../utils/serializers.js';

const oid = () => new mongoose.Types.ObjectId();
const fixture = () => ({
  _id: oid(),
  userId: { _id: oid(), fullName: 'Reporter', email: 'reporter@example.test' },
  connectedUserId: oid(),
  createdAt: new Date('2026-09-06T00:00:00Z'),
  lostLocation: 'Private location',
  images: [{ _id: oid(), url: 'https://example.test/photo.jpg', privacyStatus: 'safe_public' }],
});

test('lean report IDs serialize as strings usable by detail routes', () => {
  const item = fixture();
  const result = JSON.parse(JSON.stringify(itemView(item, null)));
  assert.equal(result._id, item._id.toHexString());
  assert.equal(result.userId._id, item.userId._id.toHexString());
  assert.equal(result.createdAt, item.createdAt.toISOString());
  assert.equal(result.userId.email, undefined);
  assert.equal(result.connectedUserId, undefined);
  assert.equal(item.userId.email, 'reporter@example.test');
  assert.ok(item._id instanceof mongoose.Types.ObjectId);
});

test('BSON IDs preserve owner and connected-viewer access without granting outsiders access', () => {
  const item = fixture();
  for (const viewer of [{ _id: item.userId._id }, { _id: item.connectedUserId }]) {
    const result = itemView(item, viewer);
    assert.equal(result.userId.email, 'reporter@example.test');
    assert.equal(result.lostLocation, 'Private location');
    assert.equal(result.images[0]._id, item.images[0]._id.toHexString());
  }
  const outsider = itemView(item, { _id: oid() });
  assert.equal(outsider.userId.email, undefined);
  assert.notEqual(outsider.lostLocation, 'Private location');
});

test('hydrated and lean reports have the same JSON projection', () => {
  const item = fixture();
  const viewer = { _id: item.userId._id };
  assert.deepEqual(itemView({ toObject: () => item }, viewer), itemView(item, viewer));
});

test('claim projection preserves nested BSON identifiers and private evidence boundaries', async () => {
  const item = fixture();
  const claim = {
    _id: oid(), claimantId: { _id: oid(), fullName: 'Claimant' }, lostItemId: item,
    proofDescription: 'Private proof', proofImages: [], verificationAnswers: [], status: 'pending',
  };
  const own = await claimView(claim, { _id: claim.claimantId._id });
  assert.equal(own._id, claim._id.toHexString());
  assert.equal(own.lostItemId._id, item._id.toHexString());
  assert.equal(own.proofDescription, 'Private proof');
  const outsider = await claimView(claim, { _id: oid() });
  assert.equal(outsider.proofDescription, 'Private ownership evidence');
  assert.equal(outsider.lostItemId.userId.email, undefined);
  assert.equal(claim.lostItemId.userId.email, 'reporter@example.test');
});
