import js from '@eslint/js';

const browserGlobals = {
  AudioContext: 'readonly',
  Blob: 'readonly',
  Event: 'readonly',
  File: 'readonly',
  FormData: 'readonly',
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
  requestAnimationFrame: 'readonly',
  self: 'readonly',
  setInterval: 'readonly',
  setTimeout: 'readonly',
  window: 'readonly',
};

export default [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
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
];
