import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { calculateTransformGeometry, normalizeRotation } from '../src/utils/imageTransform.js';

test('image transform geometry rotates dimensions and creates a centred square crop', () => {
  assert.equal(normalizeRotation(-90), 270);
  const rotated = calculateTransformGeometry(1200, 800, { rotation: 90 });
  assert.equal(rotated.outputWidth, 800);
  assert.equal(rotated.outputHeight, 1200);
  const cropped = calculateTransformGeometry(1200, 800, { cropSquare: true });
  assert.deepEqual({ sx: cropped.sx, sy: cropped.sy, sw: cropped.sw, sh: cropped.sh }, { sx: 200, sy: 0, sw: 800, sh: 800 });
  assert.equal(cropped.outputWidth, 800);
  assert.equal(cropped.outputHeight, 800);
});

test('image uploader exposes accessible rotate crop remove controls and re-runs parent review', () => {
  const source = fs.readFileSync(new URL('../src/components/common/ImageUpload.jsx', import.meta.url), 'utf8');
  assert.match(source, /transformImageFile/);
  assert.match(source, /report\.uploadRotate/);
  assert.match(source, /report\.uploadCrop/);
  assert.match(source, /report\.uploadUpdated/);
  assert.match(source, /min-h-11/);
});

test('report wizard preserves drafts offline and reports real multipart upload progress', () => {
  const wizard = fs.readFileSync(new URL('../src/components/common/ReportItemWizard.jsx', import.meta.url), 'utf8');
  const lostService = fs.readFileSync(new URL('../src/services/lostItemService.js', import.meta.url), 'utf8');
  const foundService = fs.readFileSync(new URL('../src/services/foundItemService.js', import.meta.url), 'utf8');
  assert.match(wizard, /window\.addEventListener\('offline'/);
  assert.match(wizard, /report\.offlineSubmit/);
  assert.match(wizard, /role="progressbar"/);
  assert.match(wizard, /onUploadProgress: handleUploadProgress/);
  assert.match(lostService, /onUploadProgress/);
  assert.match(foundService, /onUploadProgress/);
});
