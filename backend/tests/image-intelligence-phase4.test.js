import test from 'node:test';
import assert from 'node:assert/strict';
import ImageAnalysis from '../models/ImageAnalysis.js';
import PosterAsset from '../models/PosterAsset.js';
import { getFallbackAnalysis, sanitizeAnalysis } from '../services/imageAnalysisService.js';
import { publicPosterFields, renderPosterSvg } from '../services/posterService.js';
import { itemView } from '../utils/serializers.js';

test('vision v3 sanitizes OCR, quality, captions and non-personal fingerprints', () => {
  const fallback = getFallbackAnalysis('Blue bag', 'Canvas bag');
  const result = sanitizeAnalysis({
    labels: ['Bag'],
    colors: ['Blue'],
    description: 'A blue bag',
    accessibilityCaption: 'Blue canvas bag with a round sticker',
    visualFingerprint: 'blue:canvas:round-sticker; DROP TABLE',
    confidence: 88,
    imageQuality: 'good',
    qualityScores: { blur: 130, exposure: 81, resolution: 74, occlusion: -5, guidance: ['Use more light'] },
    ocrRegions: [{ x: 0.2, y: 0.1, width: 0.5, height: 0.2, text: 'phone 0771234567', confidence: 92, category: 'phone' }],
  }, fallback, { model: 'vision-test', latencyMs: 44 });
  assert.equal(result.analysisVersion, 'vision-v3');
  assert.equal(result.qualityScores.blur, 100);
  assert.equal(result.qualityScores.occlusion, 0);
  assert.equal(result.ocrRegions[0].category, 'phone');
  assert.doesNotMatch(result.ocrRegions[0].textMasked, /0771234567/);
  assert.equal(result.accessibilityCaption.status, 'draft');
  assert.equal(result.visualFingerprint, 'blue:canvas:round-stickerDROPTABLE');
});

test('image analysis schema keeps sensitive fingerprint private and captions reviewable', () => {
  assert.equal(ImageAnalysis.schema.path('visualFingerprint').options.select, false);
  assert.deepEqual(ImageAnalysis.schema.path('accessibilityCaption.status').enumValues, ['draft', 'approved', 'rejected']);
  assert.deepEqual(ImageAnalysis.schema.path('ocrRegions').schema.path('category').enumValues, ['general', 'phone', 'email', 'student-id', 'bank-card', 'address', 'serial', 'qr', 'other']);
});

test('public serializer exposes only approved accessibility descriptions', () => {
  const base = {
    _id: 'report-1',
    userId: { _id: 'owner-1', fullName: 'Owner', email: 'owner@example.test', phone: '0771234567' },
    images: [
      { url: 'https://cdn.example.test/draft.jpg', privacyStatus: 'safe_public', accessibilityAlt: { text: 'Draft private caption', status: 'draft' } },
      { url: 'https://cdn.example.test/approved.jpg', privacyStatus: 'safe_public', accessibilityAlt: { text: 'Approved blue bag description', status: 'approved', language: 'en' } },
    ],
  };
  const result = itemView(base, null);
  assert.equal(result.images[0].accessibilityAlt, undefined);
  assert.equal(result.images[1].accessibilityAlt.text, 'Approved blue bag description');
});

test('poster projection removes private details, exact sensitive locations and unreviewed images', () => {
  const fields = publicPosterFields({
    itemName: 'Blue bag',
    category: 'Bags',
    description: 'Call 0771234567 or me@example.com. Student ID: ICT/2024/1234',
    lostLocation: 'Room 12, private hostel',
    lostDate: '2026-08-30T10:00:00.000Z',
    locationIntelligence: { area: 'Oluvil hostel zone', sensitivity: 'zone-only', needsReview: false },
    images: [{ url: 'https://cdn.example.test/original.jpg', privacyStatus: 'legacy_unreviewed' }],
  }, 'LostItem');
  assert.equal(fields.location, 'Oluvil hostel zone');
  assert.equal(fields.imageUrl, '');
  assert.doesNotMatch(fields.description, /0771234567|me@example\.com|ICT\/2024\/1234/);
  const svg = renderPosterSvg({ fields: { ...fields, itemName: '<script>alert(1)</script>' }, language: 'en', deepLink: 'https://example.test/?a=1&b=2', expiresAt: new Date('2026-09-30') });
  assert.doesNotMatch(svg, /<script>/);
  assert.match(svg, /&lt;script&gt;/);
  assert.match(svg, /a=1&amp;b=2/);
});

test('poster assets are review-gated and expire explicitly', () => {
  assert.deepEqual(PosterAsset.schema.path('status').enumValues, ['preview', 'approved', 'expired', 'deleted']);
  assert.ok(PosterAsset.schema.indexes().some(([keys]) => keys.reportType === 1 && keys.reportId === 1 && keys.language === 1 && keys.status === 1));
});
