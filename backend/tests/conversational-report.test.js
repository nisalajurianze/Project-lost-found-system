import test from 'node:test';
import assert from 'node:assert/strict';
import { buildConversationalReportDraft } from '../services/conversationalReportService.js';

test('conversation creates a reviewable lost report draft from multilingual details', () => {
  const draft = buildConversationalReportDraft({
    message: 'I lost my black phone yesterday near the SEUSL library',
    intent: 'lost',
    now: new Date('2026-07-26T12:00:00Z'),
  });
  assert.equal(draft.reportType, 'lost');
  assert.equal(draft.fields.itemName, 'Mobile phone');
  assert.equal(draft.fields.category, 'Electronics');
  assert.match(draft.fields.colors, /Black/);
  assert.ok(draft.fields.date);
  assert.ok(draft.fields.description.includes('black phone'));
  assert.ok(draft.missing.includes('one unique identifying feature'));
  assert.match(draft.source, /review required/i);
});

test('draft parser does not create a report for a neutral search and does not invent unknown details', () => {
  assert.equal(buildConversationalReportDraft({ message: 'show phones', intent: 'search' }), null);
  const draft = buildConversationalReportDraft({ message: 'mage ekak nathi una', intent: 'lost' });
  assert.equal(draft.fields.itemName, '');
  assert.equal(draft.fields.location, '');
  assert.ok(draft.missing.includes('item name'));
  assert.ok(draft.missing.includes('specific location'));
});

test('draft parser keeps a typo-tolerant user-provided canteen location', () => {
  const draft = buildConversationalReportDraft({
    message: 'mge bag ek nathi una cateen ekedi',
    intent: 'lost',
  });
  assert.equal(draft.fields.itemName, 'Bag');
  assert.equal(draft.fields.location, 'Canteen');
  assert.equal(draft.missing.includes('specific location'), false);
});
