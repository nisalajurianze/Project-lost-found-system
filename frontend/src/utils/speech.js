export const SPEECH_LOCALE_CANDIDATES = {
  en: ['en-LK', 'en-US', 'en-GB', 'en'],
  // Singlish is spoken Sinhala written with Latin characters. Prefer a
  // Sinhala voice; English is a safe fallback for devices without si-LK.
  singlish: ['si-LK', 'si', 'en-LK', 'en-US', 'en-GB', 'en'],
  si: ['si-LK', 'si'],
  ta: ['ta-LK', 'ta'],
};

export const speechStyleLocale = (style, fallback = 'en-US') => {
  if (style === 'singlish') return 'si-LK';
  if (style === 'si') return 'si-LK';
  if (style === 'ta') return 'ta-LK';
  if (style === 'en') return 'en-US';
  return fallback;
};

export const resolveSpeechSettings = ({ responseStyle, selectedVoice, interfaceLanguage }) => {
  const style = ['en', 'si', 'ta', 'singlish'].includes(responseStyle) ? responseStyle : interfaceLanguage;
  if (selectedVoice && selectedVoice !== 'auto') {
    const baseLanguage = selectedVoice.split('-')[0].toLowerCase();
    return {
      locale: selectedVoice,
      candidates: [selectedVoice, ...(SPEECH_LOCALE_CANDIDATES[baseLanguage] || [baseLanguage])],
    };
  }
  return {
    locale: speechStyleLocale(style),
    candidates: SPEECH_LOCALE_CANDIDATES[style] || SPEECH_LOCALE_CANDIDATES.en,
  };
};

export const selectSpeechVoice = (voices, candidates) => {
  const available = Array.isArray(voices) ? voices : [];
  const normalized = candidates.map((candidate) => candidate.toLowerCase());
  return available.find((voice) => normalized.includes(String(voice.lang || '').toLowerCase()))
    || available.find((voice) => normalized.some((candidate) => String(voice.lang || '').toLowerCase().startsWith(`${candidate.split('-')[0]}-`)))
    || null;
};
