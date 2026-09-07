import test from 'node:test';
import assert from 'node:assert/strict';
import { validateConversationExtraction } from '../services/conversationExtractionService.js';
import { buildConversationalReportDraft } from '../services/conversationalReportService.js';

test('context extraction accepts quoted corrections, rejects fabricated evidence and privileged fields', () => {
  const message = 'phone nemei microphone';
  assert.ok(validateConversationExtraction({ updates: { itemName: { value: 'Microphone', evidence: 'microphone' } } }, message));
  assert.ok(validateConversationExtraction({ updates: {} }, 'hari'));
  assert.ok(!validateConversationExtraction({ updates: { location: { value: 'Canteen', evidence: 'canteen' } } }, message));
  assert.ok(!validateConversationExtraction({ updates: { state: { value: 'submitted', evidence: 'microphone' } } }, message));
  assert.ok(!validateConversationExtraction({ updates: { date: { value: 'not-a-date', evidence: 'microphone' } } }, message));
});

test('fallback parses nouns on word boundaries and does not infer today from arbitrary words', () => {
  const parse = (message) => buildConversationalReportDraft({ message, intent: 'lost', now: new Date('2026-09-08T20:00:00Z') }).fields;
  assert.equal(parse('academic paper').itemName, '');
  assert.equal(parse('bag with keytag').itemName, 'Bag');
  assert.equal(parse('battry').itemName, 'Battery');
  assert.equal(parse('Canada').date, '');
  assert.equal(parse('today').date, '2026-09-09T00:00');
  assert.equal(parse('2026-02-30').date, '');
});
