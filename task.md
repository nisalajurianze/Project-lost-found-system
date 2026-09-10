# Goal: Full lost-and-found release readiness

## 2026-09-06 guided report conversation and voice item recognition

- [x] Recognize `microphone`/`mic` voice input as `Microphone` in `Electronics`
- [x] Prevent stale item drafts from being overwritten by unrelated missing fields
- [x] Keep public matching paused while a guided report collects details
- [x] Ask whether a report is lost or found before starting a report flow
- [x] Map backend canonical categories to their correct frontend emojis
- [x] Run focused tests, lint, full backend tests, and frontend production build

## 2026-09-06 broken report detail links

- [x] Confirm the production list API returns BSON byte objects instead of string report IDs
- [x] Preserve MongoDB IDs in item/claim serialization and guard card links
- [x] Verify real ObjectId regressions (153 backend tests passed, one integration skip; frontend focused tests/lint/build passed)
- [x] Publish and check live lost list-to-detail requests (string ID, detail HTTP 200, same report); found list is empty
- [x] Cover the same BSON cloning defect in match cards with a focused regression

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
- [x] Merge, deploy, and repeat the live chatbot/log verification

Result: deployment `a38560bf-cbaf-402c-a54a-5fa7a2ab75fc` succeeded. A live Singlish lost-bag request used the OpenRouter key without an AI fallback error, preserved Singlish, retained Bag/Blue/Canteen draft slots, and added the bag emoji.

## 2026-09-04 DeepSeek primary with NVIDIA fallback

- [x] Preserve OpenCode DeepSeek as the primary chat provider
- [x] Add a provider-specific OpenRouter/NVIDIA fallback route
- [x] Keep provider URLs, keys, chat models, and vision models isolated
- [x] Add a primary-to-OpenRouter failover regression test
- [x] Run syntax, lint, and the complete backend test suite
- [x] Configure both Railway routes, merge, deploy, and run a stateful live conversation test

Result: deployment `91d0c21f-adba-4ca8-aaab-0e1d74e76ebf` succeeded. The stateful test preserved the Bag/Canteen draft, added the date on the next turn, and changed only Blue to Black after an explicit correction. It also exposed a style-persistence gap on non-generic romanized follow-ups.

## 2026-09-04 Conversation style persistence repair

- [x] Reproduce the Singlish-to-English switch in a real three-turn conversation
- [x] Preserve the established non-English/Singlish style until an explicit language switch
- [x] Add regression cases for date/time follow-ups, corrections, and explicit English switching
- [x] Run focused language tests, lint, syntax validation, and the complete backend suite
- [x] Merge, deploy, and repeat the three-turn production conversation

Result: deployment `f5f1f18f-1ab6-4afc-b23a-ec0bf6af96d8` preserved Singlish across all three turns while retaining Bag/Canteen/date state, correcting Blue to Black only, and keeping the bag emoji. One provider response failed strict JSON validation, but the safe deterministic response remained correct.

## 2026-09-04 Stateful report-chat latency

- [x] Identify redundant LLM calls while a validated session question already owns the response
- [x] Skip those calls without changing general chat or search AI routing
- [x] Run regression checks, merge, deploy, and verify production response latency

Result: deployment `da367a38-6351-40f6-8cb3-4f2f782a663c` returned the three stateful turns in 1.48-2.51 seconds each with Singlish quick replies and no redundant provider calls.

## 2026-09-04 AI reply quality hardening

- [x] Synchronize the tested OpenCode key to Railway without exposing it
- [x] Confirm the current DeepSeek free endpoint reports `Model is unavailable`
- [x] Keep DeepSeek primary while retaining NVIDIA/OpenRouter automatic fallback
- [x] Normalize optional model quick replies instead of rejecting an otherwise valid reply
- [x] Add positive localized help responses and regression coverage
- [x] Run focused tests, lint, syntax validation, full regression, merge, deploy, and smoke test

## 2026-09-05 OpenCode vision and OpenRouter chat routing

- [x] Verify current free model capabilities with live image requests
- [x] Route Muse Spark vision models through the OpenCode Responses API
- [x] Keep category name and emoji generation on text/chat models
- [x] Run regression tests, commit, and push the provider routing update

## 2026-09-05 AI photo category auto-creation

- [x] Trace photo suggestion, category resolution, permissions, and report submission fallback
- [x] Auto-create a validated new category with an AI-selected emoji and add it to the active web category list
- [x] Keep report submission available when category AI validation/provider calls fail by using a safe existing fallback
- [x] Add backend/frontend regression coverage and verify tests, lint, syntax validation, full regression, merge, deploy, and smoke test

## 2026-09-05 Manual category fallback

- [x] Preserve the user's category name when AI or category validation is unavailable
- [x] Create or reuse the category during final lost/found report submission without AI
- [x] Run backend/frontend regression checks, publish, deploy, and verify production health

## 2026-09-05 Production photo AI failure

- [x] Inspect live request/runtime evidence for `POST /api/ai/suggest-details`
- [x] Reproduce the configured vision provider call and identify the failing contract
- [x] Route chat around exhausted models and vision through a separate multimodal provider
- [x] Add regression coverage for explicit OpenRouter vision routing
- [x] Synchronize expired-session UI with failed refresh and preserve same-origin API cookies on Vercel
- [x] End image preparation state before awaiting the separate AI review
- [x] Verify browser upload refresh/retry and expired-session redirect behavior (6 desktop/mobile checks; 138 frontend tests)
- [x] Publish frontend cookie/session repair and verify the live API origin (`da66a35`; deployed API proxy and logout listener confirmed)
- [ ] Run an authenticated production photo-analysis smoke and confirm OpenRouter success (connected browser requires sign-in)

## 2026-09-05 Strict image safety gate

- [x] Require explicit physical-item, non-spam, allow, and fair/good-quality moderation fields from the vision provider
- [x] Reject explicit/adult/sexual, violent, unrelated, non-item, uncertain, or unavailable image results before public upload
- [x] Enforce the same gate on lost/found create and update APIs so browser checks cannot be bypassed
- [x] Add provider, server-gate, frontend, syntax, lint, and regression coverage (148 backend: 147 passed/1 skipped; 138 frontend passed)
- [ ] Deploy and run an authenticated production rejection/acceptance smoke with safe test images

## 2026-09-04 Singlish listen pronunciation and report approval conflicts

- [x] Inspect browser TTS locale/voice selection and report approval version conflicts
- [x] Resolve speech locale and available voice from each assistant response style
- [x] Restrict approval to the current report draft and guard duplicate submissions
- [x] Add regression coverage, run frontend checks, and publish the focused fix
## 2026-09-08 AI behavior and photo verification repair

- [x] Reproduce current conversation and vision failures; verify live provider evidence.
- [x] Fix contextual item corrections and collect-details-then-search behavior without auto-submission.
- [x] Repair vision response handling while preserving fail-closed image safety.
- [x] Run behavioral regression tests and backend syntax/lint; publish and verify deployment/runtime where accessible.
- [ ] Verify successful live LLM extraction and authenticated image acceptance/rejection after provider limits are resolved.

Evidence: production `I lost something` previously bypassed session collection. Local configured OpenCode text and vision endpoints now return `MissingSessionID: OpenCode's free tier can only be used in OpenCode`; no client-impersonation workaround added. Application restrictions now fail over to another configured provider and emit safe diagnostic codes. Negative image verdicts no longer require fabricated item/category names. Backend suite: 168 passed, 1 skipped; lint and syntax passed. Production provider success and authenticated image acceptance remain unverified.

Release evidence: `8f11bcd` deployed successfully (`cba75e0e-81bc-4600-8645-3867af4b217e`). Two four-turn production checks via the Vercel API proxy retained Microphone, Canteen, date and identifying marks correctly and searched remembered public fields before offering a reviewed draft (1.4-2.4 seconds/turn, no report submitted). Readiness confirms MongoDB transactions, Redis, Cloudinary and email. Existing Railway OpenRouter key retained; chat/vision routing changed to the verified free Gemma 4 26B A4B / 31B models. Configuration deployment `b77d9d95-d18c-4663-836f-39d4052e28c6` succeeded, but both models return HTTP 429. Thus these live chat results demonstrate the deterministic fallback, not functioning model inference. Signed-in photo test blocked: in-app browser redirects to login and Chrome is unavailable. Do not mark AI/photos fully operational until provider success and authenticated image tests pass.
## 2026-09-08 Full AI workflow follow-up

- [/] Phase 1: Trace chatbot, matching, vision moderation, category generation, knowledge answers and report submission; separate model inference from deterministic fallbacks.
- [ ] Phase 2: Fix verified backend/data-contract defects and add behavioral regressions.
- [ ] Phase 3: Reflect actual AI availability and draft completeness in the interface; verify frontend bindings.
- [ ] Phase 4: Publish verified changes and exercise live AI flows; retain provider-quota/authentication blockers explicitly.
## 2026-09-08 Owner phone on lost-item posters

- [x] Add explicit owner-only opt-in, profile phone validation and consent metadata; keep default posters private.
- [x] Add checkbox and public-sharing warning; invalidate approval whenever poster options change.
- [x] Verify backend ownership/privacy behavior, frontend option changes and build (174 backend passed/1 skipped, 144 frontend passed, 2 desktop/mobile poster interaction tests passed; frontend build and scoped lint passed).
- [x] Complete backend deployment (`53f8934`, Railway `9cb47d1e-8fee-408a-93e5-35df46fdcbc5` SUCCESS).
- [ ] Verify opted-in poster on a signed-in live account with owner-approved phone disclosure.

## 2026-09-10 Working free-provider integration

- [x] Verify candidate text/image endpoints with the local OpenRouter key and check provider data policies.
- [x] Route chat and vision through the working free router with privacy restrictions; preserve strict image validation and actual-model diagnostics.
- [x] Run regression tests and real application-contract smoke requests using non-private samples (175 passed/1 skipped; full backend lint passed; live JSON, category/emoji and non-item rejection passed).
- [x] Deploy source/configuration and verify production model inference and readiness.

## 2026-09-10 Report validation and dark calendar control

- [x] Trace the report POST contract and authentication recovery separately: auth/me 401 was followed by 200; UI still offered public contact visibility rejected by the server.
- [x] Normalize old report drafts to request_only and preserve field validation messages through Redux to the wizard.
- [x] Remove double inversion of the native dark calendar icon.
- [x] Verify lost/found report retry on desktop/mobile (4 browser cases), inspect dark/light native date controls, and pass frontend build, scoped lint and all 148 frontend tests.
- [ ] Publish the fixes and verify the production frontend deployment.

Validation evidence: the unchanged backend validator rejects a synthetic `public` contact setting for both report types and accepts `request_only`. The wizard now normalizes stale drafts and sends the accepted setting. Field-specific server errors retain their message and guide users to the relevant step without discarding their report. The exact rejected production payload was not available; the browser regression also verifies a separate date-error/retry flow. Live chatbot recheck returned in 1.5 seconds and Railway confirmed Ling model inference, independently of report validation.

Privacy evidence: ZDR-only routing worked for text but returned 404 for vision. Final policy is `data_collection: deny` plus NVIDIA trial-provider exclusion, not a blanket zero-retention guarantee. Explicit free model failover is now configured: Ling -> Nex -> Gemma for chat, and Gemma -> Nex for vision (both vision models advertise image input). With this policy the free router returned valid application JSON using Dots/Ling and correctly rejected the synthetic non-item image using Nex Mini. No raw user photos were used. Dedicated NVIDIA moderation is not installed as an item validator: a simple safe verdict cannot authorize physical-item publication.

Release evidence: source `5822df2` is deployed on Railway as `a292b641-6184-44d7-a2a8-d675b5701200` (`SUCCESS`). Production `/api/ai/chat` returned a model-generated greeting and Railway logged `inclusionai/ling-3.0-flash-fin:free` success. Local explicit vision failover passed after Gemma returned HTTP 429: Nex Mini returned a valid non-item rejection. Authenticated production photo acceptance/rejection remains pending because a signed-in account and safe test image are required.

2026-09-10 recheck: commit `8a6fa90` is on main; Vercel succeeded and live bundle `index-v_NbWmet.js` includes the phone checkbox. Railway still runs `c9a9cd7`. Service inspection reports 49 staged variable changes (including database/auth/provider secrets), whose values cannot be verified through this connector. Do not accept/deploy these unreviewed changes without owner direction. GitHub Security Analysis passed; Production Verification failed. Poster backend release remains incomplete.

Owner subsequently authorized the staged changes; accept-deploy completed and staged state is now empty. Redeploy `a239f503-9816-4d9f-8f7d-87de49d4688d` uses OLD commit `c9a9cd7`, not the poster commit. Railway Agent request for Deploy Latest Commit failed with an agent usage limit. Poster tests re-run: 5 passed. Latest-source deployment remains required; do not confuse old-source redeploy/READY health with poster availability.
