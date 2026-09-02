import test from 'node:test';
import assert from 'node:assert/strict';
import { handleAIChat } from '../controllers/aiChatController.js';

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
