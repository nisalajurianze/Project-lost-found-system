import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const utility = fs.readFileSync(new URL('../src/utils/imageRedaction.js', import.meta.url), 'utf8');
const wizard = fs.readFileSync(new URL('../src/components/common/ReportItemWizard.jsx', import.meta.url), 'utf8');
const review = fs.readFileSync(new URL('../src/components/common/ImagePrivacyReview.jsx', import.meta.url), 'utf8');

test('privacy redaction creates pixelated replacement files without uploading originals', () => {
  assert.match(utility, /createPrivacySafeImage/);
  assert.match(utility, /imageSmoothingEnabled = false/);
  assert.match(utility, /privacy-safe/);
  assert.match(wizard, /replacement = await createPrivacySafeImage/);
  assert.match(wizard, /replacements\.set\(review\.key, replacement\)/);
  assert.match(wizard, /suggestDetailsFromImage\(replacement\)/);
  assert.match(wizard, /report\.privacyRedacted/);
});

test('every new public image receives an independent privacy review', () => {
  assert.match(wizard, /filesToReview = nextImages\.filter/);
  assert.match(wizard, /for \(const file of filesToReview\)/);
  assert.match(wizard, /normalizeRedactionRegions\(suggestion\.redactionRegions\)/);
  assert.match(wizard, /scanId !== privacyScanId\.current/);
  assert.match(wizard, /images\.length > activeReviews\.length/);
  assert.match(review, /report\.privacyReviewDesc/);
});

test('sensitive or unavailable scans must be resolved before the wizard advances', () => {
  assert.match(wizard, /\['redaction-required', 'manual-review'\]\.includes/);
  assert.match(wizard, /report\.resolvePrivacy/);
  assert.match(review, /report\.privacyPixelate/);
  assert.match(review, /report\.privacyManualConfirm/);
});
