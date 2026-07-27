# Software Requirements Specification — Smart Lost & Found

## 1. Scope
A multilingual, privacy-aware MERN platform for SEUSL students and administrators to report, search, match, claim and safely hand over lost property across Oluvil, Sammanthurai, Mahapola/Technology-related and approved surrounding locations.

## 2. Actors
- Public visitor: browse/search privacy-reduced reports.
- Authenticated student/user: report/edit, receive matches, claim, communicate and confirm handover.
- Reporter/finder: review claims and share contact.
- Administrator: users, categories, claims, matches, moderation, AI feedback, location governance, audit and operations.
- External providers: database, Redis, image storage, email, push, OAuth, AI and optional places.

## 3. Functional requirements
FR-01 account registration, verification, login, rotation/revocation, reset and Google login when approved.  
FR-02 public report responses must redact email/phone/student ID/private fields.  
FR-03 guided EN/SI/TA create/edit lost/found workflow with autosave, offline text-draft protection, image rotate/centre-crop, privacy re-review, upload progress and validation summary.
FR-04 reviewable image suggestions; manual fallback; no silent overwrite.  
FR-05 multilingual natural-language search with totals, ranking, filters and pagination.  
FR-06 explainable lost↔found matching across 11+ evidence dimensions.  
FR-07 duplicate-report and completeness preflight.  
FR-08 trilingual English/Sinhala/Tamil five-step claim, ownership-claim dashboard and lost/found detail recovery actions with private evidence, item-specific ownership questions and explicit human-decision wording.
FR-09 transactional claim/match/item state changes and idempotent notifications.  
FR-10 contact sharing only after authorised action.  
FR-11 two-party/authorised handover completion workflow.  
FR-12 notifications through in-app/email and optional push.  
FR-13 task-first student dashboard.  
FR-14 operational admin queues and accurate metrics.  
FR-15 governed regional location aliases, confidence, sensitivity and versions.  
FR-16 AI provider failover, schema validation, timeout and monitoring.  
FR-17 advisory fraud/evidence flags; no automated sanction.  
FR-18 approved-only AI correction dataset.  
FR-19 privacy redaction/moderation and signed private evidence access.  
FR-20 trilingual user notification centre and preference controls for optional push/email channels and workflow categories, while preserving in-app audit records and mandatory security messages.
FR-21 data requests, anonymisation/deletion and retention lifecycle.
FR-22 privacy-minimised assistant conversation history with explicit new/open/delete/clear controls, browser-local text-only storage, bounded retention and no persistence of cards, account summaries, images or evidence.
FR-23 URL-backed public search filters and privacy-minimised browser-local saved searches with deduplication, rerun/delete controls, five-entry limit and 30-day expiry.
FR-24 browser-local accessibility preferences for text scaling, high contrast, reduced motion and low-effects rendering, with immediate application and explicit reset.
FR-25 trilingual English/Sinhala/Tamil management of the user's lost reports, found listings and AI match recommendations, including localized dates, actions, confirmations, empty states and feedback subjects.
FR-26 trilingual profile and password settings, including localized validation, image-processing feedback and accessible password visibility controls.
FR-27 trilingual signed-out authentication and account-recovery journeys for registration, login, forgot/reset password and email verification, including localized validation/fallbacks and accessible password controls.
FR-28 trilingual public information, support and legacy lost/found directory controls, including configured contact fallbacks, authenticated feedback submission, filters and pagination.
FR-29 trilingual administrator navigation and operational dashboard queues, including database-backed urgency metrics, AI provider health and explicit human-review wording.
FR-30 trilingual administrator site settings with typed contact/authentication controls, request-rate limits that match backend bounds, and a rejected-claim threshold that creates advisory human-review evidence without automatic account sanctions.
FR-31 truthful multilingual administrator audit, analytics and feedback surfaces that preserve original evidence, never fabricate missing metadata, render structured aggregate guidance, and use backend-aligned feedback enums/routes/length constraints.
FR-32 trilingual handover-resolution verification with explicit physical-exchange confirmation, human-decision wording, an accessible cancellation confirmation, and a bounded cancellation reason; recovery feedback controls shall be keyboard and screen-reader accessible.
FR-33 shared loaders, selects, navigation controls, dashboard setup prompts and Google-profile completion shall use the active English/Sinhala/Tamil contract, expose accessible names and avoid fabricated percentage progress or raw technical error messages.

## 4. Non-functional requirements
NFR-01 WCAG 2.2 AA target and EN/SI/TA language attributes/fonts.  
NFR-02 HTTPS, HttpOnly/Secure cookies, CSRF/CORS/CSP, rate limiting, upload magic-byte validation, backend-only secrets.  
NFR-03 MongoDB replica-set transactions in production.  
NFR-04 graceful degradation when Redis/AI/email/push is unavailable.  
NFR-05 indexed candidate retrieval and bounded queues/requests.  
NFR-06 structured logs, request IDs, audit trails and no sensitive token logging.  
NFR-07 backup/restore RPO/RTO approved and tested.  
NFR-08 clean Node 22 build, container non-root runtime and CI gates.  
NFR-09 mobile low-power/reduced-motion performance; home signature animation preserved with adaptive density/FPS, hidden-tab pause, decorative semantics and a static reduced-motion fallback; global styles remain modular and cascade-tested.
NFR-10 exact release checksum tied to tests/UAT/approval.

## 5. Constraints
Field-verified micro-location coverage, provider credentials/contracts, live delivery, production infrastructure and institutional approval are external dependencies. A visible map is not mandatory. Google/places data must follow provider caching terms.

## 6. Acceptance
Each requirement is accepted only when source, tests and user-visible behaviour agree. Production acceptance additionally requires target-environment and university sign-off against one immutable checksum.
