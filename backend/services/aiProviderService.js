import { getPromptRegistry, promptVersionForPurpose } from './aiPromptRegistry.js';
import { AI_SAFETY_VERSION, inspectAIOutput, validateAIMessageEnvelope } from './aiSafetyService.js';

const metrics = {
  startedAt: new Date(),
  requests: 0,
  successes: 0,
  failures: 0,
  fallbackUses: 0,
  safetyRejections: 0,
  schemaRejections: 0,
  totalInputChars: 0,
  totalOutputChars: 0,
  totalLatencyMs: 0,
  lastSuccessAt: null,
  lastFailureAt: null,
  lastFailureCode: '',
  byModel: {},
  byPurpose: {},
};

const circuitStates = new Map();

const splitValues = (...values) => [...new Set(values
  .flatMap((value) => String(value || '').split(/[\n,]/))
  .map((value) => value.trim())
  .filter((value) => value && !value.startsWith('your_')))];

const isOpenRouterProvider = () => {
  try {
    const value = process.env.AI_API_URL || 'https://openrouter.ai/api/v1/chat/completions';
    return new URL(value).hostname.toLowerCase() === 'openrouter.ai';
  } catch {
    return false;
  }
};

const getModels = (vision = false) => splitValues(
  vision ? process.env.AI_VISION_MODELS : process.env.AI_CHAT_MODELS,
  vision ? process.env.AI_VISION_MODEL : process.env.AI_CHAT_MODEL,
);

const getOpenRouterModels = (vision = false) => splitValues(
  vision ? process.env.OPENROUTER_VISION_MODELS : process.env.OPENROUTER_CHAT_MODELS,
  vision ? process.env.OPENROUTER_VISION_MODEL : process.env.OPENROUTER_CHAT_MODEL,
);

const getProviderPlans = (vision = false) => {
  const configuredUrl = process.env.AI_API_URL || 'https://openrouter.ai/api/v1/chat/completions';
  const genericKeys = splitValues(process.env.AI_API_KEYS, process.env.AI_API_KEY);
  const openRouterKeys = splitValues(process.env.OPENROUTER_API_KEYS, process.env.OPENROUTER_API_KEY);
  const configuredIsOpenRouter = isOpenRouterProvider();
  const plans = [];

  if (configuredIsOpenRouter) {
    const keys = openRouterKeys.length > 0 ? openRouterKeys : genericKeys;
    if (keys.length > 0 && getModels(vision).length > 0) {
      plans.push({ name: 'openrouter', url: configuredUrl, keys, models: getModels(vision) });
    }
    return plans;
  }

  if (genericKeys.length > 0 && getModels(vision).length > 0) {
    plans.push({ name: 'primary', url: configuredUrl, keys: genericKeys, models: getModels(vision) });
  }
  if (openRouterKeys.length > 0 && getOpenRouterModels(vision).length > 0) {
    plans.push({
      name: 'openrouter',
      url: process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions',
      keys: openRouterKeys,
      models: getOpenRouterModels(vision),
    });
  }
  return plans;
};

const aiEnabled = () => ['1', 'true', 'yes'].includes(String(process.env.AI_ENABLED || '').toLowerCase());
const jsonResponseFormatEnabled = () => ['1', 'true', 'yes'].includes(String(process.env.AI_USE_RESPONSE_FORMAT || '').toLowerCase());
const aiConfigured = ({ vision = false } = {}) => aiEnabled() && getProviderPlans(vision).length > 0;

const providerUrl = (value = process.env.AI_API_URL || 'https://openrouter.ai/api/v1/chat/completions') => {
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

const circuitKey = (model, keyIndex, provider = 'default') => `${model}:${provider}:${keyIndex}`;
const getCircuit = (model, keyIndex, provider) => circuitStates.get(circuitKey(model, keyIndex, provider)) || { failures: 0, openUntil: 0 };
const setCircuit = (model, keyIndex, provider, value) => circuitStates.set(circuitKey(model, keyIndex, provider), value);

const updateModelMetrics = (model, outcome, latencyMs) => {
  metrics.byModel[model] ||= { requests: 0, successes: 0, failures: 0, totalLatencyMs: 0, lastFailureCode: '' };
  const target = metrics.byModel[model];
  target.requests += 1;
  target.totalLatencyMs += latencyMs;
  target[outcome === 'success' ? 'successes' : 'failures'] += 1;
};

const updatePurposeMetrics = (purpose, outcome, {
  latencyMs = 0,
  inputChars = 0,
  outputChars = 0,
  code = '',
} = {}) => {
  metrics.byPurpose[purpose] ||= {
    requests: 0, successes: 0, failures: 0, fallbackUses: 0,
    safetyRejections: 0, schemaRejections: 0, totalLatencyMs: 0,
    totalInputChars: 0, totalOutputChars: 0, lastFailureCode: '',
  };
  const target = metrics.byPurpose[purpose];
  if (outcome === 'request') target.requests += 1;
  if (outcome === 'success') target.successes += 1;
  if (outcome === 'failure') target.failures += 1;
  if (outcome === 'fallback') target.fallbackUses += 1;
  if (outcome === 'safety') target.safetyRejections += 1;
  if (outcome === 'schema') target.schemaRejections += 1;
  target.totalLatencyMs += Math.max(0, Number(latencyMs) || 0);
  target.totalInputChars += Math.max(0, Number(inputChars) || 0);
  target.totalOutputChars += Math.max(0, Number(outputChars) || 0);
  if (code) target.lastFailureCode = String(code).slice(0, 80);
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
  allowSensitiveOutput = false,
  promptVersion = promptVersionForPurpose(purpose),
} = {}) => {
  const envelope = validateAIMessageEnvelope(messages);
  if (!envelope.safe) {
    metrics.safetyRejections += 1;
    updatePurposeMetrics(purpose, 'safety', { code: envelope.code, inputChars: envelope.textChars });
    const error = new Error('AI message envelope rejected by safety policy.');
    error.code = envelope.code;
    throw error;
  }
  if (!aiConfigured({ vision })) return null;

  const providerPlans = getProviderPlans(vision);
  const timeoutMs = Math.min(30_000, Math.max(2_000, Number(process.env.AI_TIMEOUT_MS || 15_000)));
  const failureThreshold = Math.min(10, Math.max(1, Number(process.env.AI_CIRCUIT_FAILURE_THRESHOLD || 3)));
  const cooldownMs = Math.min(15 * 60_000, Math.max(10_000, Number(process.env.AI_CIRCUIT_COOLDOWN_MS || 60_000)));
  const availableAttempts = providerPlans.reduce((total, plan) => total + (plan.keys.length * plan.models.length), 0);
  const attemptBudget = Math.min(availableAttempts, Math.max(1, maxAttempts));
  let attempts = 0;
  let lastCode = 'AI_PROVIDER_UNAVAILABLE';

  metrics.requests += 1;
  metrics.totalInputChars += envelope.textChars;
  updatePurposeMetrics(purpose, 'request', { inputChars: envelope.textChars });

  for (const provider of providerPlans) {
    for (const model of provider.models) {
      for (let keyIndex = 0; keyIndex < provider.keys.length; keyIndex += 1) {
        if (attempts >= attemptBudget) break;
        const state = getCircuit(model, keyIndex, provider.name);
        if (state.openUntil > Date.now()) continue;
        attempts += 1;
        const startedAt = Date.now();

        try {
          const response = await fetch(providerUrl(provider.url), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${provider.keys[keyIndex]}`,
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
          metrics.schemaRejections += 1;
          updatePurposeMetrics(purpose, 'schema', { code: lastCode });
          throw new Error(lastCode);
        }
        const outputSafety = inspectAIOutput(result, { allowSensitiveText: allowSensitiveOutput });
        if (!outputSafety.safe) {
          lastCode = outputSafety.code;
          metrics.safetyRejections += 1;
          updatePurposeMetrics(purpose, 'safety', { code: lastCode, outputChars: outputSafety.serializedChars });
          throw new Error(lastCode);
        }

        const latencyMs = Date.now() - startedAt;
        metrics.successes += 1;
        metrics.totalLatencyMs += latencyMs;
        metrics.totalOutputChars += outputSafety.serializedChars;
        metrics.lastSuccessAt = new Date();
        updateModelMetrics(model, 'success', latencyMs);
        updatePurposeMetrics(purpose, 'success', { latencyMs, outputChars: outputSafety.serializedChars });
          setCircuit(model, keyIndex, provider.name, { failures: 0, openUntil: 0 });
          return { data: result, meta: { provider: provider.name, model, keySlot: keyIndex + 1, attempts, latencyMs, purpose, promptVersion, safetyVersion: AI_SAFETY_VERSION } };
        } catch (error) {
          const latencyMs = Date.now() - startedAt;
          const nextFailures = state.failures + 1;
          setCircuit(model, keyIndex, provider.name, {
            failures: nextFailures,
            openUntil: nextFailures >= failureThreshold ? Date.now() + cooldownMs : 0,
          });
          updateModelMetrics(model, 'failure', latencyMs);
          metrics.lastFailureAt = new Date();
          lastCode = lastCode || error?.code || error?.name || 'AI_PROVIDER_ERROR';
          metrics.lastFailureCode = lastCode;
        }
      }
      if (attempts >= attemptBudget) break;
    }
    if (attempts >= attemptBudget) break;
  }

  metrics.failures += 1;
  updatePurposeMetrics(purpose, 'failure', { code: lastCode });
  const error = new Error('AI provider attempts were exhausted.');
  error.code = lastCode;
  throw error;
};

const recordFallbackUse = (purpose = 'generic') => {
  metrics.fallbackUses += 1;
  updatePurposeMetrics(purpose, 'fallback');
};

const getAiProviderStatus = () => {
  const models = Object.fromEntries(Object.entries(metrics.byModel).map(([model, value]) => [model, {
    requests: value.requests,
    successes: value.successes,
    failures: value.failures,
    averageLatencyMs: value.requests ? Math.round(value.totalLatencyMs / value.requests) : 0,
    circuitOpen: [...circuitStates.entries()].some(([key, state]) => key.startsWith(`${model}:`) && state.openUntil > Date.now()),
  }]));
  const purposes = Object.fromEntries(Object.entries(metrics.byPurpose).map(([purpose, value]) => [purpose, {
    requests: value.requests,
    successes: value.successes,
    failures: value.failures,
    fallbackUses: value.fallbackUses,
    safetyRejections: value.safetyRejections,
    schemaRejections: value.schemaRejections,
    averageLatencyMs: value.successes ? Math.round(value.totalLatencyMs / value.successes) : 0,
    averageInputChars: value.requests ? Math.round(value.totalInputChars / value.requests) : 0,
    averageOutputChars: value.successes ? Math.round(value.totalOutputChars / value.successes) : 0,
    lastFailureCode: value.lastFailureCode,
  }]));
  return {
    enabled: aiEnabled(),
    configured: aiConfigured(),
    visionConfigured: aiConfigured({ vision: true }),
    requests: metrics.requests,
    successes: metrics.successes,
    failures: metrics.failures,
    fallbackUses: metrics.fallbackUses,
    safetyRejections: metrics.safetyRejections,
    schemaRejections: metrics.schemaRejections,
    successRate: metrics.requests ? Math.round((metrics.successes / metrics.requests) * 100) : 0,
    averageLatencyMs: metrics.successes ? Math.round(metrics.totalLatencyMs / metrics.successes) : 0,
    lastSuccessAt: metrics.lastSuccessAt,
    lastFailureAt: metrics.lastFailureAt,
    lastFailureCode: metrics.lastFailureCode,
    startedAt: metrics.startedAt,
    models,
    purposes,
    promptRegistry: getPromptRegistry(),
    safetyVersion: AI_SAFETY_VERSION,
  };
};

const resetAiProviderStateForTests = () => {
  Object.assign(metrics, {
    startedAt: new Date(), requests: 0, successes: 0, failures: 0, fallbackUses: 0,
    safetyRejections: 0, schemaRejections: 0, totalInputChars: 0, totalOutputChars: 0,
    totalLatencyMs: 0, lastSuccessAt: null, lastFailureAt: null, lastFailureCode: '', byModel: {}, byPurpose: {},
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
