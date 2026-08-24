import React, { useEffect, useRef, useState } from 'react';
import {
  FiAlertCircle,
  FiChevronRight,
  FiClock,
  FiGlobe,
  FiMic,
  FiMessageSquare,
  FiPackage,
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
import { isSafeInternalPath, toSafeInternalPath } from '../../utils/internalNavigation';

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
    <div className="grid grid-cols-2 border-t border-surface-200 dark:border-surface-700">
      <Link
        to={toSafeInternalPath(item.url, '/search')}
        onClick={closeAssistant}
        className="flex min-h-11 items-center justify-between border-r border-surface-200 px-3 text-sm font-semibold text-primary-700 hover:bg-primary-50 dark:border-surface-700 dark:text-primary-300 dark:hover:bg-surface-700"
      >
        {t('assistant.viewReport')} <FiChevronRight aria-hidden="true" />
      </Link>
      <Link
        to={toSafeInternalPath(item.claimUrl, item.url)}
        onClick={closeAssistant}
        className="flex min-h-11 items-center justify-center px-3 text-center text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-surface-700"
      >
        {t(item.itemType === 'FoundItem' ? 'detail.thisMine' : 'detail.iHaveThis')}
      </Link>
    </div>
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
  const [mobileViewport, setMobileViewport] = useState(null);
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

  useEffect(() => {
    if (!isOpen) {
      setMobileViewport(null);
      return undefined;
    }
    const viewport = window.visualViewport;
    const syncViewport = () => {
      if (!window.matchMedia('(max-width: 639px)').matches) {
        setMobileViewport(null);
        return;
      }
      setMobileViewport({
        height: Math.round(viewport?.height || window.innerHeight),
        top: Math.round(viewport?.offsetTop || 0),
      });
    };
    syncViewport();
    viewport?.addEventListener('resize', syncViewport);
    viewport?.addEventListener('scroll', syncViewport);
    window.addEventListener('orientationchange', syncViewport);
    return () => {
      viewport?.removeEventListener('resize', syncViewport);
      viewport?.removeEventListener('scroll', syncViewport);
      window.removeEventListener('orientationchange', syncViewport);
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

  const adjustTextareaHeight = () => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 180)}px`;
    }
  };

  const handleInputChange = (event) => {
    setInput(event.target.value);
    adjustTextareaHeight();
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

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

  const isInitialOnly = messages.length === 1 && messages[0].role === 'ai';

  return (
    <>
      <button
        type="button"
        ref={floatingButtonRef}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5.75rem)] right-4 z-50 flex min-h-12 items-center gap-2.5 rounded-full bg-gradient-to-r from-primary-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-primary-500/25 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-primary-500/40 focus:outline-none focus:ring-4 focus:ring-primary-300 sm:bottom-6 sm:right-6 ${isOpen ? 'pointer-events-none scale-90 opacity-0' : 'opacity-100'}`}
        aria-label={t('assistant.openAria')}
        aria-haspopup="dialog"
      >
        <FaRobot className="h-5 w-5 animate-pulse" aria-hidden="true" />
        <span className="hidden sm:inline font-display font-medium tracking-wide">{t('assistant.askButton')}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[79] bg-surface-950/40 backdrop-blur-sm transition-opacity sm:bg-surface-950/20" aria-hidden="true" onMouseDown={closeAssistant} />
      )}

      {isOpen && (
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="smart-lf-assistant-title"
        className="fixed inset-0 z-[80] flex flex-col overflow-hidden bg-white shadow-2xl dark:bg-surface-900 sm:inset-y-4 sm:left-auto sm:right-4 sm:w-[min(32rem,calc(100vw-2rem))] sm:rounded-2xl sm:border sm:border-surface-200/80 sm:dark:border-surface-700/80"
        style={mobileViewport ? { height: `${mobileViewport.height}px`, top: `${mobileViewport.top}px`, bottom: 'auto' } : undefined}
      >
        {/* Modern Header */}
        <header className="flex min-h-16 items-center justify-between gap-2.5 border-b border-surface-200/80 bg-white/95 px-3.5 sm:px-4 py-2.5 sm:py-3 backdrop-blur-md dark:border-surface-700/80 dark:bg-surface-900/95">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <div className="relative flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-500 text-white shadow-md shadow-primary-500/20">
              <FaRobot className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-white dark:bg-surface-900">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </span>
            </div>
            <div className="min-w-0">
              <h2 id="smart-lf-assistant-title" className="truncate text-sm sm:text-base font-bold text-surface-900 dark:text-white font-display">
                {t('assistant.title')}
              </h2>
              <p className="flex items-center gap-1.5 truncate text-[11px] sm:text-xs text-surface-500 dark:text-surface-400">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Online AI</span>
                <span>•</span>
                <span className="truncate">{t('assistant.subtitle')}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <button
              type="button"
              onClick={beginNewConversation}
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-surface-500 hover:bg-surface-100 hover:text-primary-700 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-primary-300 transition-colors"
              aria-label={t('assistant.newAria')}
              title={t('assistant.newConversation')}
            >
              <FiPlus className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setHistoryOpen((value) => !value)}
              className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg transition-colors ${
                historyOpen
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300'
                  : 'text-surface-500 hover:bg-surface-100 hover:text-primary-700 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-primary-300'
              }`}
              aria-label={t('assistant.historyAria')}
              aria-expanded={historyOpen}
              title={t('assistant.historyTitle')}
            >
              <FiClock className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handleClearChat}
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-surface-500 hover:bg-rose-50 hover:text-rose-600 dark:text-surface-400 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 transition-colors"
              aria-label={t('assistant.deleteCurrentAria')}
              title={t('assistant.clearHistory')}
            >
              <FiTrash2 className="h-4 w-4" aria-hidden="true" />
            </button>
            <div className="mx-0.5 h-4 w-px bg-surface-200 dark:bg-surface-700" />
            <button
              type="button"
              onClick={closeAssistant}
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-surface-500 hover:bg-surface-100 hover:text-surface-800 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200 transition-colors"
              aria-label={t('assistant.closeAria')}
            >
              <FiX className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* History Slide-over */}
        {historyOpen && (
          <aside className="absolute inset-x-0 bottom-0 top-16 z-20 overflow-y-auto bg-white p-4 dark:bg-surface-900" aria-label={t('assistant.historyTitle')}>
            <div className="flex items-start justify-between gap-3 border-b border-surface-100 pb-3 dark:border-surface-800">
              <div>
                <h3 className="text-base font-bold text-surface-900 dark:text-white font-display">{t('assistant.historyTitle')}</h3>
                <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">{t('assistant.historyDesc')}</p>
              </div>
              <button type="button" onClick={() => setHistoryOpen(false)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800" aria-label={t('assistant.closeHistoryAria')}><FiX aria-hidden="true" /></button>
            </div>
            <button type="button" onClick={beginNewConversation} className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 shadow-sm transition"><FiPlus aria-hidden="true" /> {t('assistant.newConversation')}</button>
            {conversationHistory.length ? (
              <ul className="mt-3 space-y-2">
                {conversationHistory.map((conversation) => (
                  <li key={conversation.id} className="flex items-stretch gap-2 rounded-xl border border-surface-200 p-1.5 dark:border-surface-700">
                    <button type="button" onClick={() => openConversation(conversation)} className="min-h-11 min-w-0 flex-1 rounded-lg px-3 text-left hover:bg-surface-50 dark:hover:bg-surface-800" aria-current={conversation.id === conversationId ? 'true' : undefined}>
                      <span className="block truncate text-sm font-semibold text-surface-900 dark:text-white">{conversation.title}</span>
                      <span className="mt-0.5 block text-xs text-surface-500 dark:text-surface-400">{new Date(conversation.updatedAt).toLocaleString()} · {t('assistant.messagesCount', { count: conversation.messages.length })}</span>
                    </button>
                    <button type="button" onClick={() => deleteConversation(conversation.id)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-surface-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30" aria-label={t('assistant.deleteConversation', { title: conversation.title })}><FiTrash2 aria-hidden="true" /></button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 rounded-xl bg-surface-50 p-4 text-center text-sm text-surface-500 dark:bg-surface-800 dark:text-surface-400">{t('assistant.noHistory')}</p>
            )}
            {conversationHistory.length > 0 && <button type="button" onClick={clearAllConversationHistory} className="mt-4 min-h-10 w-full rounded-xl border border-rose-200 px-4 text-xs font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/30">{t('assistant.clearHistory')}</button>}
          </aside>
        )}

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" aria-live="polite" aria-relevant="additions">
          {messages.map((message, index) => (
            <div key={`${message.timestamp}-${index}`} className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className="flex items-start gap-2.5 max-w-[92%]">
                {message.role === 'ai' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300 mt-1">
                    <FaRobot className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                )}
                <div className={`rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                  message.role === 'user'
                    ? 'rounded-tr-sm bg-gradient-to-r from-primary-600 to-indigo-600 text-white'
                    : 'rounded-tl-sm bg-surface-100/90 text-surface-900 border border-surface-200/70 dark:bg-surface-800/90 dark:border-surface-700/60 dark:text-surface-100'
                }`}>
                  {message.role === 'user' ? (
                    <span>{message.content}</span>
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown components={{
                        a: ({ href, children }) => isSafeInternalPath(href) ? (
                          <Link to={toSafeInternalPath(href)} onClick={closeAssistant} className="font-semibold text-primary-600 underline dark:text-primary-400 hover:opacity-80">{children}</Link>
                        ) : <span>{children}</span>,
                      }}>{message.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>

              {message.personalSummary && <div className="mt-3 w-full"><PersonalSummary summary={message.personalSummary} t={t} /></div>}
              {message.reportDraft && <ReportDraftCard draft={message.reportDraft} onStart={startReportDraft} t={t} />}

              {message.items?.length > 0 && (
                <div className="mt-3 w-full space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">{t('assistant.showingResults', { shown: message.items.length, total: message.total })}</p>
                  {message.items.map((item) => <AssistantResultCard key={`${item.itemType}-${item._id}`} item={item} closeAssistant={closeAssistant} t={t} />)}
                  {message.hasMore && message.query?.message && (
                    <button
                      type="button"
                      onClick={() => requestAssistant(message.query.message, { page: (message.page || 1) + 1, displayUser: false })}
                      disabled={isLoading}
                      className="min-h-10 w-full rounded-xl border border-primary-300 bg-primary-50/50 px-4 text-xs font-bold text-primary-700 hover:bg-primary-100 disabled:opacity-50 dark:border-primary-800 dark:bg-primary-950/30 dark:text-primary-300 transition"
                    >
                      {t('assistant.showMore')}
                    </button>
                  )}
                </div>
              )}

              {message.actions?.length > 0 && (
                <div className="mt-3 flex w-full flex-wrap gap-2">
                  {message.actions.map((action) => {
                    const safeUrl = toSafeInternalPath(action.url, '');
                    return safeUrl ? (
                      <Link key={`${action.type}-${action.url}`} to={safeUrl} onClick={closeAssistant} className="inline-flex min-h-9 items-center rounded-xl border border-surface-200 bg-white px-3 text-xs font-semibold text-surface-800 shadow-sm hover:border-primary-400 hover:text-primary-700 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 transition">
                        {action.label}
                      </Link>
                    ) : null;
                  })}
                </div>
              )}

              {message.meta?.notice && (
                <div className="mt-3 flex w-full gap-2 rounded-xl border border-amber-200/80 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                  <FiAlertCircle className="mt-0.5 shrink-0" aria-hidden="true" />
                  <div><strong>{message.meta.notice}</strong><div className="mt-0.5 font-normal text-amber-800/90 dark:text-amber-300/80">{t('assistant.source', { source: message.meta.source })}</div></div>
                </div>
              )}
              <span className="mt-1 px-9 text-[11px] text-surface-400">{message.timestamp}</span>
            </div>
          ))}

          {/* Quick Starter Grid when conversation is empty */}
          {isInitialOnly && (
            <div className="mt-2 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-surface-400 px-1">Suggested Inquiries</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => requestAssistant('I lost my item on campus')}
                  className="flex items-center gap-2.5 p-3 rounded-xl border border-surface-200/80 bg-surface-50/60 text-left hover:border-primary-400 hover:bg-primary-50/40 dark:border-surface-700/80 dark:bg-surface-800/40 dark:hover:border-primary-700 transition group"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                    <FiSearch className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-surface-800 dark:text-surface-100 group-hover:text-primary-600 dark:group-hover:text-primary-400">Lost Something</div>
                    <div className="text-[11px] text-surface-500 dark:text-surface-400 truncate">Search & draft a report</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => requestAssistant('I found an item on campus')}
                  className="flex items-center gap-2.5 p-3 rounded-xl border border-surface-200/80 bg-surface-50/60 text-left hover:border-emerald-400 hover:bg-emerald-50/40 dark:border-surface-700/80 dark:bg-surface-800/40 dark:hover:border-emerald-700 transition group"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <FiPackage className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-surface-800 dark:text-surface-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">Found an Item</div>
                    <div className="text-[11px] text-surface-500 dark:text-surface-400 truncate">Help return to owner</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => requestAssistant('Items found near Library')}
                  className="flex items-center gap-2.5 p-3 rounded-xl border border-surface-200/80 bg-surface-50/60 text-left hover:border-amber-400 hover:bg-amber-50/40 dark:border-surface-700/80 dark:bg-surface-800/40 dark:hover:border-amber-700 transition group"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                    <FiSearch className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-surface-800 dark:text-surface-100 group-hover:text-amber-600 dark:group-hover:text-amber-400">Library Area</div>
                    <div className="text-[11px] text-surface-500 dark:text-surface-400 truncate">Check recent findings</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => requestAssistant('My reports')}
                  className="flex items-center gap-2.5 p-3 rounded-xl border border-surface-200/80 bg-surface-50/60 text-left hover:border-primary-400 hover:bg-primary-50/40 dark:border-surface-700/80 dark:bg-surface-800/40 dark:hover:border-primary-700 transition group"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300">
                    <FiClock className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-surface-800 dark:text-surface-100 group-hover:text-primary-600 dark:group-hover:text-primary-400">My Activity</div>
                    <div className="text-[11px] text-surface-500 dark:text-surface-400 truncate">Claims, matches, alerts</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {isLoading && (
            <div role="status" className="flex items-center gap-3 rounded-2xl bg-surface-100/80 p-3.5 text-sm text-surface-600 dark:bg-surface-800/80 dark:text-surface-300 border border-surface-200/50 dark:border-surface-700/50">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" aria-hidden="true" />
              <span className="text-xs font-medium">{t('assistant.searching')}</span>
            </div>
          )}

          {!isLoading && !isInitialOnly && quickReplies.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1" aria-label={t('assistant.suggestedQuestions')}>
              {quickReplies.map((reply) => (
                <button
                  key={reply}
                  type="button"
                  onClick={() => reply === 'Refine search' ? inputRef.current?.focus() : requestAssistant(translateQuickReply(reply))}
                  className="rounded-full border border-primary-200/80 bg-primary-50/70 px-3.5 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-100 hover:border-primary-300 dark:border-primary-900/60 dark:bg-primary-950/40 dark:text-primary-300 dark:hover:bg-primary-950/70 transition shadow-2xs"
                >
                  {translateQuickReply(reply)}
                </button>
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Polished Capsule Input Bar */}
        <form onSubmit={handleSubmit} className="border-t border-surface-200/80 bg-white p-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] dark:border-surface-700/80 dark:bg-surface-900">
          <div className="rounded-2xl border border-surface-300/80 bg-surface-50/90 p-2 shadow-inner-sm focus-within:border-primary-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-primary-500/20 dark:border-surface-700 dark:bg-surface-800/60 dark:focus-within:bg-surface-800 transition-all">
            <label htmlFor="assistant-message" className="sr-only">{t('assistant.inputLabel')}</label>
            <textarea
              ref={inputRef}
              id="assistant-message"
              value={input}
              onChange={handleInputChange}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  if (input.trim()) requestAssistant(input);
                }
              }}
              rows={1}
              maxLength={500}
              placeholder={t('assistant.placeholder')}
              className="w-full resize-none border-0 bg-transparent px-2.5 py-1.5 text-sm leading-relaxed text-surface-900 placeholder:text-surface-400 outline-none dark:text-white dark:placeholder:text-surface-500 max-h-40 overflow-y-auto"
              style={{ minHeight: '38px' }}
            />
            
            <div className="mt-1 flex items-center justify-between gap-2 border-t border-surface-200/60 pt-2 dark:border-surface-700/60">
              {/* Language Selector Pill */}
              <div className="flex items-center gap-1 text-surface-500 dark:text-surface-400">
                <FiGlobe className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <label htmlFor="assistant-voice-language" className="sr-only">{t('assistant.voiceLanguage')}</label>
                <select
                  id="assistant-voice-language"
                  value={voiceLanguage}
                  onChange={(event) => setVoiceLanguage(event.target.value)}
                  className="bg-transparent text-[11px] font-medium text-surface-600 dark:text-surface-300 outline-none cursor-pointer hover:text-primary-600 dark:hover:text-primary-400"
                >
                  {voiceOptions(t).map((option) => <option key={option.value} value={option.value} className="bg-white dark:bg-surface-800 text-surface-800 dark:text-surface-200">{option.label}</option>)}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
                    isListening
                      ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30'
                      : 'text-surface-500 hover:bg-surface-200/60 hover:text-surface-800 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-surface-100'
                  }`}
                  aria-label={isListening ? t('assistant.stopVoice') : t('assistant.startVoice')}
                  aria-pressed={isListening}
                  title="Voice input"
                >
                  <FiMic className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-primary-600 to-indigo-600 text-white shadow-sm transition hover:opacity-90 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
                  aria-label={t('assistant.send')}
                  title="Send message"
                >
                  <FiSend className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-surface-400 dark:text-surface-500 font-medium">
            AI Assistant · {t('assistant.ownershipNote')}
          </p>
        </form>
      </section>
      )}
    </>
  );
};

export default AIChatbot;
