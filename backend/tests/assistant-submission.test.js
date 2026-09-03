import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import AssistantSubmission from '../models/AssistantSubmission.js';
import LostItem from '../models/LostItem.js';
import FoundItem from '../models/FoundItem.js';
import { CONFIRMATION_TTL_MS, tokenMatches } from '../services/assistantReportSubmissionService.js';

test('assistant confirmation token comparison is exact and confirmation is short lived', () => {
  const token = 'single-use-confirmation-token';
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  assert.equal(tokenMatches(token, hash), true);
  assert.equal(tokenMatches(`${token}-changed`, hash), false);
  assert.equal(CONFIRMATION_TTL_MS, 10 * 60 * 1000);
});

test('one confirmation exists per assistant session and item creation is idempotent', () => {
  const sessionIndex = AssistantSubmission.schema.indexes().find(([keys, options]) => keys.sessionKey === 1 && options.unique);
  assert.ok(sessionIndex);
  for (const Model of [LostItem, FoundItem]) {
    const submissionIndex = Model.schema.indexes().find(([keys, options]) => keys.assistantSubmissionId === 1 && options.unique && options.sparse);
    assert.ok(submissionIndex);
  }
});

test('assistant confirmations expire automatically', () => {
  const ttlIndex = AssistantSubmission.schema.indexes().find(([keys, options]) => keys.expiresAt === 1 && options.expireAfterSeconds === 0);
  assert.ok(ttlIndex);
});
