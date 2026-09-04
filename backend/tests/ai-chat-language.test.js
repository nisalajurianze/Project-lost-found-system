import test from 'node:test';
import assert from 'node:assert/strict';
import { handleAIChat, normalizeAssistantResponse, withRelevantItemEmoji } from '../controllers/aiChatController.js';

const invokeChat = (body) => new Promise((resolve, reject) => {
  const response = {
    statusCode: 0,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      resolve({ statusCode: this.statusCode, payload });
      return this;
    },
  };
  handleAIChat({ body, user: null }, response, reject);
});

test('chat fallback keeps Singlish for a generic follow-up when AI is unavailable', async () => {
  const previous = process.env.AI_ENABLED;
  process.env.AI_ENABLED = 'false';
  try {
    const response = await invokeChat({
      message: 'hi',
      locale: 'en',
      conversationStyle: 'singlish',
      history: [
        { role: 'user', content: 'mata kalu phone ekak nathi una' },
        { role: 'assistant', content: 'Hari, mama reports tika balannam.' },
      ],
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.payload.data.responseStyle, 'singlish');
    assert.match(response.payload.data.text, /^Hi! Oya /);
    assert.match(response.payload.data.quickReplies[0], /Kalu phone/);
    assert.match(response.payload.data.actions[0].label, /Nathi una item/);
  } finally {
    if (previous === undefined) delete process.env.AI_ENABLED;
    else process.env.AI_ENABLED = previous;
  }
});

test('chat fallback gives a conversational English greeting instead of a capability dump', async () => {
  const previous = process.env.AI_ENABLED;
  process.env.AI_ENABLED = 'false';
  try {
    const response = await invokeChat({ message: 'hi', locale: 'en', history: [] });
    assert.equal(response.statusCode, 200);
    assert.equal(response.payload.data.responseStyle, 'en');
    assert.match(response.payload.data.text, /^Hi!/);
    assert.doesNotMatch(response.payload.data.text, /I can search lost and found reports/);
    assert.equal(response.payload.data.actions[0].label, 'Report lost item');
  } finally {
    if (previous === undefined) delete process.env.AI_ENABLED;
    else process.env.AI_ENABLED = previous;
  }
});

test('Tamil greeting keeps response, quick replies, and actions in Tamil', async () => {
  const previous = process.env.AI_ENABLED;
  process.env.AI_ENABLED = 'false';
  try {
    const response = await invokeChat({ message: 'வணக்கம்', locale: 'en', history: [] });
    assert.equal(response.statusCode, 200);
    assert.equal(response.payload.data.responseStyle, 'ta');
    assert.match(response.payload.data.text, /வணக்கம்/);
    assert.match(response.payload.data.quickReplies[0], /தொலைபேசி/);
    assert.match(response.payload.data.actions[0].label, /தொலைந்த பொருளை/);
  } finally {
    if (previous === undefined) delete process.env.AI_ENABLED;
    else process.env.AI_ENABLED = previous;
  }
});

test('chat fallback answers a new Singlish request in Singlish', async () => {
  const previous = process.env.AI_ENABLED;
  process.env.AI_ENABLED = 'false';
  try {
    const response = await invokeChat({ message: 'mata', locale: 'en', history: [] });
    assert.equal(response.statusCode, 200);
    assert.equal(response.payload.data.responseStyle, 'singlish');
    assert.match(response.payload.data.text, /^Hariyata hoyanna/);
  } finally {
    if (previous === undefined) delete process.env.AI_ENABLED;
    else process.env.AI_ENABLED = previous;
  }
});

test('adds one relevant item emoji when the model reply omits it', () => {
  const draft = { fields: { itemName: 'Bag', category: 'Bags', description: 'Blue bag' } };
  assert.equal(withRelevantItemEmoji('Thawa location eka denna.', draft), 'Thawa location eka denna. 🎒');
  assert.equal(withRelevantItemEmoji('Bag eka hoyamu 🎒', draft), 'Bag eka hoyamu 🎒');
});

test('general Singlish help stays positive and offers relevant actions', async () => {
  const response = await invokeChat({ message: 'mata help ekak denna', locale: 'en', history: [] });
  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.data.responseStyle, 'singlish');
  assert.match(response.payload.data.text, /udaw karannam/);
  assert.equal(response.payload.data.actions[0].type, 'report_lost');
});

test('provider replies keep a valid reply when optional quick replies are malformed', () => {
  assert.deepEqual(normalizeAssistantResponse({ reply: 'Hari, mama balannam.', quickReplies: 'not-an-array' }), {
    reply: 'Hari, mama balannam.',
    quickReplies: [],
  });
});
