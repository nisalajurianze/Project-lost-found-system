import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const moduleUrl = new URL('../src/utils/accessibilityPreferences.js', import.meta.url);
const {
  ACCESSIBILITY_PREFERENCES_KEY,
  DEFAULT_ACCESSIBILITY_PREFERENCES,
  normalizeAccessibilityPreferences,
  loadAccessibilityPreferences,
  applyAccessibilityPreferences,
  saveAccessibilityPreferences,
  clearAccessibilityPreferences,
} = await import(moduleUrl);

const makeStorage = (initial = {}) => {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    values,
  };
};

const makeRoot = () => {
  const classes = new Set();
  return {
    dataset: {},
    classList: {
      toggle(name, enabled) {
        if (enabled) classes.add(name);
        else classes.delete(name);
      },
      contains: (name) => classes.has(name),
    },
  };
};

test('accessibility preferences normalise unsupported and unsafe values', () => {
  assert.deepEqual(normalizeAccessibilityPreferences({
    textScale: 'gigantic',
    highContrast: 'true',
    reduceMotion: 1,
    lowEffects: true,
  }), {
    textScale: 'default',
    highContrast: false,
    reduceMotion: false,
    lowEffects: true,
  });
});

test('accessibility preferences persist and apply root display controls', () => {
  const storage = makeStorage();
  const root = makeRoot();
  const saved = saveAccessibilityPreferences({
    textScale: 'xlarge',
    highContrast: true,
    reduceMotion: true,
    lowEffects: true,
  }, storage, root);

  assert.equal(root.dataset.textScale, 'xlarge');
  assert.equal(root.classList.contains('a11y-high-contrast'), true);
  assert.equal(root.classList.contains('a11y-reduce-motion'), true);
  assert.equal(root.classList.contains('a11y-low-effects'), true);
  assert.deepEqual(JSON.parse(storage.getItem(ACCESSIBILITY_PREFERENCES_KEY)), saved);
  assert.deepEqual(loadAccessibilityPreferences(storage), saved);
});

test('invalid storage is removed and reset returns safe defaults', () => {
  const storage = makeStorage({ [ACCESSIBILITY_PREFERENCES_KEY]: '{broken' });
  const root = makeRoot();
  assert.deepEqual(loadAccessibilityPreferences(storage), DEFAULT_ACCESSIBILITY_PREFERENCES);
  assert.equal(storage.getItem(ACCESSIBILITY_PREFERENCES_KEY), null);

  saveAccessibilityPreferences({ highContrast: true, textScale: 'large' }, storage, root);
  assert.deepEqual(clearAccessibilityPreferences(storage, root), DEFAULT_ACCESSIBILITY_PREFERENCES);
  assert.equal(storage.getItem(ACCESSIBILITY_PREFERENCES_KEY), null);
  assert.equal(root.dataset.textScale, 'default');
  assert.equal(root.classList.contains('a11y-high-contrast'), false);
});

test('accessibility UI exposes persisted controls and global CSS hooks', () => {
  const component = fs.readFileSync(new URL('../src/components/common/AccessibilityPreferences.jsx', import.meta.url), 'utf8');
  const css = [
    '../src/index.css',
    '../src/styles/accessibility.css',
  ].map((file) => fs.readFileSync(new URL(file, import.meta.url), 'utf8')).join('\n');
  const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  const main = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');

  for (const token of ['textScale', 'highContrast', 'reduceMotion', 'lowEffects', 'aria-haspopup="dialog"']) {
    assert.match(component, new RegExp(token));
  }
  assert.match(css, /data-text-scale="xlarge"/);
  assert.match(css, /a11y-high-contrast/);
  assert.match(css, /a11y-reduce-motion/);
  assert.match(css, /a11y-low-effects/);
  assert.match(app, /<AccessibilityPreferences\s*\/>/);
  assert.match(main, /applyAccessibilityPreferences\(loadAccessibilityPreferences\(\)\)/);
});
