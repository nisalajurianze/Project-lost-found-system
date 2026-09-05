const normalizeCategoryIcon = (value) => {
  const candidate = String(value || '').normalize('NFKC').trim();
  const emoji = candidate.match(/\p{Extended_Pictographic}(?:[\uFE0E\uFE0F]|\u200D\p{Extended_Pictographic}(?:[\uFE0E\uFE0F])?)*/u);
  return emoji ? emoji[0].slice(0, 10) : '📦';
};

const fallbackCategoryIcon = (value) => {
  const name = String(value || '').normalize('NFKC').trim().toLocaleLowerCase('en-US');
  const exact = ({
    cat: '🐱', kitten: '🐱', dog: '🐶', puppy: '🐶', pet: '🐾',
    phone: '📱', mobile: '📱', electronics: '📱', microphone: '🎙️', mic: '🎙️',
    battery: '🔋', battry: '🔋', charger: '🔌', adapter: '🔌',
    wallet: '👛', key: '🔑', keys: '🔑', bag: '👜',
    ball: '⚽', book: '📚', bottle: '🧴', umbrella: '☂️', glasses: '👓',
  })[name];
  if (exact) return exact;
  const rules = [
    [/\b(?:cat|kitten|feline)\b/u, '🐱'],
    [/\b(?:dog|puppy|canine)\b/u, '🐶'],
    [/\b(?:pet|animal)\b/u, '🐾'],
    [/\b(?:microphone|mic)\b/u, '🎙️'],
    [/\b(?:battery|battry)\b/u, '🔋'],
    [/\b(?:charger|adapter|power)\b/u, '🔌'],
    [/\b(?:phone|mobile|smartphone|electronics)\b/u, '📱'],
    [/\b(?:headphone|earphone|earbuds|airpods)\b/u, '🎧'],
    [/\b(?:wallet|purse)\b/u, '👛'],
    [/\b(?:key|keys|keychain)\b/u, '🔑'],
    [/\b(?:bag|backpack|handbag)\b/u, '👜'],
    [/\b(?:ball|football|soccer)\b/u, '⚽'],
    [/\b(?:book|textbook|notebook)\b/u, '📚'],
    [/\b(?:bottle|flask)\b/u, '🧴'],
    [/\bumbrella\b/u, '☂️'],
    [/\b(?:glasses|spectacles|eyewear)\b/u, '👓'],
  ];
  return rules.find(([pattern]) => pattern.test(name))?.[1] || '📦';
};

export { fallbackCategoryIcon, normalizeCategoryIcon };
