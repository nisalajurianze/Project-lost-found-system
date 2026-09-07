import test from 'node:test';
import assert from 'node:assert/strict';
import AssistantSession from '../models/AssistantSession.js';
import FoundItem from '../models/FoundItem.js';
import { handleAIChat } from '../controllers/aiChatController.js';

const chat = (body) => new Promise((resolve, reject) => {
  handleAIChat({ body, user: null }, { status() { return this; }, json(payload) { resolve(payload.data); } }, reject);
});

test('guided conversation asks first, searches remembered details, then offers a reviewed draft', async (t) => {
  const previousEnabled = process.env.AI_ENABLED;
  process.env.AI_ENABLED = 'false';
  t.after(() => { if (previousEnabled === undefined) delete process.env.AI_ENABLED; else process.env.AI_ENABLED = previousEnabled; });
  let record;
  t.mock.method(AssistantSession, 'findOne', async () => record || null);
  t.mock.method(AssistantSession, 'create', async (value) => { record = new AssistantSession(value); return record; });
  t.mock.method(AssistantSession, 'findOneAndUpdate', async (query, update) => {
    assert.equal(query.stateVersion, record.stateVersion);
    record.set(update.$set);
    record.stateVersion += 1;
    return record;
  });
  const queries = [];
  t.mock.method(FoundItem, 'find', (query) => {
    queries.push(query);
    const chain = { select() { return this; }, sort() { return this; }, limit() { return this; }, lean: async () => [{
      _id: '6a9c1b828e518e201dfd3ebb', itemName: 'Microphone', category: 'Electronics',
      description: 'A black microphone', colors: ['black'], foundLocation: 'Canteen', status: 'available', foundDate: new Date(),
    }] };
    return chain;
  });
  const base = { sessionId: 'guided-behavior-test', history: [], locale: 'en' };
  let result = await chat({ ...base, message: 'I lost something', sessionVersion: 0 });
  assert.equal(result.sessionState.nextField, 'itemName');
  assert.equal(queries.length, 0);
  result = await chat({ ...base, message: 'microphone', sessionVersion: result.sessionState.version });
  assert.equal(result.sessionState.fields.itemName, 'Microphone');
  assert.equal(result.sessionState.nextField, 'location');
  assert.equal(queries.length, 0);
  result = await chat({ ...base, message: 'canteen yesterday', sessionVersion: result.sessionState.version });
  assert.equal(result.items[0].itemName, 'Microphone');
  assert.match(result.query.message, /Microphone.*Canteen/);
  assert.equal(result.sessionState.nextField, 'uniqueFeatures');
  assert.ok(queries.length > 0);
  assert.equal(result.items[0].url, '/found-items/6a9c1b828e518e201dfd3ebb');
  result = await chat({ ...base, message: 'has a white keytag', sessionVersion: result.sessionState.version });
  assert.equal(result.sessionState.fields.itemName, 'Microphone');
  assert.equal(result.reportDraft.state, 'reviewing');
  assert.doesNotMatch(result.query.message, /keytag|white/);
  assert.notEqual(record.state, 'submitted');
});
