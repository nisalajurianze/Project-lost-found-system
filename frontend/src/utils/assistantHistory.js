const ASSISTANT_HISTORY_KEY = 'lf-assistant-conversations-v1';
const MAX_ASSISTANT_SESSIONS = 5;
const MAX_ASSISTANT_MESSAGES = 20;
const ASSISTANT_HISTORY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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
  }))
  .filter((message) => message.content)
  .slice(-MAX_ASSISTANT_MESSAGES);

const conversationTitle = (messages = []) => {
  const firstUserMessage = messages.find((message) => message?.role === 'user' && message?.content)?.content;
  return String(firstUserMessage || 'New conversation').replace(/\s+/g, ' ').trim().slice(0, 56);
};

const createAssistantConversation = ({ id = safeId(), messages = [], now = Date.now(), createdAt } = {}) => {
  const storedMessages = sanitizeStoredMessages(messages);
  return {
    id,
    title: conversationTitle(storedMessages),
    createdAt: createdAt || new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
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
    }))
    .filter((conversation) => {
      const updatedAt = Date.parse(conversation.updatedAt);
      return Number.isFinite(updatedAt) && now - updatedAt <= ASSISTANT_HISTORY_TTL_MS;
    })
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .slice(0, MAX_ASSISTANT_SESSIONS);
};

const loadAssistantConversations = (storage = globalThis.localStorage, now = Date.now()) => {
  if (!storage?.getItem) return [];
  try {
    const conversations = normalizeConversations(JSON.parse(storage.getItem(ASSISTANT_HISTORY_KEY) || '[]'), now);
    storage.setItem?.(ASSISTANT_HISTORY_KEY, JSON.stringify(conversations));
    return conversations;
  } catch {
    storage.removeItem?.(ASSISTANT_HISTORY_KEY);
    return [];
  }
};

const saveAssistantConversations = (conversations, storage = globalThis.localStorage, now = Date.now()) => {
  const normalized = normalizeConversations(conversations, now);
  storage?.setItem?.(ASSISTANT_HISTORY_KEY, JSON.stringify(normalized));
  return normalized;
};

const removeAssistantConversation = (conversationId, storage = globalThis.localStorage, now = Date.now()) => {
  const remaining = loadAssistantConversations(storage, now).filter((conversation) => conversation.id !== conversationId);
  return saveAssistantConversations(remaining, storage, now);
};

const clearAssistantConversations = (storage = globalThis.localStorage) => {
  storage?.removeItem?.(ASSISTANT_HISTORY_KEY);
};

export {
  ASSISTANT_HISTORY_KEY,
  MAX_ASSISTANT_SESSIONS,
  MAX_ASSISTANT_MESSAGES,
  ASSISTANT_HISTORY_TTL_MS,
  createAssistantConversation,
  loadAssistantConversations,
  saveAssistantConversations,
  removeAssistantConversation,
  clearAssistantConversations,
};
