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
  const bodies = [];
  try {
    process.env.AI_ENABLED = 'true';
    process.env.AI_API_KEYS = 'bad-key,good-key';
    process.env.AI_CHAT_MODELS = 'test-model';
    process.env.AI_API_URL = 'https://example.test/chat';
    process.env.AI_MAX_ATTEMPTS = '2';
    resetAiProviderStateForTests();
    global.fetch = async (_url, options) => {
      calls += 1;
      bodies.push(JSON.parse(options.body));
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
    assert.equal(bodies.some((body) => 'response_format' in body), false);
    assert.equal(response.data.value, 'ok');
    assert.equal(response.meta.keySlot, 2);
    assert.equal(response.meta.attempts, 2);
    assert.equal(response.meta.promptVersion, 'generic-v1');
    assert.equal(response.meta.safetyVersion, 'ai-safety-v1');
    const status = getAiProviderStatus();
    assert.equal(status.successes, 1);
    assert.equal(status.models['test-model'].failures, 1);
    assert.equal(status.models['test-model'].successes, 1);
    assert.equal(status.purposes['unit-test'].requests, 1);
    assert.equal(status.purposes['unit-test'].successes, 1);
    assert.equal(status.purposes['unit-test'].averageInputChars, 4);
    assert.equal(status.safetyVersion, 'ai-safety-v1');
    assert.deepEqual(status.promptRegistry.find(({ purpose }) => purpose === 'generic'), {
      purpose: 'generic',
      version: 'generic-v1',
    });
  } finally {
    global.fetch = originalFetch;
    for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
    Object.assign(process.env, originalEnv);
    resetAiProviderStateForTests();
  }
});

test('OpenRouter endpoint prefers its provider-specific key over a generic AI key', async () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };
  let authorization = '';
  try {
    process.env.AI_ENABLED = 'true';
    process.env.AI_API_KEY = 'opencode-key';
    process.env.OPENROUTER_API_KEY = 'openrouter-key';
    process.env.AI_CHAT_MODEL = 'openrouter/free';
    process.env.AI_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
    process.env.AI_MAX_ATTEMPTS = '1';
    resetAiProviderStateForTests();
    global.fetch = async (_url, options) => {
      authorization = options.headers.Authorization;
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
    assert.equal(response.data.value, 'ok');
    assert.equal(authorization, 'Bearer openrouter-key');
  } finally {
    global.fetch = originalFetch;
    for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
    Object.assign(process.env, originalEnv);
    resetAiProviderStateForTests();
  }
});

test('provider output with private data is rejected and counted by purpose', async () => {
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
      json: async () => ({ choices: [{ message: { content: '{"answer":"Call 0771234567"}' } }] }),
    });

    await assert.rejects(
      () => requestAIJson([{ role: 'user', content: 'find my bag' }], { purpose: 'privacy-test' }),
      /attempts were exhausted/i,
    );
    const status = getAiProviderStatus();
    assert.equal(status.safetyRejections, 1);
    assert.equal(status.purposes['privacy-test'].safetyRejections, 1);
    assert.equal(status.purposes['privacy-test'].lastFailureCode, 'PRIVATE_DATA_IN_OUTPUT');
  } finally {
    global.fetch = originalFetch;
    for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
    Object.assign(process.env, originalEnv);
    resetAiProviderStateForTests();
  }
});

test('provider JSON response format is opt-in for OpenAI-compatible model support', async () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };
  let body;
  try {
    process.env.AI_ENABLED = 'true';
    process.env.AI_API_KEY = 'test-key';
    process.env.AI_CHAT_MODEL = 'test-model';
    process.env.AI_API_URL = 'https://example.test/chat';
    process.env.AI_USE_RESPONSE_FORMAT = 'true';
    resetAiProviderStateForTests();
    global.fetch = async (_url, options) => {
      body = JSON.parse(options.body);
      return {
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: '{"value":"ok"}' } }] }),
      };
    };

    const response = await requestAIJson([{ role: 'user', content: 'test' }], {
      validator: (value) => value.value === 'ok',
    });
    assert.equal(response.data.value, 'ok');
    assert.deepEqual(body.response_format, { type: 'json_object' });
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
