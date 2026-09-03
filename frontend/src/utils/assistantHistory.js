const ASSISTANT_HISTORY_KEY = 'lf-assistant-conversations-v1';
const MAX_ASSISTANT_SESSIONS = 5;
const MAX_ASSISTANT_MESSAGES = 20;
const ASSISTANT_HISTORY_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const normalizePrincipalId = (principalId) => String(principalId || 'guest').trim() || 'guest';
const getAssistantHistoryKey = (principalId) => `${ASSISTANT_HISTORY_KEY}:${encodeURIComponent(normalizePrincipalId(principalId))}`;

const safeId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `conversation-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const sanitizeStoredMessages = (messages = []) => messages
  .filter((message) => message?.role === 'user' || message?.role === 'ai')
  .map((message) => ({
    role: message.role,
    content: String(message.content || '').slice(0, 1000),
    timestamp: String(message.timestamp || '').slice(0, 32),
    ...(['en', 'si', 'ta', 'singlish'].includes(message.responseStyle) ? { responseStyle: message.responseStyle } : {}),
  }))
  .filter((message) => message.content)
  .slice(-MAX_ASSISTANT_MESSAGES);

const conversationTitle = (messages = []) => {
  const firstUserMessage = messages.find((message) => message?.role === 'user' && message?.content)?.content;
  return String(firstUserMessage || 'New conversation').replace(/\s+/g, ' ').trim().slice(0, 56);
};

const createAssistantConversation = ({ id = safeId(), messages = [], now = Date.now(), createdAt, sessionVersion = 0 } = {}) => {
  const storedMessages = sanitizeStoredMessages(messages);
  return {
    id,
    title: conversationTitle(storedMessages),
    createdAt: createdAt || new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
    sessionVersion: Math.max(0, Number.parseInt(sessionVersion, 10) || 0),
    messages: storedMessages,
  };
};

const normalizeConversations = (value, now = Date.now()) => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((conversation) => conversation && typeof conversation.id === 'string')
    .map((conversation) => createAssistantConversation({
      id: conversation.id,
      messages: conversation.messages,
      now: Date.parse(conversation.updatedAt) || now,
      createdAt: conversation.createdAt,
      sessionVersion: conversation.sessionVersion,
    }))
    .filter((conversation) => {
      const updatedAt = Date.parse(conversation.updatedAt);
      return Number.isFinite(updatedAt) && now - updatedAt <= ASSISTANT_HISTORY_TTL_MS;
    })
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .slice(0, MAX_ASSISTANT_SESSIONS);
};

const loadAssistantConversations = ({ principalId = 'guest', storage = globalThis.localStorage, now = Date.now() } = {}) => {
  if (!storage?.getItem) return [];
  const key = getAssistantHistoryKey(principalId);
  storage.removeItem?.(ASSISTANT_HISTORY_KEY);
  try {
    const conversations = normalizeConversations(JSON.parse(storage.getItem(key) || '[]'), now);
    storage.setItem?.(key, JSON.stringify(conversations));
    return conversations;
  } catch {
    storage.removeItem?.(key);
    return [];
  }
};

const saveAssistantConversations = (conversations, { principalId = 'guest', storage = globalThis.localStorage, now = Date.now() } = {}) => {
  const normalized = normalizeConversations(conversations, now);
  storage?.removeItem?.(ASSISTANT_HISTORY_KEY);
  storage?.setItem?.(getAssistantHistoryKey(principalId), JSON.stringify(normalized));
  return normalized;
};

const removeAssistantConversation = (conversationId, options = {}) => {
  const remaining = loadAssistantConversations(options).filter((conversation) => conversation.id !== conversationId);
  return saveAssistantConversations(remaining, options);
};

const clearAssistantConversations = ({ principalId = 'guest', storage = globalThis.localStorage } = {}) => {
  storage?.removeItem?.(getAssistantHistoryKey(principalId));
  storage?.removeItem?.(ASSISTANT_HISTORY_KEY);
};

export {
  ASSISTANT_HISTORY_KEY,
  MAX_ASSISTANT_SESSIONS,
  MAX_ASSISTANT_MESSAGES,
  ASSISTANT_HISTORY_TTL_MS,
  getAssistantHistoryKey,
  createAssistantConversation,
  loadAssistantConversations,
  saveAssistantConversations,
  removeAssistantConversation,
  clearAssistantConversations,
};
