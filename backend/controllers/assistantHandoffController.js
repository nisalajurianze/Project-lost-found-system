import AssistantHandoff from '../models/AssistantHandoff.js';
import AssistantSession from '../models/AssistantSession.js';
import { inspectAIInput, redactPrivateText } from '../services/aiSafetyService.js';
import { sessionKeyFor } from '../services/conversationStateService.js';
import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { paginate } from '../utils/pagination.js';

const handoffSafeText = (value) => redactPrivateText(String(value || ''))
  .replace(/\b(?:student\s*)?(?:id|reg(?:istration)?)\s*[:#-]?\s*[a-z0-9/-]{4,}\b/giu, '[private identifier removed]')
  .replace(/\*{4,}\d{4}/gu, '[private contact removed]')
  .replace(/\b[A-Z0-9._%+-]{1,2}\*{3}@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu, '[private contact removed]');

const redactedSessionSummary = (session, reason) => {
  const slots = session.slots instanceof Map ? Object.fromEntries(session.slots) : session.slots || {};
  const safeSlots = Object.fromEntries(Object.entries(slots).slice(0, 20).map(([key, entry]) => [
    String(key).slice(0, 40),
    handoffSafeText(entry?.value ?? entry ?? '').slice(0, 300),
  ]));
  return handoffSafeText(JSON.stringify({
    reportType: session.reportType,
    state: session.state,
    missing: session.missing,
    details: safeSlots,
    userRequest: reason,
  })).slice(0, 3000);
};

const requestAssistantHandoff = asyncHandler(async (req, res) => {
  if (req.body?.consent !== true) throw ApiError.badRequest('Explicit consent is required before sharing a redacted assistant summary with helpdesk.');
  const sessionId = String(req.body?.sessionId || '').trim();
  if (!sessionId || sessionId.length > 160) throw ApiError.badRequest('A valid assistant session ID is required.');
  const sessionKey = sessionKeyFor(sessionId);
  const session = await AssistantSession.findOne({ sessionKey });
  if (!session) throw ApiError.notFound('Assistant session not found.');
  if (session.ownerId && String(session.ownerId) !== String(req.user._id)) throw ApiError.forbidden('This assistant session belongs to another account.');
  if (!session.ownerId) session.ownerId = req.user._id;
  const inspected = inspectAIInput(req.body?.reason || 'User requested helpdesk support.', { maxLength: 500 });
  const reason = handoffSafeText(inspected.redactedText) || 'User requested helpdesk support.';
  let handoff = await AssistantHandoff.findOne({ sessionKey, status: { $in: ['queued', 'in-progress'] } });
  if (!handoff) {
    handoff = await AssistantHandoff.create({
      sessionKey,
      assistantSessionId: session._id,
      requestedBy: req.user._id,
      reason,
      redactedSummary: redactedSessionSummary(session.toObject(), reason),
      responseStyle: session.responseStyle,
      safetyFlags: inspected.issues,
      consent: true,
    });
  }
  session.state = 'handoff';
  session.stateVersion += 1;
  session.lastActivityAt = new Date();
  await session.save();
  return ApiResponse.created({
    ticketId: handoff._id,
    status: handoff.status,
    stateVersion: session.stateVersion,
    policy: handoff.policy,
  }, 'Conversation queued for authorized helpdesk review.').send(res);
});

const getOwnHandoff = asyncHandler(async (req, res) => {
  const handoff = await AssistantHandoff.findOne({ _id: req.params.id, requestedBy: req.user._id })
    .select('_id status createdAt resolvedAt policy')
    .lean();
  if (!handoff) throw ApiError.notFound('Helpdesk handoff not found.');
  return ApiResponse.ok(handoff, 'Helpdesk handoff status retrieved.').send(res);
});

const listAssistantHandoffs = asyncHandler(async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  const totalDocs = await AssistantHandoff.countDocuments(filter);
  const pagination = paginate(req.query, totalDocs);
  const handoffs = await AssistantHandoff.find(filter)
    .populate('requestedBy', 'fullName email')
    .populate('assignedTo', 'fullName')
    .sort({ createdAt: 1 })
    .skip(pagination.skip)
    .limit(pagination.limit)
    .lean();
  return ApiResponse.ok({ handoffs, pagination, policy: 'Only a consented, privacy-redacted summary is available to authorized administrators.' }, 'Assistant handoffs retrieved.').send(res);
});

const reviewAssistantHandoff = asyncHandler(async (req, res) => {
  const status = String(req.body?.status || '');
  if (!['in-progress', 'resolved', 'closed'].includes(status)) throw ApiError.badRequest('Unsupported handoff status.');
  const handoff = await AssistantHandoff.findById(req.params.id);
  if (!handoff) throw ApiError.notFound('Assistant handoff not found.');
  handoff.status = status;
  handoff.assignedTo = req.user._id;
  handoff.adminNote = String(req.body?.adminNote || '').normalize('NFKC').trim().slice(0, 1000);
  handoff.resolvedAt = ['resolved', 'closed'].includes(status) ? new Date() : null;
  await handoff.save();
  return ApiResponse.ok(handoff, 'Helpdesk handoff updated.').send(res);
});

export {
  getOwnHandoff,
  listAssistantHandoffs,
  redactedSessionSummary,
  requestAssistantHandoff,
  reviewAssistantHandoff,
};
