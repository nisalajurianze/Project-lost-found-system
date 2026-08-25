const ASSISTANT_REPORT_DRAFT_KEY = 'lf-assistant-report-draft';
const ASSISTANT_REPORT_DRAFT_TTL_MS = 30 * 60 * 1000;

const normalizePrincipalId = (principalId) => String(principalId || 'guest').trim() || 'guest';
const getAssistantReportDraftKey = (principalId) => `${ASSISTANT_REPORT_DRAFT_KEY}:${encodeURIComponent(normalizePrincipalId(principalId))}`;

const saveAssistantReportDraft = (draft, {
  principalId = 'guest',
  storage = globalThis.sessionStorage,
  now = Date.now(),
} = {}) => {
  const normalizedPrincipalId = normalizePrincipalId(principalId);
  const payload = { ...draft, principalId: normalizedPrincipalId, createdAt: new Date(now).toISOString() };
  storage?.removeItem?.(ASSISTANT_REPORT_DRAFT_KEY);
  storage?.setItem?.(getAssistantReportDraftKey(normalizedPrincipalId), JSON.stringify(payload));
  return payload;
};

const consumeAssistantReportDraft = ({
  principalId = 'guest',
  reportType,
  storage = globalThis.sessionStorage,
  now = Date.now(),
} = {}) => {
  if (!storage?.getItem) return null;
  const normalizedPrincipalId = normalizePrincipalId(principalId);
  const key = getAssistantReportDraftKey(normalizedPrincipalId);
  storage.removeItem?.(ASSISTANT_REPORT_DRAFT_KEY);
  const raw = storage.getItem(key);
  storage.removeItem?.(key);
  if (!raw) return null;

  try {
    const draft = JSON.parse(raw);
    const createdAt = Date.parse(draft?.createdAt);
    const age = now - createdAt;
    if (
      draft?.principalId !== normalizedPrincipalId
      || draft?.reportType !== reportType
      || !draft?.fields
      || typeof draft.fields !== 'object'
      || !Number.isFinite(createdAt)
      || age < 0
      || age > ASSISTANT_REPORT_DRAFT_TTL_MS
    ) return null;
    return draft;
  } catch {
    return null;
  }
};

const clearAssistantReportDraft = ({ principalId = 'guest', storage = globalThis.sessionStorage } = {}) => {
  storage?.removeItem?.(getAssistantReportDraftKey(principalId));
  storage?.removeItem?.(ASSISTANT_REPORT_DRAFT_KEY);
};

export {
  ASSISTANT_REPORT_DRAFT_KEY,
  ASSISTANT_REPORT_DRAFT_TTL_MS,
  getAssistantReportDraftKey,
  saveAssistantReportDraft,
  consumeAssistantReportDraft,
  clearAssistantReportDraft,
};
