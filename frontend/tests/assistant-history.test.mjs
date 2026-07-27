import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  ASSISTANT_HISTORY_TTL_MS,
  createAssistantConversation,
  loadAssistantConversations,
  saveAssistantConversations,
} from '../src/utils/assistantHistory.js';

const createStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
};

test('assistant history keeps only bounded text messages and excludes structured private payloads', () => {
  const conversation = createAssistantConversation({
    id: 'one',
    now: Date.UTC(2026, 6, 26),
    messages: [
      { role: 'user', content: 'black wallet near library', reportDraft: { private: true } },
      { role: 'ai', content: 'I found possible reports.', items: [{ private: true }], personalSummary: { claims: 2 } },
      { role: 'system', content: 'do not persist' },
    ],
  });
  assert.equal(conversation.messages.length, 2);
  assert.deepEqual(Object.keys(conversation.messages[1]).sort(), ['content', 'role', 'timestamp']);
  assert.equal(conversation.title, 'black wallet near library');
});

test('assistant history expires old sessions and keeps at most five recent conversations', () => {
  const storage = createStorage();
  const now = Date.UTC(2026, 6, 26);
  const conversations = Array.from({ length: 7 }, (_, index) => createAssistantConversation({
    id: `session-${index}`,
    now: now - index * 1000,
    messages: [{ role: 'user', content: `query ${index}` }],
  }));
  conversations.push(createAssistantConversation({
    id: 'expired',
    now: now - ASSISTANT_HISTORY_TTL_MS - 1000,
    messages: [{ role: 'user', content: 'old query' }],
  }));
  saveAssistantConversations(conversations, storage, now);
  const loaded = loadAssistantConversations(storage, now);
  assert.equal(loaded.length, 5);
  assert.equal(loaded.some((conversation) => conversation.id === 'expired'), false);
  assert.equal(loaded[0].id, 'session-0');
});

test('assistant UI exposes explicit local history and new-conversation controls', () => {
  const source = fs.readFileSync(new URL('../src/components/common/AIChatbot.jsx', import.meta.url), 'utf8');
  assert.match(source, /assistant\.historyTitle/);
  assert.match(source, /assistant\.historyDesc/);
  assert.match(source, /assistant\.historyDesc/);
  assert.match(source, /beginNewConversation/);
  assert.match(source, /clearAllConversationHistory/);
});
