import test from 'node:test';
import assert from 'node:assert/strict';
import {
  boundedFuzzyMatch,
  detectLanguage,
  expandKeywords,
  inferIntent,
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
