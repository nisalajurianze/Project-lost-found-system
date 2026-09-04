const normalizeCategoryIcon = (value) => {
  const candidate = String(value || '').normalize('NFKC').trim();
  const emoji = candidate.match(/\p{Extended_Pictographic}(?:[\uFE0E\uFE0F]|\u200D\p{Extended_Pictographic}(?:[\uFE0E\uFE0F])?)*/u);
  return emoji ? emoji[0].slice(0, 10) : '📦';
};

const fallbackCategoryIcon = (value) => {
  const name = String(value || '').normalize('NFKC').trim().toLocaleLowerCase('en-US');
  return ({
    cat: '🐱', kitten: '🐱', dog: '🐶', puppy: '🐶', pet: '🐾',
    phone: '📱', wallet: '👛', key: '🔑', keys: '🔑', bag: '👜',
    ball: '⚽', book: '📚', bottle: '🧴', umbrella: '☂️', glasses: '👓',
  })[name] || '📦';
};

export { fallbackCategoryIcon, normalizeCategoryIcon };
