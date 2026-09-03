# AI Platform Capability Matrix (AI-01 to AI-21)

**Source snapshot:** 2026-09-03 working tree  
**Status meaning:** `Implemented locally` means the source, deterministic tests, lint, and build path exist. It does not replace provider, device, privacy-board, or university acceptance.

| ID | Capability | Local implementation | Verification | Remaining live gate |
|---|---|---|---|---|
| AI-01 | Remember details and ask one missing detail | `AssistantSession`, `assistantConversationService`, chatbot progress/review UI | Stateful conversation tests | Mongo TTL/retention UAT |
| AI-02 | Correct or undo a detail | Field operations and change history in `assistantConversationService` | Correction/undo/stale-state tests | Multilingual field-user UAT |
| AI-03 | Approval-gated report submission | `AssistantSubmission`, confirmation token, idempotent submit routes | Confirmation/auth/double-submit tests | Staging Mongo transaction UAT |
| AI-04 | Semantic multilingual search | `semanticSearchService`, hybrid reranking, `AIEmbeddingRecord` | Semantic, Tamil, Singlish relevance evals | Atlas scale/recall benchmark |
| AI-05 | Photo similarity and OCR | vision-v3 analysis, OCR regions, visual fingerprint/provider fusion | Image intelligence/comparison tests | Approved live vision model UAT |
| AI-06 | Feedback-based improvement | sealed snapshots, offline metrics, challenger/champion human promotion | Governance/calibration tests | Minimum 20 approved outcomes |
| AI-07 | Injection/privacy/hallucination safety | safety gateway, prompt registry, safe provider envelope, grounding checks | Adversarial safety corpus | Institutional red-team acceptance |
| AI-08 | Automated AI evals | versioned golden-v2 runner with per-language/capability metrics | `npm run eval:ai`, 17 deterministic cases | Expand approved field corpus |
| AI-09 | Voice input/output | consented browser speech recognition, editable transcript, TTS/stop | Frontend source/contract tests | Real Android/iOS/browser-device UAT |
| AI-10 | Spelling correction | curated typo/transliteration aliases plus bounded fuzzy matching | `cateen` and `libry` golden cases | Admin alias approval workflow UAT |
| AI-11 | Campus knowledge | governed `AIKnowledgeArticle`, verified SEUSL aliases/locations and citations | Knowledge/citation/visibility tests | University content-owner approval |
| AI-12 | Smart notifications | calibrated eligibility, preferences, quiet hours, durable outbox/dedupe | Notification phase-6 tests | Real email/push acceptance |
| AI-13 | Lost-item poster | owner-only privacy-safe SVG preview, multilingual copy, deep link, approval/download/expiry | Poster allowlist/privacy tests | Brand/template and print UAT |
| AI-14 | Photo quality checker | client deterministic quality checks plus vision quality subscores/guidance | Quality/caption tests | Mobile camera threshold tuning |
| AI-15 | Sensitive-data detector | OCR category/regions, phone/card/ID/email masking, pixelation and re-scan policy | Redaction and privacy evals | Zero-leak live-provider corpus |
| AI-16 | Duplicate/spam detector | cross-account semantic/visual/burst signals, advisory admin queue | Duplicate governance tests | False-positive/appeal field UAT |
| AI-17 | Human handoff | consent-required redacted summary, owner status, authorised admin queue | Handoff privacy/route/UI tests | Helpdesk SLA and staffing sign-off |
| AI-18 | Admin analytics AI | aggregate-only Colombo time/category/location explanation | Grounding/privacy tests | Admin interpretation UAT |
| AI-19 | Accessibility descriptions | draft, edit, approve/reject, safe serializer and public alt fallback | Caption/i18n/privacy tests | Screen-reader acceptance |
| AI-20 | Recovery assistant | state-aware match/claim/handover safety guidance and escalation | Conversation/recovery tests | End-to-end handover UAT |
| AI-21 | FAQ assistant | approved, versioned, visibility-aware FAQ retrieval with citations/refusal | Knowledge/FAQ tests | Policy-owner content approval |

## Safe data migration

Run the AI migration as a read-only inventory first:

```bash
cd backend
npm run migrate:ai
```

After a verified backup, run the idempotent apply mode explicitly:

```bash
CONFIRM_AI_MIGRATION=YES npm run migrate:ai -- --apply
```

It backfills smart-notification defaults, vision-v3 document defaults, local semantic embeddings for active reports and approved knowledge, and the new indexes. It does not delete reports, feedback, images, users, or claims.

## Release boundary

All 21 capabilities have a local implementation and deterministic regression path. External AI remains optional and fail-closed. Production enablement still requires approved model/privacy/cost configuration, real email/push and device testing, migration backup/restore evidence, load/accessibility UAT, and institutional sign-off.

## Verification evidence

- Backend: 133 tests discovered; 132 passed, 0 failed, 1 intentionally skipped integration case.
- Frontend: 130 tests passed, 0 failed; ESLint passed; Vite production build passed.
- AI golden-v2: 17/17 passed across English, Sinhala, Tamil, Singlish and mixed-language safety/ranking/calibration cases.
- Browser: Tamil desktop at 1280 px and mobile at 390 px had no horizontal overflow; the assistant occupied exactly the 390×844 mobile viewport; no application runtime error or framework overlay was detected. Backend network calls were replaced with deterministic browser fixtures for this UI-only check.
- Migration: source/syntax/idempotent-upsert tests passed. No production migration was executed without backup and explicit confirmation.
