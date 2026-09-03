import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('assistant voice input requires consent and leaves transcript for review', () => {
  const chatbot = read('../src/components/common/AIChatbot.jsx');
  assert.match(chatbot, /voiceConsentRef/);
  assert.match(chatbot, /window\.confirm\(t\('assistant\.voiceConsent'\)\)/);
  assert.match(chatbot, /setInput\(\(previous\).*transcript/);
  assert.doesNotMatch(chatbot, /onresult[\s\S]{0,350}requestAssistant\(transcript/);
});

test('assistant provides local speech output with play and stop controls', () => {
  const chatbot = read('../src/components/common/AIChatbot.jsx');
  assert.match(chatbot, /SpeechSynthesisUtterance/);
  assert.match(chatbot, /speechSynthesis\.cancel/);
  assert.match(chatbot, /assistant\.stopSpeaking/);
});

test('human handoff requires consent and sends only the session reference and reason', () => {
  const chatbot = read('../src/components/common/AIChatbot.jsx');
  assert.match(chatbot, /window\.confirm\(t\('assistant\.handoffConsent'\)\)/);
  assert.match(chatbot, /api\.post\('\/ai\/handoff'/);
  assert.match(chatbot, /sessionId: conversationId/);
  assert.doesNotMatch(chatbot, /messages:\s*messages/);
});

test('notification settings expose confidence threshold and quiet hours', () => {
  const notifications = read('../src/pages/user/Notifications.jsx');
  assert.match(notifications, /minimumMatchConfidence/);
  assert.match(notifications, /quietHours\.enabled/);
  assert.match(notifications, /type="time"/);
});
