import { boundedFuzzyMatch, normalizeText } from './chatSearchService.js';

const APPROVED_CORRECTIONS = new Map(Object.entries({
  cateen: 'canteen', cantin: 'canteen', canten: 'canteen', libry: 'library', librery: 'library',
  hostal: 'hostel', hostle: 'hostel', walet: 'wallet', wallat: 'wallet', bagg: 'bag',
  fon: 'phone', fone: 'phone', moble: 'mobile', lapto: 'laptop', chargeer: 'charger',
  sammantrai: 'sammanthurai', oluvl: 'oluvil', palamune: 'palamunai',
}));
const VOCABULARY = [...new Set([...APPROVED_CORRECTIONS.values(), 'electronics', 'accessories', 'documents', 'engineering', 'technology'])];
const PROTECTED_IDENTIFIER = /\d|[/\\@#_-]/u;

const correctSearchText = (value) => {
  const original = String(value || '').normalize('NFKC').slice(0, 500);
  const corrections = [];
  const corrected = original.replace(/[\p{L}\p{M}\p{N}_/@#-]+/gu, (token) => {
    const normalized = normalizeText(token);
    if (!normalized || PROTECTED_IDENTIFIER.test(token)) return token;
    const approved = APPROVED_CORRECTIONS.get(normalized);
    if (approved) {
      corrections.push({ original: token, corrected: approved, confidence: 98, applied: true, source: 'admin-approved-dictionary-v1' });
      return approved;
    }
    const fuzzy = VOCABULARY.find((candidate) => boundedFuzzyMatch(normalized, candidate));
    if (fuzzy && fuzzy !== normalized) corrections.push({ original: token, corrected: fuzzy, confidence: 72, applied: false, source: 'bounded-fuzzy-v1' });
    return token;
  });
  return { original, corrected, corrections, didYouMean: corrections.filter((entry) => !entry.applied) };
};

export { APPROVED_CORRECTIONS, correctSearchText };
