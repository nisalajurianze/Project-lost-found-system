import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

const main = read('../src/main.jsx');
const coreCss = read('../src/index.css');
const dashboardCss = read('../src/styles/dashboard.css');
const motionCss = read('../src/styles/motion.css');
const accessibilityCss = read('../src/styles/accessibility.css');
const spaceBackground = read('../src/components/common/SpaceBackground.jsx');

test('design-system styles are split into ordered modules', () => {
  const stylePaths = [
    './index.css',
    './styles/dashboard.css',
    './styles/motion.css',
    './styles/accessibility.css',
  ];

  let previous = -1;
  for (const stylePath of stylePaths) {
    const index = main.indexOf(stylePath);
    assert.ok(index > previous, `${stylePath} must exist in cascade order`);
    previous = index;
  }

  assert.ok(coreCss.split('\n').length < 600, 'core stylesheet should remain maintainable');
  assert.match(dashboardCss, /PREMIUM DASHBOARD STYLES/);
  assert.match(motionCss, /ANIMATIONS \(outside layers for global use\)/);
  assert.match(accessibilityCss, /Accessibility and low-power behaviour/);
});

test('card styles avoid persistent compositor promotion', () => {
  assert.doesNotMatch(coreCss, /will-change:\s*transform,\s*box-shadow/);
  assert.match(coreCss, /will-change:\s*auto/);
  assert.match(accessibilityCss, /@media \(hover: none\), \(pointer: coarse\)/);
});

test('space animation adapts to motion, data and device constraints', () => {
  assert.match(spaceBackground, /prefers-reduced-motion: reduce/);
  assert.match(spaceBackground, /prefers-reduced-data: reduce/);
  assert.match(spaceBackground, /visibilitychange/);
  assert.match(spaceBackground, /handleResize[\s\S]*reducedMotion[\s\S]*startAnimation/);
  assert.match(spaceBackground, /performanceMode\.mobile \? 360 : 900/);
  assert.match(spaceBackground, /performanceMode\.mobile \? 180 : 320/);
  assert.match(spaceBackground, /\? 120/);
  assert.match(spaceBackground, /targetFps[\s\S]*\? 30 : 60/);
});

test('space canvas is decorative and reduced motion renders one static frame', () => {
  assert.match(spaceBackground, /aria-hidden="true"/);
  assert.match(spaceBackground, /role="presentation"/);
  assert.match(spaceBackground, /if \(!performanceMode\.reducedMotion\) \{[\s\S]*requestAnimationFrame\(animate\)/);
});
