import js from '@eslint/js';

const browserGlobals = {
  AudioContext: 'readonly',
  Blob: 'readonly',
  CustomEvent: 'readonly',
  Event: 'readonly',
  File: 'readonly',
  FormData: 'readonly',
  Image: 'readonly',
  MutationObserver: 'readonly',
  Notification: 'readonly',
  SpeechRecognition: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  WebSocket: 'readonly',
  alert: 'readonly',
  caches: 'readonly',
  cancelAnimationFrame: 'readonly',
  clearTimeout: 'readonly',
  clearInterval: 'readonly',
  clients: 'readonly',
  confirm: 'readonly',
  console: 'readonly',
  document: 'readonly',
  fetch: 'readonly',
  importScripts: 'readonly',
  localStorage: 'readonly',
  navigator: 'readonly',
  performance: 'readonly',
  requestAnimationFrame: 'readonly',
  createImageBitmap: 'readonly',
  self: 'readonly',
  sessionStorage: 'readonly',
  setInterval: 'readonly',
  setTimeout: 'readonly',
  window: 'readonly',
  process: 'readonly',
};

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: browserGlobals,
    },
    rules: {
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['src/i18n/translations.js'],
    rules: {
      'no-useless-escape': 'off',
    },
  },
];
