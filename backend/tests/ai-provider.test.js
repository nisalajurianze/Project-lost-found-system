import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAiProviderStatus,
  requestAIJson,
  resetAiProviderStateForTests,
} from '../services/aiProviderService.js';

test('provider client fails over across configured key slots with bounded attempts', async () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };
  let calls = 0;
  try {
    process.env.AI_ENABLED = 'true';
    process.env.AI_API_KEYS = 'bad-key,good-key';
    process.env.AI_CHAT_MODELS = 'test-model';
    process.env.AI_API_URL = 'https://example.test/chat';
    process.env.AI_MAX_ATTEMPTS = '2';
    resetAiProviderStateForTests();
    global.fetch = async (_url, options) => {
      calls += 1;
      if (options.headers.Authorization === 'Bearer bad-key') return { ok: false, status: 503 };
      return {
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: '{"value":"ok"}' } }] }),
      };
    };

    const response = await requestAIJson([{ role: 'user', content: 'test' }], {
      purpose: 'unit-test',
      validator: (value) => value.value === 'ok',
    });
    assert.equal(calls, 2);
    assert.equal(response.data.value, 'ok');
    assert.equal(response.meta.keySlot, 2);
    assert.equal(response.meta.attempts, 2);
    const status = getAiProviderStatus();
    assert.equal(status.successes, 1);
    assert.equal(status.models['test-model'].failures, 1);
    assert.equal(status.models['test-model'].successes, 1);
  } finally {
    global.fetch = originalFetch;
    for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
    Object.assign(process.env, originalEnv);
    resetAiProviderStateForTests();
  }
});

test('invalid JSON schema fails closed instead of returning provider text', async () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };
  try {
    process.env.AI_ENABLED = 'true';
    process.env.AI_API_KEY = 'test-key';
    process.env.AI_CHAT_MODEL = 'test-model';
    process.env.AI_API_URL = 'https://example.test/chat';
    process.env.AI_MAX_ATTEMPTS = '1';
    resetAiProviderStateForTests();
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: '{"unexpected":true}' } }] }),
    });
    await assert.rejects(
      () => requestAIJson([{ role: 'user', content: 'test' }], { validator: (value) => typeof value.value === 'string' }),
      /attempts were exhausted/i,
    );
    assert.equal(getAiProviderStatus().failures, 1);
  } finally {
    global.fetch = originalFetch;
    for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
    Object.assign(process.env, originalEnv);
    resetAiProviderStateForTests();
  }
});
