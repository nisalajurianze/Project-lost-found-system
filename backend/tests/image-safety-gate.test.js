import test from 'node:test';
import assert from 'node:assert/strict';
import { resetAiProviderStateForTests } from '../services/aiProviderService.js';
import { verifyReportImages } from '../services/imageAnalysisService.js';

const validImage = { buffer: Buffer.from('test-image'), mimetype: 'image/png' };
const responseFor = (value) => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify(value) } }] }) });
const baseSuggestion = {
  isSpam: false,
  isItemPhoto: true,
  itemName: 'Red backpack',
  category: 'Bags',
  description: 'A red backpack with two black zippers.',
  imageQuality: 'good',
  moderationDecision: 'allow',
  privacyWarnings: [],
  safetyLabels: [],
};

test('server image gate accepts only an explicit safe physical item result', async () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };
  try {
    Object.assign(process.env, {
      AI_ENABLED: 'true', AI_API_KEY: 'test-key', AI_API_URL: 'https://vision.example.test/chat',
      AI_VISION_PROVIDER: 'primary', AI_VISION_MODEL: 'vision-test', AI_MAX_ATTEMPTS: '1',
    });
    global.fetch = async () => responseFor(baseSuggestion);
    resetAiProviderStateForTests();
    await assert.doesNotReject(() => verifyReportImages([validImage]));
  } finally {
    global.fetch = originalFetch;
    for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
    Object.assign(process.env, originalEnv);
    resetAiProviderStateForTests();
  }
});

test('server image gate rejects explicit sexual content and non-item photos', async () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };
  try {
    Object.assign(process.env, {
      AI_ENABLED: 'true', AI_API_KEY: 'test-key', AI_API_URL: 'https://vision.example.test/chat',
      AI_VISION_PROVIDER: 'primary', AI_VISION_MODEL: 'vision-test', AI_MAX_ATTEMPTS: '1',
    });
    resetAiProviderStateForTests();
    global.fetch = async () => responseFor({ ...baseSuggestion, isItemPhoto: false, moderationDecision: 'reject', description: 'Pornographic explicit sexual content.' });
    await assert.rejects(() => verifyReportImages([validImage]), (error) => error.code === 'IMAGE_NOT_ALLOWED');
    resetAiProviderStateForTests();
    global.fetch = async () => responseFor({ ...baseSuggestion, isItemPhoto: false, moderationDecision: 'allow' });
    await assert.rejects(() => verifyReportImages([validImage]), (error) => error.code === 'IMAGE_NOT_ALLOWED');
  } finally {
    global.fetch = originalFetch;
    for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
    Object.assign(process.env, originalEnv);
    resetAiProviderStateForTests();
  }
});

test('server image gate fails closed when safety provider is unavailable', async () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };
  try {
    Object.assign(process.env, {
      AI_ENABLED: 'true', AI_API_KEY: 'test-key', AI_API_URL: 'https://vision.example.test/chat',
      AI_VISION_PROVIDER: 'primary', AI_VISION_MODEL: 'vision-test', AI_MAX_ATTEMPTS: '1',
    });
    resetAiProviderStateForTests();
    global.fetch = async () => ({ ok: false, status: 503 });
    await assert.rejects(() => verifyReportImages([validImage]), (error) => error.code === 'IMAGE_SAFETY_UNAVAILABLE');
  } finally {
    global.fetch = originalFetch;
    for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
    Object.assign(process.env, originalEnv);
    resetAiProviderStateForTests();
  }
});
