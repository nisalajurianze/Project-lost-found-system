const metrics = {
  startedAt: new Date(),
  requests: 0,
  successes: 0,
  failures: 0,
  fallbackUses: 0,
  totalLatencyMs: 0,
  lastSuccessAt: null,
  lastFailureAt: null,
  lastFailureCode: '',
  byModel: {},
};

const circuitStates = new Map();

const splitValues = (...values) => [...new Set(values
  .flatMap((value) => String(value || '').split(/[\n,]/))
  .map((value) => value.trim())
  .filter((value) => value && !value.startsWith('your_')))];

const getApiKeys = () => splitValues(
  process.env.AI_API_KEYS,
  process.env.AI_API_KEY,
  process.env.OPENROUTER_API_KEYS,
  process.env.OPENROUTER_API_KEY,
);

const getModels = (vision = false) => splitValues(
  vision ? process.env.AI_VISION_MODELS : process.env.AI_CHAT_MODELS,
  vision ? process.env.AI_VISION_MODEL : process.env.AI_CHAT_MODEL,
);

const aiEnabled = () => ['1', 'true', 'yes'].includes(String(process.env.AI_ENABLED || '').toLowerCase());
const jsonResponseFormatEnabled = () => ['1', 'true', 'yes'].includes(String(process.env.AI_USE_RESPONSE_FORMAT || '').toLowerCase());
const aiConfigured = ({ vision = false } = {}) => aiEnabled() && getApiKeys().length > 0 && getModels(vision).length > 0;

const providerUrl = () => {
  const value = process.env.AI_API_URL || 'https://openrouter.ai/api/v1/chat/completions';
  const parsed = new URL(value);
  const localDevelopment = process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(parsed.hostname);
  if (parsed.protocol !== 'https:' && !localDevelopment) throw new Error('AI_API_URL must use HTTPS in production.');
  return parsed.toString();
};

const parseJSONResponse = (text) => {
  if (!text) return null;
  try {
    const clean = String(text).replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    const fenced = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const candidate = fenced?.[1] || clean.match(/\{[\s\S]*\}/)?.[0];
    return candidate ? JSON.parse(candidate.replace(/,\s*([}\]])/g, '$1')) : null;
  } catch {
    return null;
  }
};

const circuitKey = (model, keyIndex) => `${model}:${keyIndex}`;
const getCircuit = (model, keyIndex) => circuitStates.get(circuitKey(model, keyIndex)) || { failures: 0, openUntil: 0 };
const setCircuit = (model, keyIndex, value) => circuitStates.set(circuitKey(model, keyIndex), value);

const updateModelMetrics = (model, outcome, latencyMs) => {
  metrics.byModel[model] ||= { requests: 0, successes: 0, failures: 0, totalLatencyMs: 0, lastFailureCode: '' };
  const target = metrics.byModel[model];
  target.requests += 1;
  target.totalLatencyMs += latencyMs;
  target[outcome === 'success' ? 'successes' : 'failures'] += 1;
};

const validateResult = (value, validator) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (!validator) return true;
  try { return validator(value) === true; } catch { return false; }
};

const requestAIJson = async (messages, {
  vision = false,
  purpose = 'generic',
  validator = null,
  temperature = 0.1,
  maxAttempts = Number(process.env.AI_MAX_ATTEMPTS || 3),
} = {}) => {
  if (!aiConfigured({ vision })) return null;
  if (!Array.isArray(messages) || messages.length === 0) throw new Error('AI messages are required.');

  const keys = getApiKeys();
  const models = getModels(vision);
  const timeoutMs = Math.min(30_000, Math.max(2_000, Number(process.env.AI_TIMEOUT_MS || 15_000)));
  const failureThreshold = Math.min(10, Math.max(1, Number(process.env.AI_CIRCUIT_FAILURE_THRESHOLD || 3)));
  const cooldownMs = Math.min(15 * 60_000, Math.max(10_000, Number(process.env.AI_CIRCUIT_COOLDOWN_MS || 60_000)));
  const attemptBudget = Math.min(keys.length * models.length, Math.max(1, maxAttempts));
  let attempts = 0;
  let lastCode = 'AI_PROVIDER_UNAVAILABLE';

  metrics.requests += 1;

  for (const model of models) {
    for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
      if (attempts >= attemptBudget) break;
      const state = getCircuit(model, keyIndex);
      if (state.openUntil > Date.now()) continue;
      attempts += 1;
      const startedAt = Date.now();

      try {
        const response = await fetch(providerUrl(), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${keys[keyIndex]}`,
            'Content-Type': 'application/json',
            ...(process.env.CLIENT_URL ? { 'HTTP-Referer': process.env.CLIENT_URL } : {}),
            'X-Title': 'Smart Lost and Found',
            'X-AI-Purpose': String(purpose).slice(0, 80),
          },
          body: JSON.stringify({
            model,
            messages,
            temperature,
            ...(jsonResponseFormatEnabled() ? { response_format: { type: 'json_object' } } : {}),
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (!response.ok) {
          lastCode = `HTTP_${response.status}`;
          throw new Error(lastCode);
        }
        const data = await response.json();
        const result = parseJSONResponse(data?.choices?.[0]?.message?.content);
        if (!validateResult(result, validator)) {
          lastCode = 'INVALID_SCHEMA';
          throw new Error(lastCode);
        }

        const latencyMs = Date.now() - startedAt;
        metrics.successes += 1;
        metrics.totalLatencyMs += latencyMs;
        metrics.lastSuccessAt = new Date();
        updateModelMetrics(model, 'success', latencyMs);
        setCircuit(model, keyIndex, { failures: 0, openUntil: 0 });
        return { data: result, meta: { model, keySlot: keyIndex + 1, attempts, latencyMs, purpose } };
      } catch (error) {
        const latencyMs = Date.now() - startedAt;
        const nextFailures = state.failures + 1;
        setCircuit(model, keyIndex, {
          failures: nextFailures,
          openUntil: nextFailures >= failureThreshold ? Date.now() + cooldownMs : 0,
        });
        updateModelMetrics(model, 'failure', latencyMs);
        metrics.lastFailureAt = new Date();
        metrics.lastFailureCode = lastCode || error?.name || 'AI_PROVIDER_ERROR';
      }
    }
    if (attempts >= attemptBudget) break;
  }

  metrics.failures += 1;
  const error = new Error('AI provider attempts were exhausted.');
  error.code = lastCode;
  throw error;
};

const recordFallbackUse = () => { metrics.fallbackUses += 1; };

const getAiProviderStatus = () => {
  const models = Object.fromEntries(Object.entries(metrics.byModel).map(([model, value]) => [model, {
    requests: value.requests,
    successes: value.successes,
    failures: value.failures,
    averageLatencyMs: value.requests ? Math.round(value.totalLatencyMs / value.requests) : 0,
    circuitOpen: [...circuitStates.entries()].some(([key, state]) => key.startsWith(`${model}:`) && state.openUntil > Date.now()),
  }]));
  return {
    enabled: aiEnabled(),
    configured: aiConfigured(),
    visionConfigured: aiConfigured({ vision: true }),
    requests: metrics.requests,
    successes: metrics.successes,
    failures: metrics.failures,
    fallbackUses: metrics.fallbackUses,
    successRate: metrics.requests ? Math.round((metrics.successes / metrics.requests) * 100) : 0,
    averageLatencyMs: metrics.successes ? Math.round(metrics.totalLatencyMs / metrics.successes) : 0,
    lastSuccessAt: metrics.lastSuccessAt,
    lastFailureAt: metrics.lastFailureAt,
    lastFailureCode: metrics.lastFailureCode,
    startedAt: metrics.startedAt,
    models,
  };
};

const resetAiProviderStateForTests = () => {
  Object.assign(metrics, {
    startedAt: new Date(), requests: 0, successes: 0, failures: 0, fallbackUses: 0,
    totalLatencyMs: 0, lastSuccessAt: null, lastFailureAt: null, lastFailureCode: '', byModel: {},
  });
  circuitStates.clear();
};

export {
  aiConfigured,
  getAiProviderStatus,
  parseJSONResponse,
  providerUrl,
  recordFallbackUse,
  requestAIJson,
  resetAiProviderStateForTests,
};
