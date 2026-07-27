import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(frontend, relative), 'utf8');

test('image transform and redaction utilities expose stable error codes instead of user copy', () => {
  const transform = read('src/utils/imageTransform.js');
  const redaction = read('src/utils/imageRedaction.js');
  assert.match(transform, /IMAGE_TRANSFORM_ERROR_CODES/);
  assert.match(redaction, /IMAGE_REDACTION_ERROR_CODES/);
  assert.doesNotMatch(transform, /throw new Error\(['"]The |throw new Error\(['"]Your /);
  assert.doesNotMatch(redaction, /throw new (?:Error|TypeError)\(['"](?:The |A browser|Canvas)/);
});

test('image UI maps technical codes to localized guidance without rendering error.message', () => {
  const upload = read('src/components/common/ImageUpload.jsx');
  const wizard = read('src/components/common/ReportItemWizard.jsx');
  assert.match(upload, /IMAGE_TRANSFORM_ERROR_CODES\.OPEN_FAILED/);
  assert.match(upload, /report\.uploadOpenFailed/);
  assert.doesNotMatch(upload, /toast\.error\(error\.message/);
  assert.match(wizard, /IMAGE_REDACTION_ERROR_CODES\.DECODE_FAILED/);
  assert.match(wizard, /report\.privacyDecodeFailed/);
  assert.doesNotMatch(wizard, /toast\.error\(error\.message/);
});

test('image processing failure guidance has complete trilingual translations', async () => {
  const { translations } = await import('../src/i18n/translations.js');
  const keys = [
    'report.uploadOpenFailed',
    'report.uploadCanvasUnavailable',
    'report.uploadCreateFailed',
    'report.privacyFileRequired',
    'report.privacyDecodeFailed',
    'report.privacyInvalidDimensions',
    'report.privacyCanvasUnavailable',
    'report.privacyCreateFailed',
  ];
  for (const language of ['en', 'si', 'ta']) {
    assert.deepEqual(keys.filter((key) => !translations[language]?.[key]), []);
  }
});
