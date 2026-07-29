import test from 'node:test';
import assert from 'node:assert/strict';
import {
  boundedFuzzyMatch,
  detectLanguage,
  expandKeywords,
  inferIntent,
  resolveConversationLanguage,
  resolveSearchMessage,
  scoreCandidate,
} from '../services/chatSearchService.js';

test('multilingual and Singlish terms expand to shared searchable concepts', () => {
  const terms = expandKeywords('mage kalu phone eka library laga nathi una');
  assert.ok(terms.includes('phone'));
  assert.ok(terms.includes('black'));
  assert.ok(terms.includes('library'));
  assert.equal(inferIntent('mage phone eka nathi una'), 'lost');
  assert.equal(detectLanguage('මගේ phone එක නැති වුණා'), 'si');
  assert.equal(detectLanguage('என் phone காணாமல் போனது'), 'ta');
});

test('show-more follow-up reuses the most recent material user query', () => {
  const resolved = resolveSearchMessage('show more', [
    { role: 'user', content: 'black Samsung phone near library' },
    { role: 'ai', content: 'Six results found' },
  ]);
  assert.equal(resolved, 'black Samsung phone near library');
});

test('follow-up responses preserve the language of the material conversation context', () => {
  const language = resolveConversationLanguage('show more', [
    { role: 'user', content: '\u0DB8\u0D9C\u0DDA black phone \u0D91\u0D9A library \u0DC5\u0D9F \u0DB1\u0DD0\u0DAD\u0DD2 \u0DC0\u0DD4\u0DAB\u0DCF' },
    { role: 'ai', content: 'results' },
  ]);
  assert.equal(language, 'si');
});

test('weighted ranking rewards matching name, colour and location', () => {
  const query = 'black phone near library';
  const terms = expandKeywords(query);
  const strong = scoreCandidate({
    itemName: 'Black Samsung Phone', category: 'Electronics', description: 'Blue cover with a crack', foundLocation: 'Main Library entrance', tags: ['mobile'], foundDate: new Date(),
  }, query, terms);
  const weak = scoreCandidate({
    itemName: 'Brown Wallet', category: 'Accessories', description: 'Leather purse', foundLocation: 'Sports ground', foundDate: new Date(),
  }, query, terms);
  assert.ok(strong.score > weak.score);
  assert.ok(strong.reasons.some((reason) => /Item name|Location/.test(reason)));
});

test('bounded fuzzy matching catches small spelling mistakes but rejects unrelated words', () => {
  assert.equal(boundedFuzzyMatch('samsng', 'samsung'), true);
  assert.equal(boundedFuzzyMatch('wallet', 'laptop'), false);
});
