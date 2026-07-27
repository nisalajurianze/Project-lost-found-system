# Software Requirements Specification (SRS)

## 1. System

**Name:** SEUSL Smart Lost & Found Management System  
**Purpose:** AI-assisted, privacy-aware reporting, search, matching, claim verification, handover, analytics, and regional micro-location understanding for the university community.

## 2. Stakeholders

Students, staff, visitors/public search users, reporters/finders, claimants, lost-property staff, administrators, privacy/security/accessibility officers, IT operations, university management, auditors, and approved service providers.

## 3. Functional requirements

### FR-01 Identity and access

- Register/login/logout with verified local account and optional verified Google identity.
- HTTP-only sessions, rotation, reuse detection, password reset, verification, lockout, session revocation.
- User/admin roles; fail-closed protected/admin routes.

### FR-02 Lost/found reports

- Create, edit, view, search, archive/delete under state rules.
- Up to configured validated images.
- Item/category/description/date/location/storage/contact/tags/rich attributes.
- Draft, review, validation, duplicate check, report-quality feedback.

### FR-03 AI image assistance

- Recognise item/category/icon/description/tags/colour/brand/model/material/marks/privacy-safe text.
- Moderate unsafe/unrelated/sensitive content.
- Field confidence and explicit user apply/edit/reject.
- Provider failover and deterministic/manual fallback.

### FR-04 Search/chatbot

- English, Sinhala, Tamil, Singlish, Tamilish and mixed input.
- Broad candidate retrieval, weighted ranking, total count, pagination, explanations, refinement context.
- Relevant results, personal reports/claims/matches, workflow help, useful clarification only.
- Grounded answers with sources/confidence; no private leakage.

### FR-05 Matching

- Indexed bounded candidate window.
- Category/text/synonym/location/date/colour/visual/attribute scoring.
- Explainable breakdown and reasons.
- Preserve user rejection; one-time strong-match notification; durable outbox.

### FR-06 Claims and handover

- Exactly one target, optional validated match, private explanation/evidence, duplicate-active-claim prevention.
- Reporter/admin human review, contact sharing, transactional approval/rejection/competing-claim update.
- Reciprocal handover/closure and audit trail.

### FR-07 AI safety and fraud triage

- Report/image/content quality, duplicate report/evidence detection, unusual activity risk scoring.
- Human-review queue with reasons/evidence.
- No automatic enforcement/ownership/claim decision.

### FR-08 Location intelligence

- Internal verified knowledge without requiring visible map.
- Campus/building/village/road/lane/junction/shop/bus stop/landmark/local aliases.
- Community suggestion, admin verification, source/confidence, optional policy-compliant live lookup.
- Location-aware chatbot/report/matching.

### FR-09 Notifications

- In-app, Socket.IO, email, optional push.
- Correct template registry, idempotency/deduplication, retries/outbox, user routes.

### FR-10 Administration

- Operational dashboard, users, reports, claims, matches, categories, locations, feedback, AI metrics/review, settings, logs.
- Last-admin protection, audit, safe anonymisation.

### FR-11 Public/legal/accessibility

- Privacy, terms, accessibility, contact/support pages.
- English/Sinhala/Tamil interface for core flows.
- WCAG 2.2 AA target and manual alternatives.

### FR-12 Analytics

- Verified counts, recovery/match/claim trends, hotspots, delivery/AI health.
- No invented accuracy/users metrics.

## 4. Non-functional requirements

- **Security:** OWASP-aligned controls, secrets outside source, encrypted transport, least privilege, private evidence, dependency/code/container/DAST scans.
- **Privacy:** data minimisation, purpose limitation, retention/deletion, human oversight, processor register.
- **Availability:** readiness dependencies, graceful shutdown, durable jobs, backups/rollback.
- **Performance:** indexed queries, pagination, bounded AI/API calls, lazy UI, responsive images, reduced effects on low-power devices.
- **Accessibility:** WCAG 2.2 AA target, keyboard/screen reader/zoom/reduced-motion/multilingual testing.
- **Maintainability:** modular services, tests, typed validation, CI, migrations, traceability.
- **Compatibility:** modern Chrome/Edge/Firefox/Safari and representative Android/iOS devices.
- **Auditability:** critical admin/workflow/security/AI decisions traceable.

## 5. State rules

Reports use controlled states such as available/pending/matched/in_progress/claimed/resolved/archived. Only explicit workflow endpoints may change critical state. General update endpoints cannot bypass the state machine.

Claims: pending -> approved or rejected. Approved claim locks target workflow and closes competing pending claims. AI is never a state-transition authority.

## 6. Acceptance criteria

Each requirement must have automated or UAT evidence. Public release additionally requires clean production build, database migration/restore, provider tests, HTTPS staging, accessibility, security scanning, load/soak, monitoring/alerting, rollback, credentials rotation, and signed institutional approval.
