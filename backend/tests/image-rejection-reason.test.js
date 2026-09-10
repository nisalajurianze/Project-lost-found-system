import test from 'node:test';
import assert from 'node:assert/strict';
import { imageRejectionReason, imageRejectionMessages } from '../utils/imageRejectionReason.js';

test('rejection explanations are controlled and distinguish common reasons', () => {
  for (const [input, expected] of [
    [{ safetyLabels: ['nudity'], isItemPhoto: false }, 'sexual'],
    [{ safetyLabels: ['graphic violence'] }, 'unsafe'],
    [{ safetyLabels: ['movie poster'] }, 'nonItem'],
    [{ isSpam: true }, 'spam'],
    [{ isItemPhoto: false }, 'nonItem'],
    [{ imageQuality: 'poor' }, 'quality'],
    [{ rejectionReason: 'private raw text', safetyLabels: null }, 'rejected'],
  ]) {
    assert.equal(imageRejectionReason(input), expected);
    assert.ok(imageRejectionMessages[expected].startsWith('Photo removed:'));
    assert.ok(!imageRejectionMessages[expected].includes('unavailable'));
  }
});
