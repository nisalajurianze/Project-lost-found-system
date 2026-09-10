// Category breadcrumbs describe a leaf, not a new category. Keep modifiers
// intact so "Tablet cases" never becomes "Tablet".
const names = ['Tablet', 'Phone', 'Laptop', 'Router', 'Bag', 'Bottle', 'Key', 'Headphone', 'Charger', 'Cable', 'Camera', 'Microphone', 'Wallet', 'Watch', 'Battery'];
const aliases = new Map(names.flatMap((name) => {
  const singular = name.toLowerCase();
  const plural = singular === 'battery' ? 'batteries' : singular === 'watch' ? 'watches' : `${singular}s`;
  return [[singular, name], [plural, name]];
}));
aliases.set('tablet computer', 'Tablet');
aliases.set('tablet computers', 'Tablet');

export const canonicalCategoryName = (value) => {
  const parts = String(value || '').normalize('NFKC').split(/[>›»→]/u);
  const leaf = parts.at(-1).trim().replace(/\s+/gu, ' ');
  return aliases.get(leaf.toLowerCase()) || leaf;
};

export const findEquivalentCategory = (value, categories) => {
  const key = canonicalCategoryName(value).toLowerCase();
  if (!key) return null;
  const matches = categories.filter((category) => category.isActive !== false
    && canonicalCategoryName(category.name).toLowerCase() === key);
  // Prefer the existing flat canonical entry over old breadcrumb duplicates.
  const flat = matches.filter((category) => !/[>›»→]/u.test(category.name));
  const candidates = flat.length ? flat : matches;
  if (!flat.length && candidates.length > 1) {
    return candidates.find((category) => category.name.toLowerCase() === String(value).normalize('NFKC').trim().toLowerCase()) || null;
  }
  return candidates.sort((a, b) => a.name.length - b.name.length || a.name.localeCompare(b.name))[0] || null;
};
