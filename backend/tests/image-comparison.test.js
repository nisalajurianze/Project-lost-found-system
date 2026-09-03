import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  compareItemImages,
  fuseVisualEvidence,
  isSafeRemoteImageUrl,
  sanitizeComparison,
  tokenSimilarity,
} from '../services/imageComparisonService.js';
import { resetAiProviderStateForTests } from '../services/aiProviderService.js';

test('direct image comparison accepts only remote HTTPS item images', () => {
  assert.equal(isSafeRemoteImageUrl('https://cdn.example.test/lost.jpg'), true);
  assert.equal(isSafeRemoteImageUrl('http://cdn.example.test/lost.jpg'), false);
  assert.equal(isSafeRemoteImageUrl('data:image/png;base64,AAAA'), false);
  assert.equal(isSafeRemoteImageUrl('text-only'), false);
});

test('comparison output clamps scores and masks sensitive provider evidence', () => {
  const result = sanitizeComparison({
    similarity: 140,
    confidence: -5,
    sharedFeatures: ['blue case', 'student ID ICT/2024/123'],
    differences: ['phone 0712345678'],
    reason: 'Same phone with number 0712345678 visible',
  }, { model: 'vision-test', latencyMs: 42 });
  assert.equal(result.score, 100);
  assert.equal(result.confidence, 0);
  assert.equal(result.sharedFeatures[1], '[masked identifier]');
  assert.doesNotMatch(result.sharedFeatures[1], /ICT\/2024\/123/);
  assert.doesNotMatch(result.explanation, /0712345678/);
  assert.equal(result.providerModel, 'vision-test');
});

test('visual fusion combines provider, fingerprint and metadata evidence without treating it as proof', () => {
  const fingerprint = tokenSimilarity('blue:canvas:round-sticker', 'blue:canvas:round-sticker:zip');
  assert.equal(fingerprint.available, true);
  assert.ok(fingerprint.score > 0.5);
  const result = fuseVisualEvidence(
    sanitizeComparison({ similarity: 82, confidence: 78, sharedFeatures: ['blue bag'], differences: [], reason: 'Similar shape.' }),
    { visualFingerprint: 'blue:canvas:round-sticker', labels: ['bag'], colors: ['blue'], material: 'canvas' },
    { visualFingerprint: 'blue:canvas:round-sticker:zip', labels: ['bag'], colors: ['blue'], material: 'canvas' },
  );
  assert.equal(result.source, 'visual-fusion-v1');
  assert.ok(result.score >= 75);
  assert.deepEqual(Object.keys(result.componentScores), ['provider', 'fingerprint', 'metadata']);
  assert.match(result.explanation, /privacy-safe fingerprint/i);
});

test('local-only fusion is bounded and returns null without comparable evidence', () => {
  const result = fuseVisualEvidence(null, { visualFingerprint: 'same-mark' }, { visualFingerprint: 'same-mark' });
  assert.equal(result.score, 75);
  assert.equal(result.componentScores.provider, undefined);
  assert.equal(fuseVisualEvidence(null, {}, {}), null);
});

test('provider comparison sends exactly two images with a one-attempt budget', async () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };
  let body;
  try {
    process.env.AI_ENABLED = 'true';
    process.env.AI_API_KEY = 'test-key';
    process.env.AI_VISION_MODEL = 'vision-test';
    process.env.AI_API_URL = 'https://example.test/chat';
    resetAiProviderStateForTests();
    global.fetch = async (_url, options) => {
      body = JSON.parse(options.body);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({
            similarity: 86,
            confidence: 78,
            sharedFeatures: ['blue case', 'round sticker'],
            differences: ['minor lighting difference'],
            reason: 'Shape, cover and sticker placement are similar.',
          }) } }],
        }),
      };
    };

    const result = await compareItemImages(
      'https://cdn.example.test/lost.jpg',
      'https://cdn.example.test/found.jpg',
    );
    assert.equal(result.score, 86);
    assert.equal(body.messages[0].content.filter((entry) => entry.type === 'image_url').length, 2);
    assert.equal(body.model, 'vision-test');
  } finally {
    global.fetch = originalFetch;
    for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
    Object.assign(process.env, originalEnv);
    resetAiProviderStateForTests();
  }
});

test('matching orchestration limits direct comparisons to top-ranked candidates in parallel', () => {
  const source = fs.readFileSync(new URL('../services/aiMatchingService.js', import.meta.url), 'utf8');
  assert.match(source, /Math\.min\(5, Math\.max\(0, Number\(process\.env\.MATCH_VISUAL_COMPARE_LIMIT \|\| 3\)\)\)/);
  assert.match(source, /\.sort\(\(left, right\) => right\.preliminaryResult\.similarityScore - left\.preliminaryResult\.similarityScore\)/);
  assert.match(source, /\.slice\(0, visualCompareLimit\)/);
  assert.match(source, /Promise\.all\(visualEligible\.map/);
});
