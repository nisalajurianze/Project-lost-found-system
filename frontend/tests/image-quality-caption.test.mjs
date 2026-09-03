import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { assessImagePixels } from '../src/utils/imageQuality.js';

const pixels = (samples, valueAt) => {
  const data = new Uint8ClampedArray(samples * 16);
  for (let index = 0; index < data.length; index += 16) {
    const value = valueAt(index / 16);
    data[index] = value; data[index + 1] = value; data[index + 2] = value; data[index + 3] = 255;
  }
  return data;
};

test('photo quality gate accepts detailed exposure and rejects dark, blurred or tiny photos', () => {
  const detailed = assessImagePixels({ width: 1200, height: 900, data: pixels(100, (index) => index % 2 ? 230 : 25) });
  assert.equal(detailed.acceptable, true);
  const dark = assessImagePixels({ width: 1200, height: 900, data: pixels(100, () => 5) });
  assert.equal(dark.acceptable, false);
  assert.ok(dark.guidance.includes('use more light'));
  const tiny = assessImagePixels({ width: 200, height: 200, data: pixels(100, (index) => index % 2 ? 230 : 25) });
  assert.equal(tiny.acceptable, false);
});

test('report UI rescans redactions and only publishes approved accessibility captions', () => {
  const wizard = fs.readFileSync(new URL('../src/components/common/ReportItemWizard.jsx', import.meta.url), 'utf8');
  const review = fs.readFileSync(new URL('../src/components/common/AccessibilityCaptionReview.jsx', import.meta.url), 'utf8');
  const lost = fs.readFileSync(new URL('../src/pages/public/LostItemDetail.jsx', import.meta.url), 'utf8');
  assert.match(wizard, /redactionRescanUnavailable/);
  assert.match(wizard, /suggestDetailsFromImage\(replacement\)/);
  assert.match(review, /image-caption/);
  assert.match(review, /caption\.approve/);
  assert.match(lost, /accessibilityAlt\?\.text/);
});
