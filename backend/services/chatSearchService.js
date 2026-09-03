const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'have', 'from', 'was', 'were', 'what', 'where',
  'lost', 'found', 'find', 'item', 'items', 'something', 'please', 'help', 'mage', 'eka', 'ekak',
  'nathi', 'una', 'hambuna', 'thiyenawa', 'tiyenawa', 'mama', 'mata', 'api', 'can', 'you',
  'මගේ', 'එක', 'නැති', 'වුණා', 'හමු', 'වුණේ', 'මට', 'உடைய', 'என்', 'காணாமல்', 'கிடைத்தது',
]);

const TERM_GROUPS = [
  ['phone', 'mobile', 'smartphone', 'telephone', 'fone', 'ෆෝන්', 'දුරකථන', 'தொலைபேசி', 'மொபைல்'],
  ['wallet', 'purse', 'moneybag', 'පසුම්බිය', 'පර්ස්', 'பணப்பை', 'பர்ஸ்'],
  ['bag', 'backpack', 'schoolbag', 'handbag', 'බෑග්', 'මල්ල', 'பை', 'பேக்'],
  ['laptop', 'notebook', 'computer', 'ලැප්ටොප්', 'පරිගණකය', 'மடிக்கணினி', 'லேப்டாப்'],
  ['charger', 'adapter', 'poweradapter', 'චාජර්', 'ඇඩැප්ටර්', 'சார்ஜர்', 'அடாப்டர்'],
  ['keys', 'key', 'keyring', 'යතුර', 'යතුරු', 'சாவி', 'சாவிகள்'],
  ['glasses', 'spectacles', 'eyeglasses', 'කණ්ණාඩි', 'ඇස්කණ්ණාඩි', 'கண்ணாடி'],
  ['card', 'idcard', 'identitycard', 'studentcard', 'හැඳුනුම්පත', 'කාඩ්', 'அடையாளஅட்டை', 'கார்டு'],
  ['black', 'kalu', 'කළු', 'கருப்பு'],
  ['blue', 'nil', 'නිල්', 'நீலம்'],
  ['red', 'rathu', 'රතු', 'சிவப்பு'],
  ['green', 'kola', 'කොළ', 'பச்சை'],
  ['white', 'sudu', 'සුදු', 'வெள்ளை'],
  ['silver', 'රිදී', 'வெள்ளிநிற'],
  ['library', 'libry', 'libary', 'pusthakala', 'පුස්තකාල', 'நூலக'],
  ['campus', 'university', 'seusl', 'seu', 'කැම්පස්', 'විශ්වවිද්‍යාල', 'பல்கலைக்கழகம்'],
  ['hostel', 'නේවාසිකාගාර', 'ஹாஸ்டல்', 'விடுதி'],
  ['canteen', 'cateen', 'cantin', 'cafeteria', 'කැන්ටිම', 'ආපනශාලාව', 'கேன்டீன்', 'உணவகம்'],
  ['gate', 'entrance', 'ගේට්ටුව', 'ප්‍රවේශය', 'வாசல்', 'நுழைவாயில்'],
  ['oluvil', 'ஒலுவில்', 'ඔලුවිල්'],
  ['sammanthurai', 'சம்மாந்துறை', 'සම්මන්තුරේ'],
  ['palamunai', 'பாலமுனை', 'පාලමුනේ'],
];

const TERM_LOOKUP = new Map();
for (const group of TERM_GROUPS) {
  const canonical = group[0];
  for (const term of group) TERM_LOOKUP.set(term, { canonical, group });
}

export const normalizeText = (value) => String(value || '')
  .normalize('NFKC')
  .toLocaleLowerCase('en-US')
  .replace(/[’']/g, '')
  .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

export const detectLanguage = (value) => {
  const text = String(value || '');
  const sinhala = (text.match(/\p{Script=Sinhala}/gu) || []).length;
  const tamil = (text.match(/\p{Script=Tamil}/gu) || []).length;
  if (sinhala > tamil && sinhala > 0) return 'si';
  if (tamil > sinhala && tamil > 0) return 'ta';
  return 'en';
};

const SINGLISH_MARKERS = new Set([
  'mama', 'mata', 'mage', 'oya', 'oyata', 'oyage', 'api', 'ape',
  'eka', 'ekak', 'meka', 'mokak', 'monawada', 'monwda', 'koheda',
  'kohomada', 'kohomd', 'kiyala', 'kiyl', 'kiyanne', 'karanna',
  'krnna', 'karala', 'wenawa', 'una', 'nathi', 'nane', 'naane',
  'thiyenawa', 'tiyenawa', 'one', 'ona', 'puluwan', 'berida',
  'laga', 'gawa', 'issarahata', 'issrht', 'hariyata', 'harida',
  'balanna', 'blnna', 'denna', 'dnna', 'hoyanna', 'hambuna',
]);

const STRONG_SINGLISH_MARKERS = new Set([
  'mama', 'mata', 'mage', 'oyata', 'oyage', 'monawada', 'monwda',
  'kohomada', 'kohomd', 'kiyala', 'kiyl', 'karanna', 'krnna',
  'thiyenawa', 'tiyenawa', 'puluwan', 'hoyanna', 'hambuna',
]);

const GENERIC_CONVERSATION_TURN = /^(?:hi|hello|hey|ok|okay|yes|no|thanks|thank you|show more|more|same|again|continue|go on|hari|hari da|ow|owu|nae|na|එහෙනම්|හරි|ඔව්|නැහැ|තව|තවත්|வணக்கம்|சரி|ஆம்|இல்லை|மேலும்|இன்னும்)[!.?\s]*$/iu;

const explicitStyleRequest = (value) => {
  const text = normalizeText(value);
  if (/\b(?:singlish|romanized sinhala|romanised sinhala)\b/u.test(text)) return 'singlish';
  if (/\b(?:reply|respond|answer|speak|continue)\s+(?:to me\s+)?in english\b/u.test(text)) return 'en';
  return null;
};

export const detectConversationStyle = (value) => {
  const explicit = explicitStyleRequest(value);
  if (explicit) return explicit;

  const scriptLanguage = detectLanguage(value);
  if (scriptLanguage !== 'en') return scriptLanguage;

  const tokens = normalizeText(value).split(' ').filter(Boolean);
  const markers = new Set(tokens.filter((token) => SINGLISH_MARKERS.has(token)));
  if (tokens.some((token) => STRONG_SINGLISH_MARKERS.has(token)) || markers.size >= 2) return 'singlish';
  return 'en';
};

export const resolveConversationStyle = (message, history = [], locale = 'en', preferredStyle = '') => {
  const current = String(message || '').trim();
  const explicit = explicitStyleRequest(current);
  if (explicit) return explicit;

  const detected = detectConversationStyle(current);
  const shouldUseHistory = !current || GENERIC_CONVERSATION_TURN.test(current);
  if (!shouldUseHistory || detected !== 'en') return detected;

  if (['en', 'si', 'ta', 'singlish'].includes(preferredStyle)) return preferredStyle;

  const safeHistory = Array.isArray(history) ? history.slice(-10) : [];
  for (let index = safeHistory.length - 1; index >= 0; index -= 1) {
    const entry = safeHistory[index];
    if (entry?.role !== 'user' || !entry.content) continue;
    const historicalStyle = detectConversationStyle(entry.content);
    if (historicalStyle !== 'en' || !GENERIC_CONVERSATION_TURN.test(String(entry.content).trim())) return historicalStyle;
  }

  return ['si', 'ta'].includes(locale) ? locale : 'en';
};

export const inferIntent = (value) => {
  const text = normalizeText(value);
  const foundSignals = ['found', 'hambuna', 'hambu una', 'හමු', 'கண்ட', 'கிடைத்த'];
  const lostSignals = ['lost', 'nathi', 'නැති', 'අහිමි', 'காணாமல்', 'தொலைந்த'];
  if (foundSignals.some((signal) => text.includes(normalizeText(signal)))) return 'found';
  if (lostSignals.some((signal) => text.includes(normalizeText(signal)))) return 'lost';
  return 'search';
};

export const isPersonalQuery = (value) => {
  const text = normalizeText(value);
  return [
    'my reports', 'my report', 'my claims', 'my matches', 'my notifications', 'my items',
    'mage reports', 'mage claims', 'mage matches', 'මගේ reports', 'මගේ claims', 'මගේ matches',
    'என் reports', 'என் claims', 'என் matches', 'என் பதிவுகள்',
  ].some((signal) => text.includes(normalizeText(signal)));
};

const tokenize = (value) => normalizeText(value)
  .split(' ')
  .filter((word) => word.length >= 2 && word.length <= 40 && !STOP_WORDS.has(word));

export const extractConcepts = (value) => {
  const concepts = [];
  const seen = new Set();
  for (const token of tokenize(value).slice(0, 10)) {
    const canonical = TERM_LOOKUP.get(token)?.canonical || token;
    if (!seen.has(canonical)) {
      seen.add(canonical);
      concepts.push(canonical);
    }
  }
  return concepts;
};

const aliasesFor = (concept) => TERM_LOOKUP.get(concept)?.group || [concept];

export const expandKeywords = (value, maxTerms = 24) => {
  const output = [];
  const seen = new Set();
  const add = (term) => {
    const normalized = normalizeText(term).replace(/\s/g, '');
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    output.push(normalized);
  };

  for (const token of tokenize(value).slice(0, 10)) {
    add(token);
    const mapped = TERM_LOOKUP.get(token);
    if (mapped) {
      add(mapped.canonical);
      mapped.group.slice(0, 6).forEach(add);
    }
    if (output.length >= maxTerms) break;
  }
  return output.slice(0, maxTerms);
};

const FOLLOW_UP_ONLY = /^(show more|more|same|again|continue|තව|තවත්|மேலும்|இன்னும்)$/iu;

export const resolveSearchMessage = (message, history = []) => {
  const current = String(message || '').trim();
  if (!FOLLOW_UP_ONLY.test(current)) return current;
  const safeHistory = Array.isArray(history) ? history.slice(-10) : [];
  for (let index = safeHistory.length - 1; index >= 0; index -= 1) {
    const entry = safeHistory[index];
    if (entry?.role === 'user' && entry.content && !FOLLOW_UP_ONLY.test(String(entry.content).trim())) {
      return String(entry.content).slice(0, 500);
    }
  }
  return current;
};

export const resolveConversationLanguage = (message, history = []) => detectLanguage(resolveSearchMessage(message, history));

const editDistance = (left, right, limit = 2) => {
  if (Math.abs(left.length - right.length) > limit) return limit + 1;
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    let rowMinimum = current[0];
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      rowMinimum = Math.min(rowMinimum, current[j]);
    }
    if (rowMinimum > limit) return limit + 1;
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
};

export const boundedFuzzyMatch = (term, candidate) => {
  const left = normalizeText(term).replace(/\s/g, '');
  const right = normalizeText(candidate).replace(/\s/g, '');
  if (!left || !right || left.length < 4 || right.length < 4) return false;
  const limit = Math.max(left.length, right.length) >= 8 ? 2 : 1;
  return editDistance(left, right, limit) <= limit;
};

const words = (value) => tokenize(value).map((word) => word.replace(/\s/g, ''));
const contains = (haystack, needle) => haystack.includes(needle);

export const confidenceForScore = (score) => {
  if (score >= 80) return 'high';
  if (score >= 58) return 'medium';
  return 'possible';
};

export const scoreCandidate = (item, searchMessage, expandedTerms = expandKeywords(searchMessage)) => {
  const fields = {
    name: normalizeText(item?.itemName),
    category: normalizeText(item?.category),
    description: normalizeText(item?.description),
    location: normalizeText(item?.lostLocation || item?.foundLocation),
    tags: normalizeText([...(item?.tags || []), ...(item?.aiKeywords || [])].join(' ')),
  };
  const tokenFields = Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, words(value)]));
  const reasons = new Set();
  let raw = 0;

  const phrase = normalizeText(searchMessage);
  const corpus = Object.values(fields).join(' ');
  if (phrase.length >= 5 && contains(corpus, phrase)) {
    raw += 18;
    reasons.add('Exact phrase appears in the report');
  }

  const concepts = extractConcepts(searchMessage);
  const scoringConcepts = concepts.length ? concepts : expandedTerms.slice(0, 10);
  for (const concept of scoringConcepts) {
    const aliases = aliasesFor(concept).map((alias) => normalizeText(alias).replace(/\s/g, '')).filter(Boolean);
    const fieldHasAlias = (field) => aliases.some((alias) => contains(field, alias));

    if (fieldHasAlias(fields.name)) { raw += 12; reasons.add('Item name is similar'); }
    if (fieldHasAlias(fields.category)) { raw += 10; reasons.add('Category is similar'); }
    if (fieldHasAlias(fields.location)) { raw += 9; reasons.add('Location is related'); }
    if (fieldHasAlias(fields.tags)) { raw += 8; reasons.add('AI/search tags are similar'); }
    if (fieldHasAlias(fields.description)) { raw += 6; reasons.add('Description contains related details'); }

    if (![fields.name, fields.category, fields.location, fields.tags, fields.description].some(fieldHasAlias)) {
      const fuzzyHit = Object.values(tokenFields).some((fieldWords) => fieldWords.some((word) => aliases.some((alias) => boundedFuzzyMatch(alias, word))));
      if (fuzzyHit) { raw += 4; reasons.add('A close spelling match was found'); }
    }
  }

  const itemDate = new Date(item?.lostDate || item?.foundDate || item?.createdAt || 0).getTime();
  if (Number.isFinite(itemDate) && itemDate > 0) {
    const ageDays = Math.max(0, (Date.now() - itemDate) / 86400000);
    if (ageDays <= 7) { raw += 7; reasons.add('Report is recent'); }
    else if (ageDays <= 30) raw += 3;
  }

  const denominator = Math.max(24, scoringConcepts.length * 12 + 18);
  const score = Math.max(1, Math.min(99, Math.round((raw / denominator) * 100)));
  return { score, confidence: confidenceForScore(score), reasons: [...reasons].slice(0, 4) };
};
