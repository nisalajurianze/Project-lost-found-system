const ACCESSIBILITY_PREFERENCES_KEY = 'lf-accessibility-preferences-v1';
const allowedTextScales = new Set(['default', 'large', 'xlarge']);

const DEFAULT_ACCESSIBILITY_PREFERENCES = Object.freeze({
  textScale: 'default',
  highContrast: false,
  reduceMotion: false,
  lowEffects: false,
});

const normalizeAccessibilityPreferences = (value = {}) => ({
  textScale: allowedTextScales.has(value?.textScale) ? value.textScale : 'default',
  highContrast: value?.highContrast === true,
  reduceMotion: value?.reduceMotion === true,
  lowEffects: value?.lowEffects === true,
});

const loadAccessibilityPreferences = (storage = globalThis.localStorage) => {
  if (!storage?.getItem) return { ...DEFAULT_ACCESSIBILITY_PREFERENCES };
  try {
    return normalizeAccessibilityPreferences(JSON.parse(storage.getItem(ACCESSIBILITY_PREFERENCES_KEY) || '{}'));
  } catch {
    storage.removeItem?.(ACCESSIBILITY_PREFERENCES_KEY);
    return { ...DEFAULT_ACCESSIBILITY_PREFERENCES };
  }
};

const applyAccessibilityPreferences = (preferences, root = globalThis.document?.documentElement) => {
  const normalized = normalizeAccessibilityPreferences(preferences);
  if (!root) return normalized;
  root.dataset.textScale = normalized.textScale;
  root.classList.toggle('a11y-high-contrast', normalized.highContrast);
  root.classList.toggle('a11y-reduce-motion', normalized.reduceMotion);
  root.classList.toggle('a11y-low-effects', normalized.lowEffects);
  return normalized;
};

const saveAccessibilityPreferences = (preferences, storage = globalThis.localStorage, root = globalThis.document?.documentElement) => {
  const normalized = applyAccessibilityPreferences(preferences, root);
  storage?.setItem?.(ACCESSIBILITY_PREFERENCES_KEY, JSON.stringify(normalized));
  return normalized;
};

const clearAccessibilityPreferences = (storage = globalThis.localStorage, root = globalThis.document?.documentElement) => {
  storage?.removeItem?.(ACCESSIBILITY_PREFERENCES_KEY);
  return applyAccessibilityPreferences(DEFAULT_ACCESSIBILITY_PREFERENCES, root);
};

export {
  ACCESSIBILITY_PREFERENCES_KEY,
  DEFAULT_ACCESSIBILITY_PREFERENCES,
  normalizeAccessibilityPreferences,
  loadAccessibilityPreferences,
  applyAccessibilityPreferences,
  saveAccessibilityPreferences,
  clearAccessibilityPreferences,
};
