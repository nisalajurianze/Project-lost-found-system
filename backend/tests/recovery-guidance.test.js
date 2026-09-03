import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRecoveryGuidance, isRecoveryQuery } from '../services/recoveryGuidanceService.js';

test('recovery intent recognises multilingual claim and handover questions', () => {
  assert.equal(isRecoveryQuery('How do I claim this item?'), true);
  assert.equal(isRecoveryQuery('safe handover eka krnne kohomada'), true);
  assert.equal(isRecoveryQuery('உரிமை கோருவது எப்படி'), true);
  assert.equal(isRecoveryQuery('show blue bags'), false);
});

test('anonymous recovery guidance requires authentication and protects private details', () => {
  const result = buildRecoveryGuidance({ responseStyle: 'singlish', authenticated: false });
  assert.equal(result.actions[0].type, 'sign_in');
  assert.match(result.text, /sign in/i);
  assert.match(result.safetyNotice, /PIN/);
});

test('state-aware recovery guidance prioritises an existing pending claim', () => {
  const result = buildRecoveryGuidance({ responseStyle: 'en', authenticated: true, summary: { pendingClaims: 1, suggestedMatches: 2 } });
  assert.equal(result.actions[0].type, 'claims');
  assert.match(result.text, /pending claim/i);
});
