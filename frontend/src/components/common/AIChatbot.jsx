import React, { useEffect, useRef, useState } from 'react';
import {
  FiAlertCircle,
  FiChevronRight,
  FiClock,
  FiMic,
  FiMessageSquare,
  FiPlus,
  FiSearch,
  FiSend,
  FiTrash2,
  FiX,
} from 'react-icons/fi';
import { FaRobot } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  clearAssistantConversations,
  createAssistantConversation,
  loadAssistantConversations,
  removeAssistantConversation,
  saveAssistantConversations,
} from '../../utils/assistantHistory';

const timestamp = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const initialMessage = (t) => ({
  role: 'ai',
  content: t('assistant.initial'),
  timestamp: timestamp(),
  items: [],
  actions: [],
});

const confidenceLabel = (confidence, t) => ({
  high: t('assistant.highRelevance'),
  medium: t('assistant.mediumRelevance'),
  possible: t('assistant.possibleMatch'),
}[confidence] || t('assistant.aiRelevance'));

const voiceOptions = (t) => [
  { value: 'en-US', label: t('assistant.voiceEnglish') },
  { value: 'si-LK', label: t('assistant.voiceSinhala') },
  { value: 'ta-LK', label: t('assistant.voiceTamil') },
];

const DEFAULT_QUICK_REPLIES = ['I lost something', 'I found something', 'My reports'];

const AssistantResultCard = ({ item, closeAssistant, t }) => (
  <article className="overflow-hidden rounded-xl border border-surface-200 bg-white shadow-sm dark:border-surface-600 dark:bg-surface-800">
    <div className="flex gap-3 p-3">
      {item.image ? (
        <img src={item.image} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" loading="lazy" />
      ) : (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-surface-100 text-surface-400 dark:bg-surface-700" aria-hidden="true">
          <FiSearch className="h-6 w-6" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-700 dark:bg-primary-950/50 dark:text-primary-300">
            {item.itemType === 'FoundItem' ? t('assistant.found') : t('assistant.lost')}
          </span>
          <span className="text-xs font-semibold text-surface-500 dark:text-surface-300">
            {confidenceLabel(item.confidence, t)} · {item.relevanceScore}%
          </span>
        </div>
        <h4 className="mt-1 truncate text-base font-semibold text-surface-900 dark:text-white">{item.itemName}</h4>
        <p className="mt-1 line-clamp-2 text-sm text-surface-600 dark:text-surface-300">{item.location || item.description}</p>
      </div>
    </div>
    {item.reasons?.length > 0 && (
      <div className="border-t border-surface-100 px-3 py-2 dark:border-surface-700">
        <p className="text-xs font-semibold text-surface-600 dark:text-surface-300">{t('assistant.whyAppeared')}</p>
        <ul className="mt-1 space-y-0.5 text-xs text-surface-500 dark:text-surface-400">
          {item.reasons.slice(0, 3).map((reason) => <li key={reason}>• {reason}</li>)}
        </ul>
      </div>
    )}
    <Link
      to={item.url}
      onClick={closeAssistant}
      className="flex min-h-11 items-center justify-between border-t border-surface-200 px-3 text-sm font-semibold text-primary-700 hover:bg-primary-50 dark:border-surface-700 dark:text-primary-300 dark:hover:bg-surface-700"
    >
      {t('assistant.viewReport')} <FiChevronRight aria-hidden="true" />
    </Link>
  </article>
);


const ReportDraftCard = ({ draft, onStart, t }) => {
  if (!draft?.fields) return null;
  const details = [
    [t('assistant.item'), draft.fields.itemName],
    [t('assistant.category'), draft.fields.category],
    [t('assistant.colour'), draft.fields.colors],
    [t('assistant.location'), draft.fields.location],
    [t('assistant.dateTime'), draft.fields.date ? new Date(draft.fields.date).toLocaleString() : ''],
  ].filter(([, value]) => value);
  return (
    <section className="mt-3 w-full rounded-2xl border border-primary-200 bg-primary-50/70 p-4 dark:border-primary-900/60 dark:bg-primary-950/25" aria-label={t('assistant.draftAria')}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-primary-700 dark:text-primary-300">{t('assistant.draftTitle', { type: draft.reportType === 'found' ? t('assistant.found') : t('assistant.lost') })}</p>
          <p className="mt-1 text-sm text-surface-700 dark:text-surface-200">{t('assistant.detectedConfidence', { confidence: draft.confidence })}</p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-primary-700 shadow-sm dark:bg-surface-900 dark:text-primary-300">{t('assistant.humanReview')}</span>
      </div>
      {details.length > 0 && (
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {details.map(([label, value]) => <div key={label}><dt className="text-xs text-surface-500 dark:text-surface-400">{label}</dt><dd className="font-semibold text-surface-900 dark:text-white">{value}</dd></div>)}
        </dl>
      )}
      {draft.missing?.length > 0 && <p className="mt-3 text-xs text-amber-800 dark:text-amber-200"><strong>{t('assistant.stillNeeded')}</strong> {draft.missing.join(', ')}.</p>}
      <p className="mt-2 text-xs text-surface-600 dark:text-surface-300">{draft.privacyNotice}</p>
      <button type="button" onClick={() => onStart(draft)} className="mt-3 flex min-h-11 w-full items-center justify-between rounded-xl bg-primary-600 px-4 text-sm font-bold text-white hover:bg-primary-700">
        {t('assistant.openDraft')} <FiChevronRight aria-hidden="true" />
      </button>
    </section>
  );
};

const PersonalSummary = ({ summary, t }) => {
  if (!summary) return null;
  const metrics = [
    [t('assistant.lostReports'), summary.lostReports],
    [t('assistant.foundReports'), summary.foundReports],
    [t('assistant.pendingClaims'), summary.pendingClaims],
    [t('assistant.suggestedMatches'), summary.suggestedMatches],
    [t('assistant.unreadAlerts'), summary.unreadNotifications],
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label={t('assistant.accountActivity')}>
      {metrics.map(([label, value]) => (
        <div key={label} className="rounded-xl border border-surface-200 bg-white p-3 dark:border-surface-600 dark:bg-surface-800">
          <div className="text-xl font-bold text-surface-900 dark:text-white">{value ?? 0}</div>
          <div className="text-xs text-surface-500 dark:text-surface-400">{label}</div>
        </div>
      ))}
    </div>
  );
};

const AIChatbot = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => [initialMessage(t)]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [quickReplies, setQuickReplies] = useState(DEFAULT_QUICK_REPLIES);
  const [voiceLanguage, setVoiceLanguage] = useState('en-US');
  const [conversationId, setConversationId] = useState('');
  const [conversationHistory, setConversationHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyReady, setHistoryReady] = useState(false);
  const messagesEndRef = useRef(null);
  const dialogRef = useRef(null);
  const floatingButtonRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const lastFocusedRef = useRef(null);
  const suppressHistoryWriteRef = useRef(false);

  const closeAssistant = () => setIsOpen(false);
  const translateQuickReply = (reply) => ({
    'I lost something': t('assistant.quickLost'),
    'I found something': t('assistant.quickFound'),
    'My reports': t('assistant.quickReports'),
    'Refine search': t('assistant.refineSearch'),
  }[reply] || reply);

  useEffect(() => {
    setMessages((previous) => previous.some((message) => message.role === 'user') ? previous : [initialMessage(t)]);
  }, [t]);

  useEffect(() => {
    const conversations = loadAssistantConversations();
    setConversationHistory(conversations);
    if (conversations[0]) {
      suppressHistoryWriteRef.current = true;
      setConversationId(conversations[0].id);
      setMessages(conversations[0].messages.length ? conversations[0].messages : [initialMessage(t)]);
    } else {
      setConversationId(createAssistantConversation().id);
    }
    setHistoryReady(true);
  }, []);

  useEffect(() => {
    if (!historyReady || !conversationId) return;
    if (suppressHistoryWriteRef.current) {
      suppressHistoryWriteRef.current = false;
      return;
    }
    if (!messages.some((message) => message.role === 'user')) return;
    setConversationHistory((previous) => {
      const existing = previous.find((conversation) => conversation.id === conversationId);
      const current = createAssistantConversation({
        id: conversationId,
        messages,
        createdAt: existing?.createdAt,
      });
      return saveAssistantConversations([current, ...previous.filter((conversation) => conversation.id !== conversationId)]);
    });
  }, [conversationId, historyReady, messages]);

  const beginNewConversation = () => {
    suppressHistoryWriteRef.current = true;
    setConversationId(createAssistantConversation().id);
    setMessages([initialMessage(t)]);
    setQuickReplies(DEFAULT_QUICK_REPLIES);
    setInput('');
    setHistoryOpen(false);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const openConversation = (conversation) => {
    suppressHistoryWriteRef.current = true;
    setConversationId(conversation.id);
    setMessages(conversation.messages.length ? conversation.messages : [initialMessage(t)]);
    setQuickReplies([]);
    setHistoryOpen(false);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const deleteConversation = (conversationIdToDelete) => {
    const remaining = removeAssistantConversation(conversationIdToDelete);
    setConversationHistory(remaining);
    if (conversationIdToDelete === conversationId) beginNewConversation();
  };

  const clearAllConversationHistory = () => {
    clearAssistantConversations();
    setConversationHistory([]);
    beginNewConversation();
  };

  const startReportDraft = (draft) => {
    try {
      sessionStorage.setItem('lf-assistant-report-draft', JSON.stringify({ ...draft, createdAt: new Date().toISOString() }));
    } catch {
      toast.error(t('assistant.storageUnavailable'));
    }
    closeAssistant();
    navigate(draft.reportType === 'found' ? '/dashboard/report-found' : '/dashboard/report-lost');
  };

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('lf:assistant-state', { detail: { isOpen } }));
    return () => window.dispatchEvent(new CustomEvent('lf:assistant-state', { detail: { isOpen: false } }));
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, quickReplies, isLoading]);

  useEffect(() => {
    if (!isOpen) return undefined;
    lastFocusedRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    if (window.matchMedia('(max-width: 639px)').matches) document.body.style.overflow = 'hidden';
    window.requestAnimationFrame(() => inputRef.current?.focus());

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeAssistant();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      recognitionRef.current?.stop?.();
      lastFocusedRef.current?.focus?.();
    };
  }, [isOpen]);

  const requestAssistant = async (message, { page = 1, displayUser = true } = {}) => {
    const trimmed = String(message || '').trim();
    if (!trimmed || isLoading) return;
    const history = messages.slice(-10).map(({ role, content }) => ({ role: role === 'ai' ? 'assistant' : role, content }));
    if (displayUser) {
      setMessages((previous) => [...previous, { role: 'user', content: trimmed, timestamp: timestamp() }]);
      setInput('');
    }
    setQuickReplies([]);
    setIsLoading(true);

    try {
      const response = await api.post('/ai/chat', { message: trimmed, history, page, pageSize: 6 });
      const data = response.data?.data || {};
      setMessages((previous) => [...previous, {
        role: 'ai',
        content: data.text || t('assistant.noResponse'),
        timestamp: timestamp(),
        items: data.items || [],
        actions: data.actions || [],
        personalSummary: data.personalSummary,
        reportDraft: data.reportDraft,
        meta: data.meta,
        query: data.query,
        page: data.page,
        total: data.total,
        hasMore: data.hasMore,
      }]);
      setQuickReplies(data.quickReplies || []);
    } catch (error) {
      toast.error(t('assistant.connectionFailed'));
      setMessages((previous) => [...previous, {
        role: 'ai',
        content: t('assistant.unavailable'),
        timestamp: timestamp(),
        items: [],
        actions: [
          { type: 'search', label: t('assistant.openSearch'), url: '/lost-items' },
          { type: 'report_lost', label: t('assistant.reportLost'), url: '/dashboard/report-lost' },
        ],
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    requestAssistant(input);
  };

  const handleClearChat = () => {
    if (conversationId) {
      const remaining = removeAssistantConversation(conversationId);
      setConversationHistory(remaining);
    }
    beginNewConversation();
  };

  const toggleListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error(t('assistant.voiceUnsupported'));
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = voiceLanguage;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      setInput((previous) => `${previous} ${transcript}`.trim());
    };
    recognition.onerror = () => {
      setIsListening(false);
      toast.error(t('assistant.voiceStopped'));
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <>
      <button
        type="button"
        ref={floatingButtonRef}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5.75rem)] right-4 z-50 flex min-h-12 items-center gap-2 rounded-full bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-xl transition hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-300 sm:bottom-6 sm:right-6 ${isOpen ? 'pointer-events-none scale-90 opacity-0' : 'opacity-100'}`}
        aria-label={t('assistant.openAria')}
        aria-haspopup="dialog"
      >
        <FiMessageSquare className="h-5 w-5" aria-hidden="true" />
        <span className="hidden sm:inline">{t('assistant.askButton')}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[79] bg-surface-950/35 backdrop-blur-[2px] sm:bg-transparent sm:backdrop-blur-none" aria-hidden="true" onMouseDown={closeAssistant} />
      )}

      {isOpen && (
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="smart-lf-assistant-title"
        className="fixed inset-0 z-[80] flex flex-col overflow-hidden bg-white shadow-2xl dark:bg-surface-900 sm:inset-y-4 sm:left-auto sm:right-4 sm:w-[min(32rem,calc(100vw-2rem))] sm:rounded-2xl sm:border sm:border-surface-200 sm:dark:border-surface-700"
      >
        <header className="flex min-h-16 items-center justify-between gap-3 border-b border-surface-200 px-4 py-3 dark:border-surface-700">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300">
              <FaRobot aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 id="smart-lf-assistant-title" className="truncate text-lg font-bold text-surface-900 dark:text-white">{t('assistant.title')}</h2>
              <p className="text-xs text-surface-500 dark:text-surface-400">{t('assistant.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={beginNewConversation} className="flex h-11 w-11 items-center justify-center rounded-lg text-surface-500 hover:bg-surface-100 hover:text-primary-700 dark:hover:bg-surface-800" aria-label={t('assistant.newAria')}>
              <FiPlus aria-hidden="true" />
            </button>
            <button type="button" onClick={() => setHistoryOpen((value) => !value)} className="flex h-11 w-11 items-center justify-center rounded-lg text-surface-500 hover:bg-surface-100 hover:text-primary-700 dark:hover:bg-surface-800" aria-label={t('assistant.historyAria')} aria-expanded={historyOpen}>
              <FiClock aria-hidden="true" />
            </button>
            <button type="button" onClick={handleClearChat} className="flex h-11 w-11 items-center justify-center rounded-lg text-surface-500 hover:bg-surface-100 hover:text-red-600 dark:hover:bg-surface-800" aria-label={t('assistant.deleteCurrentAria')}>
              <FiTrash2 aria-hidden="true" />
            </button>
            <button type="button" onClick={closeAssistant} className="flex h-11 w-11 items-center justify-center rounded-lg text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800" aria-label={t('assistant.closeAria')}>
              <FiX className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </header>

        {historyOpen && (
          <aside className="absolute inset-x-0 bottom-0 top-16 z-20 overflow-y-auto bg-white p-4 dark:bg-surface-900" aria-label={t('assistant.historyTitle')}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-surface-900 dark:text-white">{t('assistant.historyTitle')}</h3>
                <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">{t('assistant.historyDesc')}</p>
              </div>
              <button type="button" onClick={() => setHistoryOpen(false)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800" aria-label={t('assistant.closeHistoryAria')}><FiX aria-hidden="true" /></button>
            </div>
            <button type="button" onClick={beginNewConversation} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-bold text-white hover:bg-primary-700"><FiPlus aria-hidden="true" /> {t('assistant.newConversation')}</button>
            {conversationHistory.length ? (
              <ul className="mt-4 space-y-2">
                {conversationHistory.map((conversation) => (
                  <li key={conversation.id} className="flex items-stretch gap-2 rounded-xl border border-surface-200 p-2 dark:border-surface-700">
                    <button type="button" onClick={() => openConversation(conversation)} className="min-h-12 min-w-0 flex-1 rounded-lg px-3 text-left hover:bg-surface-50 dark:hover:bg-surface-800" aria-current={conversation.id === conversationId ? 'true' : undefined}>
                      <span className="block truncate text-sm font-semibold text-surface-900 dark:text-white">{conversation.title}</span>
                      <span className="mt-1 block text-xs text-surface-500 dark:text-surface-400">{new Date(conversation.updatedAt).toLocaleString()} · {t('assistant.messagesCount', { count: conversation.messages.length })}</span>
                    </button>
                    <button type="button" onClick={() => deleteConversation(conversation.id)} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-surface-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30" aria-label={t('assistant.deleteConversation', { title: conversation.title })}><FiTrash2 aria-hidden="true" /></button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-5 rounded-xl bg-surface-50 p-4 text-sm text-surface-600 dark:bg-surface-800 dark:text-surface-300">{t('assistant.noHistory')}</p>
            )}
            {conversationHistory.length > 0 && <button type="button" onClick={clearAllConversationHistory} className="mt-4 min-h-11 w-full rounded-xl border border-rose-200 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/30">{t('assistant.clearHistory')}</button>}
          </aside>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-4" aria-live="polite" aria-relevant="additions">
          <div className="space-y-5">
            {messages.map((message, index) => (
              <div key={`${message.timestamp}-${index}`} className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === 'user' ? 'rounded-br-sm bg-primary-600 text-white' : 'rounded-bl-sm bg-surface-100 text-surface-900 dark:bg-surface-800 dark:text-surface-100'}`}>
                  {message.role === 'user' ? message.content : (
                    <ReactMarkdown components={{
                      a: ({ href, children }) => href?.startsWith('/') ? (
                        <Link to={href} onClick={closeAssistant} className="font-semibold text-primary-700 underline dark:text-primary-300">{children}</Link>
                      ) : <span>{children}</span>,
                    }}>{message.content}</ReactMarkdown>
                  )}
                </div>

                {message.personalSummary && <div className="mt-3 w-full"><PersonalSummary summary={message.personalSummary} t={t} /></div>}
                {message.reportDraft && <ReportDraftCard draft={message.reportDraft} onStart={startReportDraft} t={t} />}

                {message.items?.length > 0 && (
                  <div className="mt-3 w-full space-y-3">
                    <p className="text-sm font-semibold text-surface-700 dark:text-surface-200">{t('assistant.showingResults', { shown: message.items.length, total: message.total })}</p>
                    {message.items.map((item) => <AssistantResultCard key={`${item.itemType}-${item._id}`} item={item} closeAssistant={closeAssistant} t={t} />)}
                    {message.hasMore && message.query?.message && (
                      <button
                        type="button"
                        onClick={() => requestAssistant(message.query.message, { page: (message.page || 1) + 1, displayUser: false })}
                        disabled={isLoading}
                        className="min-h-11 w-full rounded-xl border border-primary-300 px-4 text-sm font-semibold text-primary-700 hover:bg-primary-50 disabled:opacity-50 dark:border-primary-700 dark:text-primary-300 dark:hover:bg-primary-950/30"
                      >
                        {t('assistant.showMore')}
                      </button>
                    )}
                  </div>
                )}

                {message.actions?.length > 0 && (
                  <div className="mt-3 flex w-full flex-wrap gap-2">
                    {message.actions.map((action) => (
                      <Link key={`${action.type}-${action.url}`} to={action.url} onClick={closeAssistant} className="inline-flex min-h-11 items-center rounded-xl border border-surface-300 bg-white px-3 text-sm font-semibold text-surface-800 hover:border-primary-400 hover:text-primary-700 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100">
                        {action.label}
                      </Link>
                    ))}
                  </div>
                )}

                {message.meta?.notice && (
                  <div className="mt-3 flex w-full gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                    <FiAlertCircle className="mt-0.5 shrink-0" aria-hidden="true" />
                    <div><strong>{message.meta.notice}</strong><div className="mt-1 font-normal">{t('assistant.source', { source: message.meta.source })}</div></div>
                  </div>
                )}
                <span className="mt-1 px-1 text-xs text-surface-400">{message.timestamp}</span>
              </div>
            ))}

            {isLoading && (
              <div role="status" className="flex items-center gap-3 rounded-xl bg-surface-100 p-3 text-sm text-surface-600 dark:bg-surface-800 dark:text-surface-300">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" aria-hidden="true" />
                {t('assistant.searching')}
              </div>
            )}

            {!isLoading && quickReplies.length > 0 && (
              <div className="flex flex-wrap gap-2" aria-label={t('assistant.suggestedQuestions')}>
                {quickReplies.map((reply) => (
                  <button key={reply} type="button" onClick={() => reply === 'Refine search' ? inputRef.current?.focus() : requestAssistant(translateQuickReply(reply))} className="min-h-11 rounded-full border border-primary-200 bg-primary-50 px-4 text-sm font-semibold text-primary-700 hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-950/30 dark:text-primary-300">
                    {translateQuickReply(reply)}
                  </button>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="border-t border-surface-200 bg-white p-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] dark:border-surface-700 dark:bg-surface-900">
          <div className="mb-2 flex items-center justify-between gap-2">
            <label htmlFor="assistant-voice-language" className="text-xs font-medium text-surface-500 dark:text-surface-400">{t('assistant.voiceLanguage')}</label>
            <select id="assistant-voice-language" value={voiceLanguage} onChange={(event) => setVoiceLanguage(event.target.value)} className="min-h-9 rounded-lg border border-surface-300 bg-white px-2 text-xs text-surface-700 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-200">
              {voiceOptions(t).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <label htmlFor="assistant-message" className="sr-only">{t('assistant.inputLabel')}</label>
            <textarea
              ref={inputRef}
              id="assistant-message"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  if (input.trim()) requestAssistant(input);
                }
              }}
              rows={1}
              maxLength={500}
              placeholder={t('assistant.placeholder')}
              className="min-h-12 max-h-32 flex-1 resize-y rounded-xl border border-surface-300 bg-surface-50 px-3 py-3 text-base text-surface-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-surface-600 dark:bg-surface-800 dark:text-white dark:focus:ring-primary-900"
            />
            <button type="button" onClick={toggleListening} className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${isListening ? 'border-red-300 bg-red-50 text-red-600 dark:bg-red-950/40' : 'border-surface-300 text-surface-600 hover:bg-surface-100 dark:border-surface-600 dark:text-surface-300 dark:hover:bg-surface-800'}`} aria-label={isListening ? t('assistant.stopVoice') : t('assistant.startVoice')} aria-pressed={isListening}>
              <FiMic aria-hidden="true" />
            </button>
            <button type="submit" disabled={!input.trim() || isLoading} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50" aria-label={t('assistant.send')}>
              <FiSend aria-hidden="true" />
            </button>
          </div>
          <p className="mt-2 text-xs text-surface-500 dark:text-surface-400">{t('assistant.ownershipNote')}</p>
        </form>
      </section>
      )}
    </>
  );
};

export default AIChatbot;
