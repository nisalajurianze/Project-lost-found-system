import crypto from 'node:crypto';
import AssistantSession from '../models/AssistantSession.js';
import ApiError from '../utils/apiError.js';
import { buildConversationalReportDraft } from './conversationalReportService.js';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CHANGES = 20;
const SLOT_NAMES = ['itemName', 'category', 'colors', 'brand', 'model', 'description', 'uniqueFeatures', 'location', 'date', 'storedAt'];
const CORRECTION_PATTERN = /\b(?:no|na|naha|nemei|wrong|correct|actually|instead|illai|இல்லை|නැහැ|නෑ)\b/iu;
const UNDO_PATTERN = /^(?:undo|go back|kalin eka|පෙර එක|முந்தையதை)\s*[.!]?$/iu;
const REMOVE_PATTERN = /\b(?:remove|delete|clear|ain karanna|ඉවත්|நீக்கு)\b/iu;

const QUESTION_COPY = {
  en: {
    itemName: 'What item was lost or found?', category: 'Which report category best fits the item?', location: 'Where exactly did this happen?', date: 'What date and approximate time was it?',
    uniqueFeatures: 'What one unique feature can identify it?', storedAt: 'Where is the found item being kept safely?',
  },
  singlish: {
    itemName: 'Nathi une hari hambune hari mona item ekakda?', category: 'Item ekata galapena report category eka mokakda?', location: 'Hariyatama meka une koheda?', date: 'Mona dawaseda, lagadi welawa mokakda?',
    uniqueFeatures: 'Item eka handunaganna puluwan wenama lakunayak mokakda?', storedAt: 'Hambuna item eka dan arakshithawa thiyenne koheda?',
  },
  si: {
    itemName: 'නැති වූ හෝ හමු වූ භාණ්ඩය මොකක්ද?', category: 'භාණ්ඩයට ගැළපෙන වාර්තා කාණ්ඩය කුමක්ද?', location: 'මෙය සිදු වූ නිශ්චිත ස්ථානය කොහේද?', date: 'දිනය සහ ආසන්න වේලාව කුමක්ද?',
    uniqueFeatures: 'එය හඳුනාගත හැකි එක් සුවිශේෂී ලක්ෂණයක් කුමක්ද?', storedAt: 'හමු වූ භාණ්ඩය දැන් ආරක්ෂිතව තබා ඇත්තේ කොහේද?',
  },
  ta: {
    itemName: 'தொலைந்த அல்லது கிடைத்த பொருள் என்ன?', category: 'பொருளுக்கு ஏற்ற அறிக்கை வகை எது?', location: 'இது நடந்த சரியான இடம் எது?', date: 'தேதி மற்றும் சுமார் நேரம் என்ன?',
    uniqueFeatures: 'அதை அடையாளம் காண ஒரு தனித்துவமான அம்சம் என்ன?', storedAt: 'கிடைத்த பொருள் தற்போது பாதுகாப்பாக எங்கு வைக்கப்பட்டுள்ளது?',
  },
};

const valueOf = (slot) => slot?.value ?? '';
const cleanText = (value, max = 300) => String(value || '').normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, max);
const sessionKeyFor = (sessionId) => crypto.createHash('sha256').update(cleanText(sessionId, 160)).digest('hex');
const asPlainSlots = (slots = {}) => Object.fromEntries(SLOT_NAMES.map((field) => {
  const raw = slots instanceof Map ? slots.get(field) : slots[field];
  return [field, raw ? { value: valueOf(raw), confidence: Number(raw.confidence) || 0, sourceTurn: Number(raw.sourceTurn) || 0 } : { value: '', confidence: 0, sourceTurn: 0 }];
}));

const draftFieldsFromSlots = (slots) => ({
  itemName: valueOf(slots.itemName), category: valueOf(slots.category), colors: valueOf(slots.colors),
  brand: valueOf(slots.brand), model: valueOf(slots.model), description: valueOf(slots.description),
  uniqueFeatures: valueOf(slots.uniqueFeatures), location: valueOf(slots.location), date: valueOf(slots.date),
  storedAt: valueOf(slots.storedAt),
  tags: [...new Set([valueOf(slots.itemName), ...String(valueOf(slots.colors)).split(','), valueOf(slots.location)].map((entry) => cleanText(entry, 100)).filter(Boolean))].join(', '),
});

const missingFields = (reportType, fields) => [
  ['itemName', fields.itemName],
  ['category', fields.category],
  ['location', fields.location],
  ['date', fields.date],
  ['uniqueFeatures', fields.uniqueFeatures],
  ...(reportType === 'found' ? [['storedAt', fields.storedAt]] : []),
].filter(([, value]) => !cleanText(value)).map(([field]) => field);

const candidateValues = (message, reportType, nextField, now, { allowContextFill = true } = {}) => {
  const parsed = buildConversationalReportDraft({ message, intent: reportType, now });
  const fields = parsed?.fields || {};
  const candidates = {};
  for (const field of ['itemName', 'category', 'colors', 'location', 'date']) {
    if (cleanText(fields[field])) candidates[field] = { value: fields[field], confidence: field === 'location' ? 75 : 85 };
  }
  const text = cleanText(message, 500);
  const brand = text.match(/\b(apple|samsung|dell|hp|lenovo|asus|acer|xiaomi|huawei|nokia|sony)\b/iu)?.[1];
  if (brand) candidates.brand = { value: brand[0].toUpperCase() + brand.slice(1).toLowerCase(), confidence: 90 };
  const hasParsedDetail = Object.keys(candidates).length > 0;
  const canUseFreeTextForNextField = nextField === 'uniqueFeatures' || !hasParsedDetail;
  if (allowContextFill && canUseFreeTextForNextField && nextField && !candidates[nextField] && text.length >= 2) {
    if (nextField === 'uniqueFeatures') candidates.uniqueFeatures = { value: text, confidence: 75 };
    if (nextField === 'storedAt') candidates.storedAt = { value: text, confidence: 70 };
    if (nextField === 'location') candidates.location = { value: text, confidence: 60 };
    if (nextField === 'itemName') candidates.itemName = { value: text.slice(0, 150), confidence: 55 };
    if (nextField === 'category') candidates.category = { value: text.slice(0, 100), confidence: 55 };
  }
  return { candidates, parsed };
};

const removalField = (message) => {
  const patterns = {
    colors: /\b(?:colou?r|paata)\b|පාට|நிறம்/iu,
    location: /\b(?:location|place|thana)\b|ස්ථානය|இடம்/iu,
    date: /\b(?:date|time|dawasa|welawa)\b|දිනය|වේලාව|தேதி|நேரம்/iu,
    uniqueFeatures: /\b(?:feature|mark|lakuna)\b|ලක්ෂණ|அம்சம்/iu,
  };
  return Object.entries(patterns).find(([, pattern]) => pattern.test(message))?.[0] || '';
};

const appendChange = (changes, change) => [...changes, change].slice(-MAX_CHANGES);

const advanceConversationState = ({ previousState = {}, message, intent, responseStyle = 'en', now = new Date() }) => {
  const reportType = ['lost', 'found'].includes(intent) ? intent : previousState.reportType;
  if (!['lost', 'found'].includes(reportType)) return null;
  const turn = (Number(previousState.turnCount) || 0) + 1;
  const slots = asPlainSlots(previousState.slots);
  let changes = Array.isArray(previousState.changes) ? previousState.changes.slice(-MAX_CHANGES) : [];
  const text = cleanText(message, 500);

  if (UNDO_PATTERN.test(text) && changes.length) {
    const previous = changes.at(-1);
    slots[previous.field] = { value: previous.before, confidence: 70, sourceTurn: turn };
    changes = appendChange(changes.slice(0, -1), { field: previous.field, before: previous.after, after: previous.before, operation: 'undo', turn, at: now });
  } else {
    const correction = CORRECTION_PATTERN.test(text);
    const { candidates } = candidateValues(text, reportType, previousState.nextField, now, { allowContextFill: !correction });
    if (REMOVE_PATTERN.test(text)) {
      const field = removalField(text) || previousState.nextField;
      if (field && slots[field] && cleanText(valueOf(slots[field]))) candidates[field] = { value: '', confidence: 100, remove: true };
    }
    for (const [field, candidate] of Object.entries(candidates)) {
      if (!SLOT_NAMES.includes(field)) continue;
      const before = valueOf(slots[field]);
      const after = candidate.value;
      if (String(before) === String(after)) continue;
      const operation = candidate.remove ? 'remove' : before || correction ? 'replace' : 'set';
      slots[field] = { value: after, confidence: candidate.confidence, sourceTurn: turn };
      changes = appendChange(changes, { field, before, after, operation, turn, at: now });
    }
    if (!cleanText(valueOf(slots.description))) {
      slots.description = { value: text, confidence: 100, sourceTurn: turn };
    }
  }

  const fields = draftFieldsFromSlots(slots);
  const missing = missingFields(reportType, fields);
  const nextField = missing[0] || '';
  const style = QUESTION_COPY[responseStyle] ? responseStyle : 'en';
  const changedThisTurn = changes.filter((change) => change.turn === turn);
  return {
    reportType, slots, fields, missing, nextField,
    question: nextField ? QUESTION_COPY[style][nextField] : '',
    state: missing.length ? 'collecting' : 'reviewing',
    turnCount: turn,
    changes,
    changedThisTurn,
    completeness: Math.round(((missingFields(reportType, {}).length - missing.length) / missingFields(reportType, {}).length) * 100),
  };
};

const publicSessionState = (record) => {
  const slots = asPlainSlots(record.slots);
  const fields = draftFieldsFromSlots(slots);
  return {
    reportType: record.reportType,
    fields,
    missing: record.missing,
    nextField: record.nextField,
    state: record.state,
    version: record.stateVersion,
    turnCount: record.turnCount,
    changes: (record.changes || []).slice(-5),
    expiresAt: record.expiresAt,
  };
};

const applyAssistantSessionTurn = async ({ sessionId, expectedVersion, message, intent, responseStyle, userId, now = new Date() }) => {
  if (!cleanText(sessionId, 160)) throw ApiError.badRequest('A conversation session ID is required.');
  const sessionKey = sessionKeyFor(sessionId);
  let record = await AssistantSession.findOne({ sessionKey });
  if (!record) {
    record = await AssistantSession.create({ sessionKey, ownerId: userId || null, responseStyle, expiresAt: new Date(now.getTime() + SESSION_TTL_MS) });
  } else if (record.ownerId && String(record.ownerId) !== String(userId || '')) {
    throw ApiError.forbidden('This assistant session belongs to another account.');
  }
  const version = Number(expectedVersion);
  if (Number.isFinite(version) && version !== record.stateVersion) throw ApiError.conflict('This conversation changed in another tab. Reload it before correcting details.');
  const advanced = advanceConversationState({ previousState: record.toObject(), message, intent, responseStyle, now });
  if (!advanced) return null;
  const updated = await AssistantSession.findOneAndUpdate(
    { _id: record._id, stateVersion: record.stateVersion },
    {
      $set: {
        ...(record.ownerId ? {} : userId ? { ownerId: userId } : {}),
        responseStyle, reportType: advanced.reportType, slots: advanced.slots, missing: advanced.missing,
        nextField: advanced.nextField, state: advanced.state, turnCount: advanced.turnCount, changes: advanced.changes,
        lastActivityAt: now, expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
      },
      $inc: { stateVersion: 1 },
    },
    { new: true },
  );
  if (!updated) throw ApiError.conflict('This conversation changed in another tab. Reload it before correcting details.');
  return { ...publicSessionState(updated), question: advanced.question, changedThisTurn: advanced.changedThisTurn, completeness: advanced.completeness };
};

export { SESSION_TTL_MS, advanceConversationState, applyAssistantSessionTurn, publicSessionState, sessionKeyFor };
