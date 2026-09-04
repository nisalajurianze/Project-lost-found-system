import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveSpeechSettings,
  selectSpeechVoice,
  speechStyleLocale,
} from '../src/utils/speech.js';

test('Singlish speech uses a Sinhala locale and prefers an installed matching voice', () => {
  const settings = resolveSpeechSettings({ responseStyle: 'singlish', selectedVoice: 'auto', interfaceLanguage: 'ta' });
  assert.equal(settings.locale, 'si-LK');
  assert.equal(selectSpeechVoice([{ lang: 'ta-LK' }, { lang: 'si-LK' }], settings.candidates)?.lang, 'si-LK');
});

test('manual voice choice remains respected while auto recognition follows the interface language', () => {
  const manual = resolveSpeechSettings({ responseStyle: 'singlish', selectedVoice: 'si-LK', interfaceLanguage: 'en' });
  assert.equal(manual.locale, 'si-LK');
  assert.equal(selectSpeechVoice([{ lang: 'si-LK' }], manual.candidates)?.lang, 'si-LK');
  assert.equal(speechStyleLocale('si'), 'si-LK');
  assert.equal(speechStyleLocale('ta'), 'ta-LK');
});
