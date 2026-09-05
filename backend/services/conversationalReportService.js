import { normalizeText } from './chatSearchService.js';
import { publicLocationView, resolveLocation } from './locationIntelligenceService.js';

const ITEM_TYPES = [
  { canonical: 'Microphone', category: 'Electronics', aliases: ['microphone', 'mic', 'mics', 'මයික්', 'මයික්‍රොෆෝනය', 'மைக்ரோஃபோன்'] },
  { canonical: 'Mobile phone', category: 'Electronics', aliases: ['phone', 'mobile', 'smartphone', 'fone', 'ෆෝන්', 'දුරකථන', 'மொபைல்', 'தொலைபேசி'] },
  { canonical: 'Wallet', category: 'Personal Accessories', aliases: ['wallet', 'purse', 'moneybag', 'පසුම්බිය', 'පර්ස්', 'பணப்பை', 'பர்ஸ்'] },
  { canonical: 'Bag', category: 'Bags', aliases: ['bag', 'backpack', 'handbag', 'schoolbag', 'බෑග්', 'මල්ල', 'பை', 'பேக்'] },
  { canonical: 'Laptop', category: 'Electronics', aliases: ['laptop', 'notebook computer', 'ලැප්ටොප්', 'மடிக்கணினி', 'லேப்டாப்'] },
  { canonical: 'Charger', category: 'Electronics', aliases: ['charger', 'adapter', 'power adapter', 'චාජර්', 'ඇඩැප්ටර්', 'சார்ஜர்', 'அடாப்டர்'] },
  { canonical: 'Keys', category: 'Keys', aliases: ['keys', 'keyring', 'key', 'යතුරු', 'යතුර', 'சாவிகள்', 'சாவி'] },
  { canonical: 'Glasses', category: 'Personal Accessories', aliases: ['glasses', 'spectacles', 'eyeglasses', 'කණ්ණාඩි', 'ඇස්කණ්ණාඩි', 'கண்ணாடி'] },
  { canonical: 'Identity card', category: 'Cards and Documents', aliases: ['id card', 'identity card', 'student card', 'card', 'හැඳුනුම්පත', 'කාඩ්', 'அடையாள அட்டை', 'கார்டு'] },
  { canonical: 'Book', category: 'Books and Stationery', aliases: ['book', 'textbook', 'notebook', 'පොත', 'நூல்', 'புத்தகம்'] },
  { canonical: 'Earphones', category: 'Electronics', aliases: ['earphones', 'earbuds', 'headphones', 'airpods', 'ඉයර්ෆෝන්', 'இயர்போன்'] },
  { canonical: 'Watch', category: 'Personal Accessories', aliases: ['watch', 'wristwatch', 'ඔරලෝසුව', 'கைக்கடிகாரம்'] },
];

const COLOURS = [
  { canonical: 'Black', aliases: ['black', 'kalu', 'කළු', 'கருப்பு'] },
  { canonical: 'Blue', aliases: ['blue', 'nil', 'නිල්', 'நீலம்'] },
  { canonical: 'Red', aliases: ['red', 'rathu', 'රතු', 'சிவப்பு'] },
  { canonical: 'Green', aliases: ['green', 'kola', 'කොළ', 'பச்சை'] },
  { canonical: 'White', aliases: ['white', 'sudu', 'සුදු', 'வெள்ளை'] },
  { canonical: 'Silver', aliases: ['silver', 'රිදී', 'வெள்ளி'] },
  { canonical: 'Grey', aliases: ['grey', 'gray', 'අළු', 'சாம்பல்'] },
  { canonical: 'Brown', aliases: ['brown', 'දුඹුරු', 'பழுப்பு'] },
  { canonical: 'Pink', aliases: ['pink', 'රෝස', 'இளஞ்சிவப்பு'] },
];

const LOCATION_HINTS = [
  { canonical: 'Canteen', aliases: ['canteen', 'cateen', 'canteen eka', 'kantin', 'ආපනශාලාව', 'கேன்டீன்', 'உணவகம்'] },
];

const includesAlias = (normalized, alias) => normalized.includes(normalizeText(alias));

const localDateTime = (date) => {
  const value = new Date(date);
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 16);
};

const inferDate = (normalized, now) => {
  if (['yesterday', 'ඊයේ', 'நேற்று', 'iye'].some((term) => includesAlias(normalized, term))) {
    return localDateTime(new Date(now.getTime() - 86_400_000));
  }
  if (['today', 'අද', 'இன்று', 'ada'].some((term) => includesAlias(normalized, term))) return localDateTime(now);
  return '';
};

export const buildConversationalReportDraft = ({ message, intent, now = new Date() }) => {
  if (!['lost', 'found'].includes(intent)) return null;
  const original = String(message || '').normalize('NFKC').trim().slice(0, 500);
  const normalized = normalizeText(original);
  const item = ITEM_TYPES.find((candidate) => candidate.aliases.some((alias) => includesAlias(normalized, alias)));
  const colours = COLOURS.filter((colour) => colour.aliases.some((alias) => includesAlias(normalized, alias))).map((colour) => colour.canonical);
  const locationHint = LOCATION_HINTS.find((candidate) => candidate.aliases.some((alias) => includesAlias(normalized, alias)));
  const resolved = resolveLocation(original);
  const locationView = publicLocationView(resolved);
  const location = locationHint?.canonical || (resolved.confidence >= 55 ? locationView?.canonicalName || '' : '');
  const date = inferDate(normalized, now);
  const fields = {
    itemName: item?.canonical || '',
    category: item?.category || '',
    description: original,
    colors: colours.join(', '),
    location,
    date,
    brand: '',
    model: '',
    material: '',
    uniqueFeatures: '',
    tags: [...new Set([item?.canonical, ...colours, location].filter(Boolean))].join(', '),
  };
  const missing = [];
  if (!fields.itemName) missing.push('item name');
  if (!fields.category) missing.push('category');
  if (!fields.location) missing.push('specific location');
  if (!fields.date) missing.push('date/time');
  if (!fields.uniqueFeatures) missing.push('one unique identifying feature');
  const populated = Object.values(fields).filter(Boolean).length;
  const confidence = Math.min(95, 35 + populated * 10 + (item ? 10 : 0) + (location ? 10 : 0));
  return {
    reportType: intent,
    fields,
    missing,
    confidence,
    source: 'Deterministic multilingual draft parser; review required',
    privacyNotice: 'Remove passwords, full card numbers, private addresses and other sensitive identifiers before submission.',
  };
};
