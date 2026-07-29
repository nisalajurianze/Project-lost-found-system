const ENCODED_PATH_SEPARATOR = /%(?:2f|5c)/i;
const INTERNAL_ORIGIN = 'https://smart-lf.internal';
const hasControlCharacters = (value) => [...value].some((character) => {
  const code = character.charCodeAt(0);
  return code <= 31 || code === 127;
});

export const isSafeInternalPath = (value) => {
  if (typeof value !== 'string') return false;
  const candidate = value.trim();
  if (
    !candidate.startsWith('/')
    || candidate.startsWith('//')
    || candidate.includes('\\')
    || hasControlCharacters(candidate)
    || ENCODED_PATH_SEPARATOR.test(candidate)
  ) return false;

  try {
    return new URL(candidate, INTERNAL_ORIGIN).origin === INTERNAL_ORIGIN;
  } catch {
    return false;
  }
};

export const toSafeInternalPath = (value, fallback = '/') => {
  if (!isSafeInternalPath(value)) return fallback;
  const parsed = new URL(value.trim(), INTERNAL_ORIGIN);
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
};
