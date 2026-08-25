import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ASSISTANT_REPORT_DRAFT_TTL_MS,
  consumeAssistantReportDraft,
  getAssistantReportDraftKey,
  saveAssistantReportDraft,
} from '../src/utils/assistantReportDraft.js';

const createStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
};

test('assistant report drafts are principal-scoped, time-limited, and consumed once', () => {
  const storage = createStorage();
  const now = Date.UTC(2026, 6, 26);
  saveAssistantReportDraft({ reportType: 'lost', fields: { itemName: 'Wallet' } }, { principalId: 'user-a', storage, now });
  assert.ok(storage.getItem(getAssistantReportDraftKey('user-a')));
  assert.equal(consumeAssistantReportDraft({ principalId: 'user-b', reportType: 'lost', storage, now }), null);
  assert.equal(consumeAssistantReportDraft({ principalId: 'user-a', reportType: 'lost', storage, now })?.fields.itemName, 'Wallet');
  assert.equal(consumeAssistantReportDraft({ principalId: 'user-a', reportType: 'lost', storage, now }), null);
});

test('expired or wrong-workflow assistant drafts cannot hydrate a report', () => {
  const storage = createStorage();
  const now = Date.UTC(2026, 6, 26);
  saveAssistantReportDraft({ reportType: 'found', fields: { itemName: 'Phone' } }, { principalId: 'user-a', storage, now });
  assert.equal(consumeAssistantReportDraft({ principalId: 'user-a', reportType: 'lost', storage, now }), null);
  saveAssistantReportDraft({ reportType: 'lost', fields: { itemName: 'Phone' } }, { principalId: 'user-a', storage, now });
  assert.equal(consumeAssistantReportDraft({ principalId: 'user-a', reportType: 'lost', storage, now: now + ASSISTANT_REPORT_DRAFT_TTL_MS + 1 }), null);
});
