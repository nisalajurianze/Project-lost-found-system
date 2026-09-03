import LostItem from '../models/LostItem.js';
import FoundItem from '../models/FoundItem.js';
import ClaimRequest from '../models/ClaimRequest.js';
import Match from '../models/Match.js';
import Notification from '../models/Notification.js';
import ApiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  expandKeywords,
  inferIntent,
  isPersonalQuery,
  resolveConversationLanguage,
  resolveConversationStyle,
  resolveSearchMessage,
  scoreCandidate,
} from '../services/chatSearchService.js';
import { buildConversationalReportDraft } from '../services/conversationalReportService.js';
import { aiConfigured, recordFallbackUse, requestAIJson } from '../services/aiProviderService.js';
import { inspectAIInput } from '../services/aiSafetyService.js';
import { applyAssistantSessionTurn } from '../services/conversationStateService.js';
import { buildRecoveryGuidance, isRecoveryQuery } from '../services/recoveryGuidanceService.js';
import { correctSearchText } from '../services/spellingCorrectionService.js';
import { rerankHybridCandidate } from '../services/semanticSearchService.js';
import { answerKnowledgeQuery, isKnowledgeQuery } from '../services/knowledgeAssistantService.js';

const DEFAULT_PAGE_SIZE = 6;
const MAX_PAGE_SIZE = 12;
const MAX_CANDIDATES_PER_MODEL = 120;
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const copy = {
  en: {
    greeting: 'Hi! Are you looking for something you lost, or would you like to report an item you found?',
    ask: 'Please add an item name, colour, brand, category, or location so I can search accurately.',
    none: 'I could not find a close public report yet. Try another detail or create a report so the matching service can keep checking.',
    results: (count) => `${count} relevant public report${count === 1 ? '' : 's'} found. Best matches are shown first.`,
    signIn: 'Please sign in to view your reports, claims, matches, and unread notifications.',
    personal: 'Here is your current Smart L&F activity.',
    saySomething: 'Please say something.',
    tooLong: 'Please keep the message under 500 characters.',
    unsafe: 'I cannot process instructions that request hidden prompts, credentials, or safety bypasses. Please describe the lost or found item only.',
  },
  singlish: {
    greeting: 'Hi! Oya nathi una deyak hoyanawada, nathnam hambuna item ekak report karanawada?',
    ask: 'Hariyata hoyanna item eke nama, paata, brand eka, category eka hari location eka hari denna.',
    none: 'Galapena public report ekak thawama hambune na. Thawa detail ekak denna, nathnam matching service ekata digatama balanna report ekak hadanna.',
    results: (count) => `Galapena public reports ${count}k hambuna. Hodama matches tika issarahin pennanawa.`,
    signIn: 'Oyage reports, claims, matches saha unread notifications balanna sign in wenna.',
    personal: 'Oyage danata thiyena Smart L&F activity eka meka.',
    saySomething: 'Message ekak type karanna.',
    tooLong: 'Message eka characters 500kata aduwen thiyanna.',
    unsafe: 'Hidden prompts, credentials, safety bypass instructions process karanna ba. Lost hari found item eke details witharak denna.',
  },
  si: {
    greeting: 'ආයුබෝවන්! ඔබ නැති වූ දෙයක් සොයනවාද, නැත්නම් හමුවූ භාණ්ඩයක් වාර්තා කරනවාද?',
    ask: 'නිවැරදිව සොයන්න භාණ්ඩයේ නම, පාට, brand එක, category එක හෝ ස්ථානයක් දෙන්න.',
    none: 'ගැලපෙන public report එකක් තවම හමු වුණේ නැහැ. වෙනත් විස්තරයක් දෙන්න හෝ matching service එක දිගටම බලන්න report එකක් සාදන්න.',
    results: (count) => `ගැලපෙන public reports ${count}ක් හමු වුණා. හොඳම results මුලින් පෙන්වනවා.`,
    signIn: 'ඔබගේ reports, claims, matches සහ unread notifications බලන්න sign in වෙන්න.',
    personal: 'ඔබගේ Smart L&F activity එක මෙන්න.',
    saySomething: 'කරුණාකර පණිවිඩයක් ලියන්න.',
    tooLong: 'පණිවිඩය අක්ෂර 500කට අඩුවෙන් තබන්න.',
    unsafe: 'සැඟවුණු prompts, credentials හෝ safety bypass උපදෙස් සැකසිය නොහැක. නැතිවූ හෝ හමුවූ භාණ්ඩයේ විස්තර පමණක් දෙන්න.',
  },
  ta: {
    greeting: 'வணக்கம்! நீங்கள் தொலைத்த பொருளை தேடுகிறீர்களா, அல்லது கண்டெடுத்த பொருளை பதிவு செய்ய விரும்புகிறீர்களா?',
    ask: 'துல்லியமாக தேட பொருளின் பெயர், நிறம், brand, category அல்லது இடத்தைச் சேர்க்கவும்.',
    none: 'நெருக்கமான பொது பதிவு இன்னும் கிடைக்கவில்லை. வேறு விவரத்தை முயற்சிக்கவும் அல்லது தொடர்ந்த matching காக புதிய report உருவாக்கவும்.',
    results: (count) => `தொடர்புடைய பொது பதிவுகள் ${count} கிடைத்தன. சிறந்த பொருத்தங்கள் முதலில் காட்டப்படுகின்றன.`,
    signIn: 'உங்கள் reports, claims, matches மற்றும் unread notifications பார்க்க sign in செய்யவும்.',
    personal: 'உங்கள் தற்போதைய Smart L&F activity இதோ.',
    saySomething: 'தயவுசெய்து ஒரு செய்தியை எழுதவும்.',
    tooLong: 'செய்தியை 500 எழுத்துகளுக்குள் வைத்திருக்கவும்.',
    unsafe: 'மறைக்கப்பட்ட prompts, credentials அல்லது safety bypass வழிமுறைகளை செயலாக்க முடியாது. தொலைந்த அல்லது கண்டெடுத்த பொருளின் விவரங்களை மட்டும் வழங்கவும்.',
  },
};

const quickReplies = {
  en: {
    greeting: ['Lost a black phone', 'Found a wallet', 'My reports'],
    ask: ['Black phone', 'Blue wallet', 'Laptop near library'],
    search: ['Search for an item'],
    retry: ['Try another search'],
    refine: ['Refine search'],
  },
  singlish: {
    greeting: ['Kalu phone ekak nathi una', 'Wallet ekak hambuna', 'Mage reports'],
    ask: ['Kalu phone ekak', 'Nil wallet ekak', 'Library eka laga laptop ekak'],
    search: ['Item ekak hoyanna'],
    retry: ['Wena details walin balanna'],
    refine: ['Search eka refine karanna'],
  },
  si: {
    greeting: ['කළු දුරකථනයක් නැති වුණා', 'පසුම්බියක් හමු වුණා', 'මගේ වාර්තා'],
    ask: ['කළු දුරකථනයක්', 'නිල් පසුම්බියක්', 'පුස්තකාලය අසල ලැප්ටොප් එකක්'],
    search: ['භාණ්ඩයක් සොයන්න'],
    retry: ['වෙනත් විස්තරයකින් සොයන්න'],
    refine: ['සෙවීම වැඩිදියුණු කරන්න'],
  },
  ta: {
    greeting: ['கருப்பு தொலைபேசி தொலைந்தது', 'பணப்பை கிடைத்தது', 'என் பதிவுகள்'],
    ask: ['கருப்பு தொலைபேசி', 'நீல பணப்பை', 'நூலகம் அருகே மடிக்கணினி'],
    search: ['ஒரு பொருளை தேடவும்'],
    retry: ['வேறு விவரங்களுடன் தேடவும்'],
    refine: ['தேடலை செம்மைப்படுத்தவும்'],
  },
};

const q = (style, key) => quickReplies[style]?.[key] ?? quickReplies.en[key];

const actionLabels = {
  en: { reportLost: 'Report lost item', reportFound: 'Report found item', signIn: 'Sign in', reports: 'My lost reports', claims: 'My claims', matches: 'My matches', notifications: 'Notifications' },
  singlish: { reportLost: 'Nathi una item eka report karanna', reportFound: 'Hambuna item eka report karanna', signIn: 'Sign in wenna', reports: 'Mage lost reports', claims: 'Mage claims', matches: 'Mage matches', notifications: 'Notifications' },
  si: { reportLost: 'නැති වූ භාණ්ඩය වාර්තා කරන්න', reportFound: 'හමුවූ භාණ්ඩය වාර්තා කරන්න', signIn: 'පිවිසෙන්න', reports: 'මගේ නැති වූ වාර්තා', claims: 'මගේ හිමිකම් ඉල්ලීම්', matches: 'මගේ ගැළපීම්', notifications: 'දැනුම්දීම්' },
  ta: { reportLost: 'தொலைந்த பொருளை பதிவு செய்யவும்', reportFound: 'கண்டெடுத்த பொருளை பதிவு செய்யவும்', signIn: 'உள்நுழையவும்', reports: 'என் தொலைந்த பதிவுகள்', claims: 'என் உரிமைக் கோரிக்கைகள்', matches: 'என் பொருத்தங்கள்', notifications: 'அறிவிப்புகள்' },
};

const actionLabel = (style, key) => actionLabels[style]?.[key] ?? actionLabels.en[key];

const t = (language, key, ...args) => {
  const value = copy[language]?.[key] ?? copy.en[key];
  return typeof value === 'function' ? value(...args) : value;
};

const publicItem = (item, itemType, scored) => ({
  _id: item._id,
  itemType,
  itemName: item.itemName,
  category: item.category,
  description: String(item.description || '').slice(0, 260),
  location: item.lostLocation || item.foundLocation || '',
  date: item.lostDate || item.foundDate || item.createdAt,
  image: item.images?.[0]?.url || '',
  status: item.status,
  relevanceScore: scored.score,
  confidence: scored.confidence,
  reasons: scored.reasons,
  url: itemType === 'FoundItem' ? `/found-items/${item._id}` : `/lost-items/${item._id}`,
  claimUrl: itemType === 'FoundItem' ? `/found-items/${item._id}?claim=1` : `/lost-items/${item._id}?claim=1`,
});

const candidateQuery = (statuses, terms) => {
  const fields = ['itemName', 'category', 'description', 'tags', 'aiKeywords', 'lostLocation', 'foundLocation'];
  const clauses = [];
  for (const term of terms.slice(0, 24)) {
    const regex = new RegExp(escapeRegex(term), 'i');
    for (const field of fields) clauses.push({ [field]: regex });
  }
  return {
    status: { $in: statuses },
    isDeleted: { $ne: true },
    isArchived: { $ne: true },
    ...(clauses.length ? { $or: clauses } : {}),
  };
};

const searchModel = async (Model, itemType, statuses, searchMessage, terms) => {
  const projection = 'itemName category description brand model colors uniqueFeatures lostLocation foundLocation lostDate foundDate images status createdAt tags aiKeywords';
  const baseQuery = { status: { $in: statuses }, isDeleted: { $ne: true }, isArchived: { $ne: true } };
  const [lexicalCandidates, recentCandidates] = await Promise.all([
    Model.find(candidateQuery(statuses, terms)).select(projection).sort({ createdAt: -1 }).limit(MAX_CANDIDATES_PER_MODEL).lean(),
    Model.find(baseQuery).select(projection).sort({ createdAt: -1 }).limit(MAX_CANDIDATES_PER_MODEL).lean(),
  ]);
  const candidates = [...new Map([...lexicalCandidates, ...recentCandidates].map((item) => [String(item._id), item])).values()];

  return candidates
    .map((item) => {
      const lexical = scoreCandidate(item, searchMessage, terms);
      return { item, scored: { ...lexical, ...rerankHybridCandidate(item, searchMessage, lexical), confidence: lexical.confidence } };
    })
    .filter(({ scored }) => scored.score >= 18)
    .map(({ item, scored }) => publicItem(item, itemType, scored));
};

const personalSummary = async (userId) => {
  const [lostReports, foundReports, pendingClaims, totalClaims, suggestedMatches, unreadNotifications] = await Promise.all([
    LostItem.countDocuments({ userId, isArchived: { $ne: true } }),
    FoundItem.countDocuments({ userId, isArchived: { $ne: true } }),
    ClaimRequest.countDocuments({ claimantId: userId, status: 'pending' }),
    ClaimRequest.countDocuments({ claimantId: userId }),
    Match.countDocuments({ $or: [{ lostUserId: userId }, { foundUserId: userId }], status: 'suggested' }),
    Notification.countDocuments({ userId, isRead: false }),
  ]);
  return { lostReports, foundReports, pendingClaims, totalClaims, suggestedMatches, unreadNotifications };
};

const responseStyleInstruction = {
  en: 'English only',
  si: 'Sinhala script',
  ta: 'Tamil script',
  singlish: 'natural Romanized Sinhala (Singlish) only; do not switch to English or Sinhala script unless the user explicitly switches language',
};

const generateAssistantResponse = async (userMessage, history, items, reportDraft, responseStyle) => {
  if (!aiConfigured()) {
    recordFallbackUse('assistant-chat');
    return null;
  }
  try {
    const itemSummaries = items.slice(0, 3).map((item) => `- ${item.itemName} (${item.category}) at ${item.location}, match: ${item.relevanceScore}%`).join('\n');
    const systemPrompt = `You are the smart, helpful AI assistant for the South Eastern University of Sri Lanka (SEUSL) Smart Lost & Found system.
Respond in ${responseStyleInstruction[responseStyle] || responseStyleInstruction.en}.
Keep the conversation in that same language and writing style across follow-up turns.
Keep response concise and helpful (2-3 sentences). If matching reports are found, mention them. If no reports match, guide the user to report or search again.
Return JSON ONLY with this schema: {"reply": string, "quickReplies": string[]}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-8).map((m) => ({ role: m.role === 'ai' ? 'assistant' : m.role, content: m.content })),
      { role: 'user', content: `User query: ${userMessage}\nMatched items in system:\n${itemSummaries || 'None'}\nReport draft: ${reportDraft ? JSON.stringify(reportDraft.fields) : 'None'}` },
    ];

    const response = await requestAIJson(messages, {
      purpose: 'assistant-chat',
      validator: (value) => typeof value.reply === 'string'
        && value.reply.trim().length > 0
        && Array.isArray(value.quickReplies)
        && value.quickReplies.every((entry) => typeof entry === 'string'),
    });
    return response?.data;
  } catch (error) {
    recordFallbackUse('assistant-chat');
    console.warn('[ai] assistant chat fallback used', { code: error.code || error.name });
    return null;
  }
};

export const handleAIChat = asyncHandler(async (req, res) => {
  const rawIncoming = String(req.body?.message || '').normalize('NFKC').trim();
  const history = (Array.isArray(req.body?.history) ? req.body.history.slice(-10) : [])
    .filter((entry) => ['user', 'assistant', 'ai'].includes(entry?.role) && typeof entry?.content === 'string')
    .map((entry) => {
      const inspected = inspectAIInput(entry.content, { maxLength: 500 });
      return { role: entry.role, content: inspected.safe ? inspected.redactedText : '[blocked unsafe message]' };
    });
  const locale = ['en', 'si', 'ta'].includes(req.body?.locale) ? req.body.locale : 'en';
  const preferredStyle = ['en', 'si', 'ta', 'singlish'].includes(req.body?.conversationStyle) ? req.body.conversationStyle : '';
  const responseStyle = resolveConversationStyle(rawIncoming, history, locale, preferredStyle);
  if (!rawIncoming) return ApiResponse.ok({ text: t(responseStyle, 'saySomething'), responseStyle, quickReplies: q(responseStyle, 'greeting'), items: [] }).send(res);
  const inspectedInput = inspectAIInput(rawIncoming, { maxLength: 500 });
  if (inspectedInput.issues.includes('INPUT_TOO_LONG')) return ApiResponse.ok({ text: t(responseStyle, 'tooLong'), responseStyle, quickReplies: [], items: [] }).send(res);
  if (!inspectedInput.safe) {
    return ApiResponse.ok({
      text: t(responseStyle, 'unsafe'),
      responseStyle,
      quickReplies: q(responseStyle, 'ask'),
      items: [],
      meta: { safety: 'blocked', safetyVersion: inspectedInput.version },
    }).send(res);
  }
  const incoming = inspectedInput.redactedText;

  const language = resolveConversationLanguage(incoming, history);
  const greetingOnly = /^(hi|hello|hey|ආයුබෝවන්|வணக்கம்)[!.\s]*$/iu.test(incoming);
  if (greetingOnly) {
    const aiGreeting = await generateAssistantResponse(incoming, history, [], null, responseStyle);
    return ApiResponse.ok({
      text: aiGreeting?.reply || t(responseStyle, 'greeting'),
      language,
      responseStyle,
      quickReplies: aiGreeting?.quickReplies?.length ? aiGreeting.quickReplies : q(responseStyle, 'greeting'),
      items: [],
      actions: [{ type: 'report_lost', label: actionLabel(responseStyle, 'reportLost'), url: '/dashboard/report-lost' }, { type: 'report_found', label: actionLabel(responseStyle, 'reportFound'), url: '/dashboard/report-found' }],
    }).send(res);
  }

  if (isPersonalQuery(incoming)) {
    if (!req.user?._id) {
      return ApiResponse.ok({ text: t(responseStyle, 'signIn'), language, responseStyle, quickReplies: [], items: [], actions: [{ type: 'sign_in', label: actionLabel(responseStyle, 'signIn'), url: '/login' }] }).send(res);
    }
    const summary = await personalSummary(req.user._id);
    return ApiResponse.ok({
      text: t(responseStyle, 'personal'), language, responseStyle, personalSummary: summary, items: [], quickReplies: q(responseStyle, 'search'),
      actions: [
        { type: 'reports', label: actionLabel(responseStyle, 'reports'), url: '/dashboard/my-lost' },
        { type: 'claims', label: actionLabel(responseStyle, 'claims'), url: '/dashboard/claims' },
        { type: 'matches', label: actionLabel(responseStyle, 'matches'), url: '/dashboard/my-matches' },
        { type: 'notifications', label: actionLabel(responseStyle, 'notifications'), url: '/dashboard/notifications' },
      ],
    }).send(res);
  }

  if (isRecoveryQuery(incoming)) {
    const summary = req.user?._id ? await personalSummary(req.user._id) : {};
    const guidance = buildRecoveryGuidance({ responseStyle, authenticated: Boolean(req.user?._id), summary });
    const labels = {
      sign_in: actionLabel(responseStyle, 'signIn'),
      claims: actionLabel(responseStyle, 'claims'),
      matches: actionLabel(responseStyle, 'matches'),
      search: q(responseStyle, 'search')[0],
    };
    return ApiResponse.ok({
      text: guidance.text,
      language: resolveConversationLanguage(incoming, history),
      responseStyle,
      quickReplies: [],
      items: [],
      actions: guidance.actions.map((action) => ({ ...action, label: labels[action.type] })),
      recovery: { state: req.user?._id ? 'authenticated' : 'awaiting-auth', safetyNotice: guidance.safetyNotice },
      meta: { source: 'Verified Smart L&F recovery policy', notice: 'AI guidance does not prove ownership or approve a claim.' },
    }).send(res);
  }

  if (isKnowledgeQuery(incoming)) {
    const knowledge = await answerKnowledgeQuery({
      query: incoming,
      responseStyle,
      authenticated: Boolean(req.user?._id),
      isAdmin: req.user?.role === 'admin',
    });
    if (knowledge.answered) {
      return ApiResponse.ok({
        text: knowledge.text,
        language: resolveConversationLanguage(incoming, history),
        responseStyle,
        quickReplies: [],
        items: [],
        knowledge,
        meta: { source: knowledge.citations[0]?.label, notice: 'Answer grounded in an approved, versioned source.' },
      }).send(res);
    }
  }

  const rawSearchMessage = resolveSearchMessage(incoming, history);
  const spelling = correctSearchText(rawSearchMessage);
  const searchMessage = spelling.corrected;
  const terms = expandKeywords(searchMessage);
  if (!terms.length) {
    return ApiResponse.ok({ text: t(responseStyle, 'ask'), language, responseStyle, quickReplies: q(responseStyle, 'ask'), items: [] }).send(res);
  }

  const requestedPage = Number.parseInt(req.body?.page, 10);
  const requestedPageSize = Number.parseInt(req.body?.pageSize, 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = Math.min(MAX_PAGE_SIZE, Number.isFinite(requestedPageSize) && requestedPageSize > 0 ? requestedPageSize : DEFAULT_PAGE_SIZE);
  const initialIntent = inferIntent(searchMessage);
  const sessionId = String(req.body?.sessionId || '').trim().slice(0, 160);
  const sessionState = sessionId && (['lost', 'found'].includes(initialIntent) || Number(req.body?.sessionVersion) > 0)
    ? await applyAssistantSessionTurn({
      sessionId,
      expectedVersion: req.body?.sessionVersion,
      message: incoming,
      intent: initialIntent,
      responseStyle,
      userId: req.user?._id,
    })
    : null;
  const intent = sessionState?.reportType || initialIntent;
  const reportDraft = sessionState ? {
    reportType: sessionState.reportType,
    fields: sessionState.fields,
    missing: sessionState.missing,
    confidence: sessionState.completeness,
    state: sessionState.state,
    version: sessionState.version,
    changedFields: sessionState.changedThisTurn,
    source: 'Server-validated conversation slot state; human review required',
    privacyNotice: 'Remove passwords, full card numbers, private addresses and other sensitive identifiers before submission.',
  } : buildConversationalReportDraft({ message: searchMessage, intent });

  let ranked;
  if (intent === 'lost') {
    ranked = await searchModel(FoundItem, 'FoundItem', ['available', 'matched'], searchMessage, terms);
  } else if (intent === 'found') {
    ranked = await searchModel(LostItem, 'LostItem', ['pending', 'matched'], searchMessage, terms);
  } else {
    const [found, lost] = await Promise.all([
      searchModel(FoundItem, 'FoundItem', ['available', 'matched'], searchMessage, terms),
      searchModel(LostItem, 'LostItem', ['pending', 'matched'], searchMessage, terms),
    ]);
    ranked = [...found, ...lost];
  }

  ranked.sort((left, right) => right.relevanceScore - left.relevanceScore || new Date(right.date) - new Date(left.date));
  const total = ranked.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const items = ranked.slice(start, start + pageSize);

  if (!total) {
    const aiGenerated = await generateAssistantResponse(searchMessage, history, [], reportDraft, responseStyle);
    return ApiResponse.ok({
      text: sessionState?.question || aiGenerated?.reply || t(responseStyle, 'none'),
      language,
      responseStyle,
      intent,
      query: { message: searchMessage, terms, page: 1, pageSize },
      total: 0,
      totalPages: 0,
      hasMore: false,
      quickReplies: aiGenerated?.quickReplies?.length ? aiGenerated.quickReplies : q(responseStyle, 'retry'),
      items: [],
      actions: [{ type: intent === 'found' ? 'report_found' : 'report_lost', label: actionLabel(responseStyle, intent === 'found' ? 'reportFound' : 'reportLost'), url: intent === 'found' ? '/dashboard/report-found' : '/dashboard/report-lost' }],
      reportDraft,
      sessionState,
      corrections: spelling.corrections,
      meta: { source: 'Public Smart L&F reports', notice: 'AI relevance is a search aid, not proof of ownership.', lastUpdated: new Date().toISOString() },
    }).send(res);
  }

  const aiGenerated = await generateAssistantResponse(searchMessage, history, items, reportDraft, responseStyle);
  return ApiResponse.ok({
    text: sessionState?.question || aiGenerated?.reply || t(responseStyle, 'results', total),
    language,
    responseStyle,
    intent,
    query: { message: searchMessage, terms, page: safePage, pageSize },
    total,
    page: safePage,
    pageSize,
    totalPages,
    hasMore: safePage < totalPages,
    items,
    quickReplies: aiGenerated?.quickReplies?.length ? aiGenerated.quickReplies : q(responseStyle, 'refine'),
    reportDraft,
    sessionState,
    corrections: spelling.corrections,
    actions: [{ type: intent === 'found' ? 'report_found' : 'report_lost', label: actionLabel(responseStyle, intent === 'found' ? 'reportFound' : 'reportLost'), url: intent === 'found' ? '/dashboard/report-found' : '/dashboard/report-lost' }],
    meta: { source: 'Public Smart L&F reports', notice: 'AI relevance is a search aid, not proof of ownership.', lastUpdated: new Date().toISOString() },
  }).send(res);
});
