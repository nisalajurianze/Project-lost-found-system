import test from 'node:test';
import assert from 'node:assert/strict';
import { randomToken, hashToken, safeEqual } from '../utils/security.js';
import { itemView, claimView } from '../utils/serializers.js';
import { emailTemplates, initEmailService, sendEmail } from '../services/emailService.js';
import { getFallbackAnalysis } from '../services/imageAnalysisService.js';
import Notification from '../models/Notification.js';
import ImageAnalysis from '../models/ImageAnalysis.js';

test('opaque security tokens have entropy and stable hashing', () => {
  const first = randomToken(48);
  const second = randomToken(48);
  assert.notEqual(first, second);
  assert.ok(first.length >= 64);
  assert.equal(hashToken(first), hashToken(first));
  assert.notEqual(hashToken(first), first);
  assert.equal(safeEqual(first, first), true);
  assert.equal(safeEqual(first, second), false);
});

test('public item view hides reporter contact and connection metadata', () => {
  const item = {
    _id: 'item',
    userId: { _id: 'owner', fullName: 'Owner', email: 'owner@example.com', phone: '+94111111111', studentId: 'PRIVATE', profileImage: {} },
    connectedUserId: 'connected',
    connectedAt: new Date(),
    contactVisibility: 'request_only',
    contactPreference: 'both',
  };
  const result = itemView(item, { _id: 'viewer', role: 'user' });
  assert.equal(result.userId.email, undefined);
  assert.equal(result.userId.phone, undefined);
  assert.equal(result.userId.studentId, undefined);
  assert.equal(result.connectedUserId, undefined);
  assert.equal(result.connectedAt, undefined);
});

test('anonymous viewers cannot match an absent connected-user identifier', () => {
  const result = itemView({
    userId: { _id: 'owner', fullName: 'Owner', email: 'owner@example.com', phone: '+94111111111' },
    connectedUserId: null,
    contactVisibility: 'request_only',
    contactPreference: 'both',
  }, null);
  assert.equal(result.userId.email, undefined);
  assert.equal(result.userId.phone, undefined);
});

test('legacy public contact flag cannot bypass approved contact sharing', () => {
  const item = {
    userId: { _id: 'owner', fullName: 'Owner', email: 'owner@example.com', phone: '+94111111111', profileImage: {} },
    contactVisibility: 'public',
    contactPreference: 'email',
  };
  const result = itemView(item, null);
  assert.equal(result.userId.email, undefined);
  assert.equal(result.userId.phone, undefined);
});

test('claim evidence and both parties contacts stay private from outsiders', async () => {
  const claim = {
    _id: 'claim',
    claimantId: { _id: 'claimant', fullName: 'Claimant', email: 'claimant@example.com', phone: '+94222222222', studentId: 'SECRET', profileImage: {} },
    foundItemId: {
      _id: 'item',
      userId: { _id: 'reporter', fullName: 'Reporter', email: 'reporter@example.com', phone: '+94333333333', studentId: 'SECRET2', profileImage: {} },
    },
    proofDescription: 'A private serial number',
    proofImages: [{ publicId: 'private-proof' }],
    status: 'pending',
    isContactShared: false,
  };
  const result = await claimView(claim, { _id: 'outsider', role: 'user' }, async () => ({ url: 'signed' }));
  assert.equal(result.proofDescription, 'Private ownership evidence');
  assert.deepEqual(result.proofImages, []);
  assert.equal(result.claimantId.email, undefined);
  assert.equal(result.foundItemId.userId.email, undefined);
});

test('email templates escape untrusted values and unknown templates fail closed', async () => {
  const rendered = emailTemplates.claimRejected({ name: '<script>', itemName: 'Wallet', reason: '<img onerror=x>' });
  assert.ok(!rendered.html.includes('<script>'));
  assert.ok(rendered.html.includes('&lt;script&gt;'));
  initEmailService();
  await assert.rejects(() => sendEmail({ to: 'user@example.com', template: 'unknown-template' }), /Unsupported email template/);
});

test('fallback image analysis is bounded and does not infer people', () => {
  const result = getFallbackAnalysis('Black Dell Laptop', 'Silver sticker on lid');
  assert.ok(result.labels.length <= 12);
  assert.ok(result.colors.includes('black'));
  assert.equal(result.provider, 'fallback');
  assert.equal(Object.hasOwn(result, 'rawResponse'), false);
});

test('dedupe and AI analysis indexes enforce one-record semantics', () => {
  const notificationIndex = Notification.schema.indexes().find(([keys]) => keys.userId === 1 && keys.dedupeKey === 1);
  assert.equal(notificationIndex?.[1]?.unique, true);
  assert.deepEqual(notificationIndex?.[1]?.partialFilterExpression, { dedupeKey: { $type: 'string' } });
  const analysisIndex = ImageAnalysis.schema.indexes().find(([keys]) => keys.itemType === 1 && keys.itemId === 1);
  assert.equal(analysisIndex?.[1]?.unique, true);
});
