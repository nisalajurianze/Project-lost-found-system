const AI_SAFETY_VERSION = 'ai-safety-v1';
const ALLOWED_ROLES = new Set(['system', 'user', 'assistant']);
const ALLOWED_CONTENT_TYPES = new Set(['text', 'image_url']);

const PROMPT_INJECTION_RULES = [
  /\b(?:ignore|disregard|override|forget)\b.{0,60}\b(?:previous|prior|system|developer|hidden)\b.{0,40}\b(?:instruction|instructions|prompt|message|policy|rules?)\b/iu,
  /\b(?:reveal|show|print|repeat|leak|expose)\b.{0,50}\b(?:system|developer|hidden)\b.{0,30}\b(?:prompt|message|instruction|policy|secret)\b/iu,
  /\b(?:bypass|disable|evade)\b.{0,50}\b(?:safety|guardrail|filter|moderation|authorization|authentication)\b/iu,
  /\b(?:call|invoke|execute)\b.{0,30}\b(?:tool|function|command|shell)\b.{0,40}\b(?:without|bypass|ignore)\b/iu,
];

const SECRET_RULES = [
  /\b(?:api[_ -]?key|secret[_ -]?key|password|passwd|cvv|pin)\s*[:=]\s*\S{4,}/iu,
  /\b(?:sk|pk|rk)-[a-z0-9_-]{16,}\b/iu,
  /\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/u,
];

const PRIVATE_OUTPUT_RULES = [
  /\b(?:\d[ -]*?){12,19}\b/u,
  /\b(?:\+?94|0)\d{9}\b/u,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu,
  ...SECRET_RULES,
];

const normalizeText = (value) => String(value || '')
  .normalize('NFKC')
  .split('')
  .filter((character) => {
    const code = character.charCodeAt(0);
    return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127);
  })
  .join('')
  .replace(/\s+/g, ' ')
  .trim();

const redactPrivateText = (value) => normalizeText(value)
  .replace(/\b(?:\d[ -]*?){12,19}\b/gu, (match) => `****${match.replace(/\D/g, '').slice(-4)}`)
  .replace(/\b(?:\+?94|0)\d{9}\b/gu, (match) => `******${match.replace(/\D/g, '').slice(-4)}`)
  .replace(/\b([A-Z0-9._%+-]{1,2})[A-Z0-9._%+-]*@([A-Z0-9.-]+\.[A-Z]{2,})\b/giu, '$1***@$2')
  .replace(/\b(?:sk|pk|rk)-[a-z0-9_-]{16,}\b/giu, '[REDACTED_KEY]')
  .replace(/\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/gu, '[REDACTED_TOKEN]')
  .replace(/\b((?:api[_ -]?key|secret[_ -]?key|password|passwd|cvv|pin)\s*[:=]\s*)\S{4,}/giu, '$1[REDACTED]');

const inspectAIInput = (value, { maxLength = 500 } = {}) => {
  const normalized = normalizeText(value);
  const issues = [];
  if (!normalized) issues.push('EMPTY_INPUT');
  if (normalized.length > maxLength) issues.push('INPUT_TOO_LONG');
  if (PROMPT_INJECTION_RULES.some((rule) => rule.test(normalized))) issues.push('PROMPT_INJECTION');
  if (SECRET_RULES.some((rule) => rule.test(normalized))) issues.push('SECRET_IN_INPUT');
  const redactedText = redactPrivateText(normalized.slice(0, maxLength));
  if (redactedText !== normalized.slice(0, maxLength)) issues.push('PRIVATE_DATA_REDACTED');
  return {
    safe: !issues.some((issue) => ['EMPTY_INPUT', 'INPUT_TOO_LONG', 'PROMPT_INJECTION', 'SECRET_IN_INPUT'].includes(issue)),
    normalized,
    redactedText,
    issues: [...new Set(issues)],
    version: AI_SAFETY_VERSION,
  };
};

const contentTextLength = (content) => {
  if (typeof content === 'string') return content.length;
  if (!Array.isArray(content)) return -1;
  return content.reduce((sum, part) => sum + (part?.type === 'text' ? String(part.text || '').length : 0), 0);
};

const isSafeImageReference = (value) => {
  const input = String(value || '');
  if (/^data:image\/(?:jpeg|jpg|png|webp|gif);base64,/iu.test(input)) return input.length <= 15_000_000;
  try {
    const parsed = new URL(input);
    return parsed.protocol === 'https:' && Boolean(parsed.hostname) && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
};

const validateAIMessageEnvelope = (messages, { maxMessages = 20, maxTextChars = 30_000 } = {}) => {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > maxMessages) {
    return { safe: false, code: 'INVALID_MESSAGE_COUNT', textChars: 0 };
  }
  let textChars = 0;
  for (const message of messages) {
    if (!message || !ALLOWED_ROLES.has(message.role)) return { safe: false, code: 'INVALID_MESSAGE_ROLE', textChars };
    const length = contentTextLength(message.content);
    if (length < 0) return { safe: false, code: 'INVALID_MESSAGE_CONTENT', textChars };
    textChars += length;
    if (Array.isArray(message.content)) {
      for (const part of message.content) {
        if (!part || !ALLOWED_CONTENT_TYPES.has(part.type)) return { safe: false, code: 'INVALID_CONTENT_PART', textChars };
        if (part.type === 'image_url' && !isSafeImageReference(part.image_url?.url)) return { safe: false, code: 'UNSAFE_IMAGE_REFERENCE', textChars };
      }
    }
  }
  return { safe: textChars <= maxTextChars, code: textChars <= maxTextChars ? 'OK' : 'MESSAGE_BUDGET_EXCEEDED', textChars };
};

const inspectAIOutput = (value, { allowSensitiveText = false, maxSerializedChars = 60_000 } = {}) => {
  let serialized;
  try { serialized = JSON.stringify(value); } catch { return { safe: false, code: 'UNSERIALIZABLE_OUTPUT', serializedChars: 0 }; }
  if (!serialized || serialized.length > maxSerializedChars) return { safe: false, code: 'OUTPUT_BUDGET_EXCEEDED', serializedChars: serialized?.length || 0 };
  if (/"(?:__proto__|prototype|constructor)"\s*:/u.test(serialized)) return { safe: false, code: 'UNSAFE_OBJECT_KEY', serializedChars: serialized.length };
  if (!allowSensitiveText && PRIVATE_OUTPUT_RULES.some((rule) => rule.test(serialized))) {
    return { safe: false, code: 'PRIVATE_DATA_IN_OUTPUT', serializedChars: serialized.length };
  }
  return { safe: true, code: 'OK', serializedChars: serialized.length };
};

export {
  AI_SAFETY_VERSION,
  inspectAIInput,
  inspectAIOutput,
  isSafeImageReference,
  normalizeText,
  redactPrivateText,
  validateAIMessageEnvelope,
};
