# Project Completion Matrix

| Area / original deficiency | Implemented remediation | Verification status |
|---|---|---|
| Deep chatbot search and UI | Unicode-safe multilingual expansion, weighted OR/fuzzy ranking, explainable result cards, pagination, account summaries, mobile full-screen/desktop panel and accessible focus/live-region behaviour | Focused tests, local build and public-route browser sweep pass; authenticated DB/provider journeys pending |
| Consolidated multilingual public and administrator UI | EN/SI/TA authentication, support, report management, item recovery, assistant, notification, accessibility, critical review queues, users/categories, report moderation, settings, audit evidence, aggregate analytics, feedback response controls, handover-resolution verification and shared dashboard/profile/accessibility controls | Frontend translation/static suite and AST residual-literal audit pass; browser/mobile UAT remains tracked |
| Modular design system and adaptive motion | Core Tailwind tokens/components, dashboard features, global motion/print and accessibility/low-effects rules split into ordered modules; space canvas uses adaptive particle/FPS budgets, background-tab pause and static reduced-motion rendering | Frontend tests/lint/build and public desktop/mobile sweep pass; authenticated browser performance/UAT pending |
| Guided report and claim experience | Shared four-step create/edit wizard, privacy-safe image replacement, offline draft guard, upload progress, five-step private claim flow and timelines | Frontend/static tests pass; live storage/browser/provider tests pending |
| Governed location intelligence | Canonical multilingual aliases, sensitivity, source/version metadata, community suggestion and administrator approval pipeline | Backend/frontend focused tests pass; field-data and provider verification pending |
| AI governance and operations | Provider failover, explainable scoring, bounded top-candidate dual-image comparison, report quality/duplicate advice, human-review risk flags, approved-only feedback, operational analytics and verified-outcome cohort guidance | Focused tests pass; live provider and historical field-data calibration pending |
| Public documentation pack | Policies, notices, manuals, SRS/design/UML/ER, OpenAPI, test/UAT, DPIA, DR/incident, approval checklist, SBOM/licences and updated report/PDF | Required-pack, links and schema validation pass; institutional review/sign-off pending |
| Public reporter PII exposure | Role-aware item serializers remove email, phone, student ID, connected-user metadata, internal IDs, and non-selected contact channels | Automated tests pass |
| Claim/match contact bypass | Claim serializer gates both parties by role/workflow; match API returns minimal identities only | Automated tests pass |
| JWTs in local storage | Cookie-only access/refresh sessions and frontend CSRF-aware API client | Automated tests pass |
| Plaintext single refresh token | Hashed opaque `RefreshSession` records, rotation, family revocation, expiry, device metadata, and reuse detection | Unit/static tests pass; DB concurrency test CI-required |
| Refresh reuse transaction rollback | Reuse revocation commits before authentication failure is returned | DB integration test present |
| Query-string verification/reset secrets | Hashed server records; fragment-based frontend links; request-body submission | Automated tests pass |
| Permissive CSRF/CORS | Exact origin list, double-submit CSRF, secure production-cookie checks | Static tests pass; HTTPS staging pending |
| Startup hardcoded admin promotion | Removed; explicit confirmed administrator bootstrap script | Automated test passes |
| Destructive/known-password seeds | Legacy entrypoints disabled; idempotent defaults and strong explicit admin bootstrap | Source scan passes |
| Claim `matchId` trust | Exact item pair and claimant ownership validation | Backend source check passes; DB integration pending |
| Incorrect lost-item rejection status | Typed lost/found workflow service restores model-valid states | Source tests pass |
| Non-transactional approvals | Claim, item, reciprocal report, match, competing claims, and audit updates use MongoDB transactions | Replica-set gate in startup/CI |
| Concurrent duplicate claims/approvals | Partial unique indexes and transaction conflict checks | Schema tests/source checks pass |
| Private proof images publicly delivered | Authenticated Cloudinary assets and short-lived authorized signed views | Source tests pass; live provider pending |
| Email template mismatches | Complete escaped template registry; unknown templates fail closed | Automated tests pass |
| Reset/verification secret logs | Removed; errors/logs do not print secret links or provider bodies | Source scan passes |
| Broken reminder job schema/API | Correct notification schema, typed email API, dedupe keys, and distributed lock | Source check passes; worker staging pending |
| Admin notification drop | Active admins receive persisted/in-app events rather than `userId:null` | Source check passes |
| Client-controlled report status | Status omitted from normal update contracts; workflow endpoints own transitions | Validator/static review pass |
| Category count drift and unsafe rename | Normalized unique slugs; transactional rename migration; aggregation reconciliation | Source check passes; migration dry run pending |
| Public arbitrary settings | Explicit public allowlist, typed private settings, trilingual administration, request limits aligned to server bounds, and rejected-claim threshold wired only to advisory human review | Automated frontend/policy tests pass |
| Socket trusts JWT role | Cookie authentication plus active user/database role lookup | Source check passes; live socket test pending |
| Redis blocking `KEYS` | `SCAN`/unlink-based invalidation and fail-closed production readiness | Source check passes |
| In-memory matching queue | Durable outbox worker with retry/idempotency and bounded indexed candidate window | Source check passes; load/restart test pending |
| Rejected match reappears | Matching upsert preserves user decisions and dedupes strong alerts | Source check passes |
| Fake dashboard metrics | Database-derived report, claim, match, account, and completed-recovery counters | Automated static test passes |
| Hard user deletion | Auditable anonymization, sessions/media/workflow cleanup, and last-admin guard | Source check passes; DB integration pending |
| Profile image data loss | Upload/save new media before deleting old; rollback cleanup on failure | Source check passes; live provider pending |
| Google unverified email | `email_verified` enforcement and duplicate-create/link race handling | Source check passes; live OAuth pending |
| Graceful shutdown incomplete | HTTP, Socket.IO, MongoDB, Redis, and workers close during shutdown | Source check passes; process test pending |
| Overlapping cron jobs | Database-backed distributed locks and configurable retention | Source check passes; multi-instance test pending |
| Cleanup removes DB references after media failure | Strict provider deletion; failed deletions remain retryable | Source check passes; live provider pending |
| Service worker caches API/auth | Same-origin static-only cache and safe notification navigation | Frontend tests pass |
| Weak frontend password rules | 12–128 characters with upper/lower/number/symbol, matching backend | Frontend tests pass |
| False public contact success | Signed-out feedback requires login; unconfigured contact channels show no fake institutional details | Frontend tests pass |
| Accessibility click/button issues | Native button types, keyboard handling, actual listbox options, labels, and alt text | 107-file accessibility scan passes |
| Outdated Docker runtime | Node 22 multi-stage images, unprivileged Nginx, non-root backend, read-only runtime, same-origin reverse proxy | Static tests and existing PR-head container build pass; new working-tree image execution pending |
| Insecure Compose defaults | Required random JWT/Redis secrets, Mongo replica set, authenticated Redis, internal network | Current Compose configuration parses; existing PR-head auth smoke passes; new working-tree stack smoke pending |
| Weak CI | Clean installs, syntax, tests, live audits, Linux build, DB integration, Compose auth smoke, CodeQL, gitleaks, release hygiene | Existing PR head passes all reported checks; current uncommitted fixes require a new CI run |
| Outdated docs/junk/secrets | Rewritten runbooks, non-destructive Postman collection, removed junk and populated `.env`, credential-rotation notice | Release hygiene passes |
