# Goal: Full lost-and-found release readiness

## Locally completed

- [x] Deep-read the frontend, backend, deployment configuration, and release artifacts
- [x] Fix the confirmed Vercel icon build failure, validation/reminder defects, unsafe internal navigation, retry duplication, and mobile touch-target issues
- [x] Trace and harden login, CSRF, cookies, CORS, redirects, and authenticated-state confirmation
- [x] Add regression coverage and pass backend tests/syntax plus frontend tests/lint/production build
- [x] Verify public desktop/mobile routes and both successful and blocked-cookie login behavior in a browser
- [x] Refresh the deep-audit report, SBOM/license inventory, release manifest, and source hashes
- [x] Reconcile the 2026-07-28 deployment audit with current 2026-07-29 source, test, CI, and provider evidence
- [x] Refresh exact clean-install audits, move upload handling to `multer@2.2.0`, and remove the desktop footer/assistant collision
- [x] Repair Vercel-to-Railway same-origin API and Socket.IO polling rewrites before the SPA fallback
- [x] Prove the Railway source is `main` and deploy exact commit `012a9edd3fe1e19b0e6232cf7dda41b9c0a8e457`
- [x] Pass live privacy, authenticated user/admin, readiness, log, Socket.IO, and temporary-data cleanup checks on that deployment
- [x] Verify a synthetic chat-provider request and an automatically deleted Cloudinary upload using production provider credentials without exposing secrets
- [x] Make forced provider `response_format` opt-in so the configured OpenCode model remains OpenAI-compatible while JSON schema validation still fails closed

## Required before production sign-off

- [x] Commit, push, merge, and pass CI for the release-hardening and same-origin deployment fixes through PRs #4-#6
- [x] Verify the live Vercel frontend serves the final SPA, Railway-backed `/api/*`, CSRF cookies, and the Socket.IO Engine.IO handshake without fallback HTML
- [x] Merge the desktop-navbar 44 px target correction through PR #7 and verify the production desktop/mobile render
- [x] Verify the live Railway backend with production MongoDB replica set, Redis, Cloudinary, email, readiness, and logs
- [x] Confirm Railway deployed the latest backend validation/auth commit rather than only the previously healthy service revision
- [ ] Enable optional AI deliberately and configure a compatible vision model after provider/privacy/cost approval
- [ ] Run real email delivery and push-subscription acceptance with institution-approved recipients/devices
- [ ] Run isolated backup/restore, rollback, load/soak, browser/mobile UAT, and accessibility acceptance against the exact release checksum
- [ ] Obtain institutional privacy, security, operational, and university submission sign-off for the exact release checksum

Current stance: the exact source revision, Railway/Vercel routing, core live auth/privacy/readiness/realtime paths, and bounded chat/storage provider probes are verified. Optional AI remains disabled, vision is not configured, and institution-controlled delivery, recovery, UAT, accessibility and approval gates remain pending; this is a hardened release candidate, not an institutionally certified production release.

## 2026-08-24 repository-wide security/performance audit (started `ecf54c1`; Phase-2 target `7499a19`)

- [x] Phase 1: Persist repository-scoped threat model
- [x] Phase 2: Finding discovery
  - [x] Freeze the latest target and checkpoint per-scan artifacts (all deltas through `7499a19` reviewed)
  - [x] Save runtime inventory
  - [x] Save exhaustive in-scope file checklist
  - [x] Save high-impact coverage ledger
  - [x] Fully read and review every checklist file (242/242; 0 missing)
- [x] Phase 3: Validate every candidate and close every ledger row
- [x] Phase 4: Attack-path and severity analysis
- [x] Phase 5: Security/performance verification and final report

Audit stance: current source is not security-certified until all phases and checklist rows are closed. Human/institutional sign-off remains a separate pending gate.

## 2026-08-25 remediation of validated findings (`5939785` baseline)

- [/] Phase 1: Reconfirm vulnerable paths and encode focused regressions
- [ ] Phase 2: Fix P1 public media/location privacy boundary
- [ ] Phase 3: Fix session/refresh/Socket.IO lifecycle
- [ ] Phase 4: Fix workflow, operations, frontend, CI and dependency findings
- [ ] Phase 5: Run targeted and full verification; update exact evidence

Remediation scope: validated P1/P2 issues plus deterministic release blockers. Production deployment, external provider mutation, and institutional sign-off are not implied by local source fixes.

## 2026-08-30 Tamil responsive navigation overflow

- [x] Reproduce the 1280 CSS-pixel Tamil desktop-header overflow from the supplied screenshot
- [x] Keep multilingual navigation compact until the 2xl breakpoint
- [x] Stack long translated Home listing actions safely on narrow mobile screens
- [x] Bound long translated Footer links on narrow mobile screens
- [x] Run focused tests, lint, production build, and desktop/mobile visual overflow checks

## 2026-09-02 found-listing deletion route

- [x] Trace the empty `DELETE /api/found-items/` request to missing frontend ID validation
- [x] Normalize `_id` and `id` record shapes before deletion
- [x] Block invalid IDs before opening confirmation or calling the API
- [x] Run focused tests, lint, and production build

## 2026-09-03 chatbot conversational fallback

- [x] Trace the screenshots to the AI-unavailable greeting fallback and draft parser
- [x] Replace the capability dump with localized conversational greetings and actions
- [x] Keep report-draft labels, missing fields, and privacy copy in the message language
- [x] Recognize the user-entered `cateen` typo as a canteen location hint
- [x] Record provider fallback metrics and validate generated chat JSON
- [x] Run focused chatbot tests and full frontend/backend verification

## 2026-09-03 profile-completion mobile layout

- [x] Trace the narrow text column to the three-item horizontal avatar row
- [x] Stack the image picker action below the avatar description on mobile
- [x] Preserve the compact horizontal layout from the `sm` breakpoint
- [x] Run focused tests, lint, build, and mobile browser verification

## 2026-09-03 AI platform roadmap (AI-01 to AI-21)

- [x] Audit current AI, matching, privacy, notification, claim, admin, and multilingual foundations
- [x] Map every requested capability to dependencies, backend, frontend, data, security, and acceptance criteria
- [x] Define phased architecture, rollout gates, evaluation metrics, cost controls, and operational ownership
- [x] Verify all 21 requirements have explicit roadmap coverage and publish the implementation plan

## 2026-09-03 AI platform implementation (run to completion)

- [x] Phase 1: Safety gateway, provider observability, and automated eval foundation (AI-07, AI-08)
- [x] Phase 2: Stateful conversation, corrections, approved report submission, and recovery guidance (AI-01, AI-02, AI-03, AI-20)
- [x] Phase 3: Hybrid semantic search, spelling, campus knowledge, and FAQ RAG (AI-04, AI-10, AI-11, AI-21)
- [x] Phase 4: Vision/OCR, image quality, sensitive-data redaction, captions, and posters (AI-05, AI-13, AI-14, AI-15, AI-19)
- [x] Phase 5: Approved-feedback calibration, duplicate/spam review, and grounded admin intelligence (AI-06, AI-16, AI-18)
- [x] Phase 6: Voice input/output, calibrated notifications, and consented human handoff (AI-09, AI-12, AI-17)
- [x] Phase 7: Full regression/eval/browser checks, safe migration path, API/docs, and release-boundary verification

Implementation stance: AI-01 to AI-21 are complete in local source. Production migration/deployment was deliberately not mutated from this local implementation run. Live model, email/push, device, backup/restore, load/accessibility and institutional acceptance remain external release gates and are not represented as locally passed.

## 2026-09-04 Railway AI activation

- [x] Inspect live Railway project, service, variables, deployment state, and startup logs
- [x] Validate OpenCode endpoint and candidate model IDs with the configured local provider key
- [x] Apply a single-provider free chat configuration and remove the invalid model route
- [x] Redeploy and verify backend startup plus Railway internal health
- [x] Change the existing Railway public-domain target port from 5000 to 8080, then run the live chatbot smoke test

Current result: `deepseek-v4-flash-free` is listed but currently unavailable at the OpenCode chat endpoint; `nemotron-3.5-lightning-free` and `mimo-v2.5-free` returned HTTP 200. Deployment `f7e13afc-7fef-407e-884e-68f65cd9c2c4` succeeded, the public domain now targets the app's 8080 listener, `/api/health` returned 200 publicly, and the live chatbot returned a Singlish response plus the expected Bag, Blue, and Canteen draft fields.

## 2026-09-04 OpenRouter production routing repair

- [x] Move chat and vision model routing to `openrouter/free` with bounded free-model fallbacks
- [x] Reproduce the production `HTTP_401` caused by sending the generic OpenCode key first
- [x] Make API-key selection provider-aware and cover the routing rule with a regression test
- [x] Run backend syntax and the complete backend test suite
- [ ] Merge, deploy, and repeat the live chatbot/log verification
