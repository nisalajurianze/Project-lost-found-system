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
