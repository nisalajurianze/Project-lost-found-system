import test from 'node:test';
import assert from 'node:assert/strict';
import AssistantSession from '../models/AssistantSession.js';
import { advanceConversationState, sessionKeyFor } from '../services/conversationStateService.js';

const now = new Date('2026-09-03T08:00:00.000Z');

test('conversation remembers slots and asks exactly one highest-priority missing detail', () => {
  const first = advanceConversationState({
    message: 'mge black bag eka nathi una cateen ekedi yesterday',
    intent: 'lost',
    responseStyle: 'singlish',
    now,
  });
  assert.equal(first.fields.itemName, 'Bag');
  assert.equal(first.fields.colors, 'Black');
  assert.equal(first.fields.location, 'Canteen');
  assert.ok(first.fields.date);
  assert.deepEqual(first.missing, ['uniqueFeatures']);
  assert.match(first.question, /wenama lakunayak/i);
  assert.equal(first.question.includes('?'), true);

  const second = advanceConversationState({
    previousState: first,
    message: 'zip eka laga small white star sticker ekak tiyenawa',
    intent: 'search',
    responseStyle: 'singlish',
    now,
  });
  assert.equal(second.fields.uniqueFeatures, 'zip eka laga small white star sticker ekak tiyenawa');
  assert.equal(second.missing.length, 0);
  assert.equal(second.question, '');
  assert.equal(second.state, 'reviewing');
});

test('explicit correction changes only the relevant slots and keeps unrelated details', () => {
  const first = advanceConversationState({
    message: 'mge black bag eka nathi una cateen ekedi yesterday', intent: 'lost', responseStyle: 'singlish', now,
  });
  const corrected = advanceConversationState({
    previousState: first,
    message: 'na, bag eka blue',
    intent: 'search',
    responseStyle: 'singlish',
    now,
  });
  assert.equal(corrected.fields.colors, 'Blue');
  assert.equal(corrected.fields.itemName, 'Bag');
  assert.equal(corrected.fields.location, 'Canteen');
  assert.equal(corrected.fields.date, first.fields.date);
  assert.deepEqual(corrected.changedThisTurn.map(({ field }) => field), ['colors']);
  assert.equal(corrected.changedThisTurn[0].operation, 'replace');
});

test('recognized item follow-ups replace the old item without filling another missing slot', () => {
  const first = advanceConversationState({ message: 'I lost a mobile phone', intent: 'lost', responseStyle: 'singlish', now });
  const corrected = advanceConversationState({ previousState: first, message: 'microphone', intent: 'search', responseStyle: 'singlish', now });
  assert.equal(corrected.fields.itemName, 'Microphone');
  assert.equal(corrected.fields.category, 'Electronics');
  assert.equal(corrected.fields.location, '');
  assert.equal(corrected.nextField, 'location');
});

test('undo restores the last corrected field without clearing other slots', () => {
  const first = advanceConversationState({ message: 'I lost a black bag yesterday at canteen', intent: 'lost', now });
  const corrected = advanceConversationState({ previousState: first, message: 'no, it was blue', intent: 'search', now });
  const undone = advanceConversationState({ previousState: corrected, message: 'undo', intent: 'search', now });
  assert.equal(undone.fields.colors, 'Black');
  assert.equal(undone.fields.location, 'Canteen');
  assert.equal(undone.changedThisTurn[0].operation, 'undo');
});

test('found-item collection requests safe storage after core identifying details', () => {
  const first = advanceConversationState({
    message: 'I found a blue phone today at canteen', intent: 'found', responseStyle: 'en', now,
  });
  assert.deepEqual(first.missing, ['uniqueFeatures', 'storedAt']);
  const unique = advanceConversationState({ previousState: first, message: 'cracked glass near camera', intent: 'search', responseStyle: 'en', now });
  assert.equal(unique.nextField, 'storedAt');
  assert.match(unique.question, /kept safely/i);
  const stored = advanceConversationState({ previousState: unique, message: 'security office locker', intent: 'search', responseStyle: 'en', now });
  assert.equal(stored.state, 'reviewing');
  assert.equal(stored.fields.storedAt, 'security office locker');
});

test('assistant session identifiers are stored as hashes and state has a TTL index', () => {
  assert.equal(sessionKeyFor('browser-session-1').length, 64);
  assert.doesNotMatch(sessionKeyFor('browser-session-1'), /browser-session/);
  const ttlIndex = AssistantSession.schema.indexes().find(([keys, options]) => keys.expiresAt === 1 && options.expireAfterSeconds === 0);
  assert.ok(ttlIndex);
});
