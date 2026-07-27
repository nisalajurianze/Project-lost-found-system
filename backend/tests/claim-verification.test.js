import test from 'node:test';
import assert from 'node:assert/strict';
import { buildClaimQuestions, parseVerificationAnswers, assessClaimEvidence } from '../services/claimVerificationService.js';

test('claim questions adapt to item and claim direction without exposing answers', () => {
  const ownerQuestions = buildClaimQuestions({ itemType: 'FoundItem', item: { itemName: 'Black phone', category: 'Electronics' } });
  assert.ok(ownerQuestions.some((entry) => /brand|model|case/i.test(entry.question)));
  assert.ok(ownerQuestions.every((entry) => !/password|pin code/i.test(entry.question)));
  const finderQuestions = buildClaimQuestions({ itemType: 'LostItem', item: { itemName: 'Wallet' } });
  assert.ok(finderQuestions.some((entry) => /safe public handover/i.test(entry.question)));
});

test('verification answers are bounded and evidence assessment is explainable', () => {
  const answers = parseVerificationAnswers(JSON.stringify([
    { question: 'Unique mark?', answer: 'A small silver star sticker below the camera.' },
    { question: 'Last location?', answer: 'Library second floor at about 3:30 PM.' },
  ]));
  const assessment = assessClaimEvidence({ proofDescription: 'I owned this phone and can provide the original box with a matching partial identifier.', files: [{}, {}], verificationAnswers: answers });
  assert.equal(answers.length, 2);
  assert.ok(assessment.score >= 60);
  assert.match(assessment.level, /fair|strong/);
  assert.ok(Array.isArray(assessment.warnings));
});

test('unsafe or malformed verification payloads fail closed', () => {
  assert.throws(() => parseVerificationAnswers('{bad'), /valid JSON/);
  assert.throws(() => parseVerificationAnswers([{ question: 'Q', answer: '' }]), /question and an answer/);
  const assessment = assessClaimEvidence({ proofDescription: 'My password is secret and PIN code is 1234', verificationAnswers: [] });
  assert.ok(assessment.warnings.some((warning) => /Remove passwords/i.test(warning)));
});
