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
    assert.match(response.payload.data.text, /^Mata /);
    assert.match(response.payload.data.quickReplies[0], /Kalu phone/);
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
