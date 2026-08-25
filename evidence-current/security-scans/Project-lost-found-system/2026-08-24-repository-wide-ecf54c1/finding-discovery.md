# Finding Discovery — Repository-wide ecf54c1

Status: Phase 2 complete at committed target `7499a19`. All 242 checklist files were read; candidates remain plausible until Phase-3 validation.

## Target evolution

- Discovery began at `ecf54c1`.
- Current committed source is `7499a19`; `backend/config/security.js` changed `requireRedis` production default from true to false and was re-reviewed as `CF-01` through `CF-06` config/socket evidence.
- The earlier six-file worktree delta was committed and fully re-read line-by-line: `backend/server.js`, `frontend/src/components/cards/ClaimCard.jsx`, `frontend/src/components/cards/NotificationCard.jsx`, `frontend/src/components/layout/Navbar.jsx`, `frontend/src/pages/public/FoundItemDetail.jsx`, and `frontend/src/pages/public/LostItemDetail.jsx`.
- Frontend delta disposition: no new security candidate or regression. `ClaimCard`, `NotificationCard`, and `Navbar` now normalize populated object references (`_id`/`id`) and scalar ids before constructing fixed internal lost/found routes, and suppress lost/found navigation when no id exists (`frontend/src/components/cards/ClaimCard.jsx:18-24`; `frontend/src/components/cards/NotificationCard.jsx:37-49`; `frontend/src/components/layout/Navbar.jsx:88-99`). Runtime provenance remains backend Mongo references; this fixes `[object Object]`/broken internal navigation and does not introduce an external-navigation source. Notification-supplied free-form links still pass through `toSafeInternalPath`.
- Public-detail delta disposition: both pages now require a 24-hex item id before issuing the public item fetch or authenticated claim-check request (`frontend/src/pages/public/FoundItemDetail.jsx:44-67`; `frontend/src/pages/public/LostItemDetail.jsx:39-63`). This reduces malformed-route requests/error noise and aligns with backend Mongo-id validation, but it is client hardening rather than authorization. Existing backend object/claim controls remain authoritative.
- Candidate reconciliation: the delta does not change `PC-01` pending contact sharing, claim proof visibility, `ST-01` failed-logout behavior, `EI-01` public evidence, or `LP-01`/`LP-02` raw public location/custody sinks (`frontend/src/components/cards/ClaimCard.jsx:53-115,131-168`; `frontend/src/components/layout/Navbar.jsx:74-77`; `frontend/src/pages/public/FoundItemDetail.jsx:266-318,320-406`; `frontend/src/pages/public/LostItemDetail.jsx:190-308,310-404`). Those findings retain their current dispositions and updated worktree line references.
- Later committed deltas through `7499a19` add empty-query cleanup/validator `checkFalsy` handling and admin layout/CSS refinements. The account-delete controller still independently requires a current password for local-password users, and admin-service cleanup only removes empty filters; no new candidate resulted.
- Phase-2 closure: `main == origin/main == 7499a19`, clean worktree, 242 checked rows, zero open rows, zero missing paths, and clean `git diff --check`. Evidence/checklist/task changes are audit artifacts.

## Reviewed shards

- Backend HTTP/auth frontier: `backend/server.js`, auth route/controller, auth and CSRF middleware — fully read.
- Frontend boot/routing/API frontier: `main.jsx`, `App.jsx`, `services/api.js` — fully read; no plausible high-impact candidate in these three files.
- Public/private serializer frontier: `backend/utils/serializers.js` — fully read; no standalone candidate. All runtime `claimView` callers pass `privateAssetView`; outsider proof fields are redacted, and item contact exposure is limited to owner/connected participant/admin.
- Claim router/controller frontier: fully read `claimRoutes.js` and `claimController.js`. Every claim endpoint is authenticated; per-object view, review, match binding, evidence serialization, and contact-sharing decisions have claimant/reporter/admin controls. Concurrent count-before-create spam-limit checks remain a performance/abuse closure item, not yet a promoted high-impact finding.
- Requested `frontend/src/contexts/AuthContext.jsx` and `frontend/src/utils/safeNavigation.js` do not exist at this revision and are not checklist rows.

## Candidates

### SD-01 — Registration response may serialize password hash

- Instance: `sensitive-data-response:backend/controllers/authController.js:46`
- Entrypoint/source: public registration body and created user document.
- Root control/sink: created user is returned at lines 71–87 after password persistence.
- Impact: password-hash disclosure if the model response transform does not remove the field.
- Closest control: password hashing is expected in the model, but response serialization must be validated.
- Taxonomy: CWE-200.

### SD-02 — Password login explicitly selects hidden secrets before response

- Instance: `sensitive-data-response:backend/controllers/authController.js:123`
- Entrypoint/source: valid login credentials.
- Root control/sink: `+password +loginAttempts +lockUntil` selection is returned at lines 150–151.
- Impact: password-hash and lock metadata disclosure if the model transform is incomplete.
- Closest control: possible `User` `toJSON` transform; validate exact response behavior.
- Taxonomy: CWE-200.

### SD-03 — Google login explicitly selects password before response

- Instance: `sensitive-data-response:backend/controllers/authController.js:160`
- Entrypoint/source: valid Google ID token for an existing local/both account.
- Root control/sink: `+password` selection, including duplicate-race branch, reaches response at lines 184–185.
- Impact: password-hash disclosure if model serialization does not strip it.
- Closest control: possible model transform; validate.
- Taxonomy: CWE-200.

### SR-01 — Access tokens are not visibly bound to session revocation

- Instance: `session-revocation:backend/middlewares/authMiddleware.js:14`
- Entrypoint/source: stolen access token minted before logout/password reset.
- Root control/sink: JWT algorithm/issuer verification installs `req.user` without a visible session/version/revocation lookup.
- Impact: continued access until token expiry after refresh-family revocation.
- Closest control: access TTL may bound the window; inspect token claims/TTL and session service.
- Taxonomy: CWE-613.

### RP-01 — Fixed proxy trust may weaken IP rate limits under topology mismatch

- Instance: `rate-limit-proxy-trust:backend/server.js:55`
- Entrypoint/source: forwarded client-IP headers when origin reachability or proxy hops differ from assumptions.
- Root control/sink: `app.set('trust proxy', 1)` feeds global/auth limiter `req.ip` keys.
- Impact: brute-force, lockout, and recovery abuse through IP rotation.
- Closest control: Railway/Vercel infrastructure may enforce exactly one trusted proxy and block direct origin; requires topology validation.
- Taxonomy: CWE-441, CWE-307.

## Auth/session shard follow-up

### SD-01 — Suppressed by model serializer

- Disposition: suppressed at discovery.
- Exact counterevidence: `backend/models/User.js:57-64` defines a custom `toJSON` method that converts the document and deletes `password`, `googleId`, verification/reset secrets, login state, push subscription, and `__v` before Express JSON serialization. Password is also hidden by default at line 9 and bcrypt-hashed at lines 43-51.
- Closure: the created registration document cannot serialize the password hash through the reviewed response path.

### SD-02 — Suppressed by model serializer

- Disposition: suppressed at discovery.
- Exact counterevidence: although login explicitly selects `+password`, `backend/models/User.js:57-64` removes `password`, `loginAttempts`, and `lockUntil` from the serialized document.
- Closure: no password-hash or lock-metadata disclosure remains through the reviewed login response path.

### SD-03 — Suppressed by model serializer

- Disposition: suppressed at discovery.
- Exact counterevidence: although Google login explicitly selects `+password` and `+googleId`, `backend/models/User.js:57-64` removes both fields from the serialized document.
- Closure: no password-hash or Google-identifier disclosure remains through the reviewed Google-login response path.

### SR-01 — Access-token revocation gap remains plausible

- Disposition: validation recommended.
- Additional root-control evidence: `backend/services/sessionService.js:11-15` issues an access JWT without a session id, family id, token version, or `jti`. `revokeSession` and `revokeAllUserSessions` at lines 119-126 update only refresh-session records.
- Counterevidence/constraint: `backend/config/security.js:35-36` defaults access expiry to 15 minutes and derives a cookie lifetime clamped to 1 minute-24 hours. This bounds the default window but does not revoke a stolen JWT immediately. The raw JWT expiry setting itself is not maximum-bounded by environment validation.

### RP-01 — Proxy/rate-limit trust remains plausible

- Disposition: deployment validation recommended.
- Additional root-control evidence: `backend/middlewares/rateLimitMiddleware.js:13-24` uses express-rate-limit's default IP key and in-memory store for the endpoint limiters at lines 27-65. `backend/config/security.js:50,53,68` can require Redis, but this middleware does not attach a Redis store. `backend/services/sessionService.js:17-20` also records proxy-derived `req.ip` as audit metadata.
- Counterevidence/proof gap: repository code does not prove that production has exactly one sanitizing proxy or that direct origin access is blocked. Provider topology evidence is required. Horizontally scaled instances also multiply the in-memory endpoint limits.

### RR-01 — Reuse-family revocation is rolled back with the transaction

- Instance: `refresh-reuse-rollback:backend/services/sessionService.js:55`
- Entrypoint/source: replay of a previously rotated refresh token.
- Root control/sink: reuse detection updates all unrevoked family sessions at lines 55-63 and immediately throws `ApiError` at line 64. The operation runs inside `withTransaction` at lines 99-103, and the catch rethrows `ApiError` at lines 104-106.
- Impact: the thrown error plausibly aborts the transaction and rolls back the intended family revocation, leaving a stolen successor refresh token active after reuse detection.
- Closest control: `updateMany` at lines 58-62 intends to revoke the family but is in the transaction that the error aborts.
- Validation: recommended with a Mongo replica-set integration test.
- Taxonomy: CWE-613.

### RR-02 — Nontransaction refresh rotation has a successor-revocation race

- Instance: `refresh-reuse-race:backend/services/sessionService.js:49`
- Entrypoint/source: two concurrent requests replaying the same valid refresh token while the transaction path is unavailable and fallback executes.
- Root control/sink: one request consumes the token at lines 49-53; the loser can run family `updateMany` at lines 55-63 before the winner inserts the successor at lines 77-92.
- Impact: the newly inserted successor can escape reuse-family revocation, allowing the winning holder to retain refresh access.
- Closest control: atomic consumption prevents two direct rotations, but there is no persistent family tombstone or equivalent control covering a later successor insert.
- Validation: recommended with a forced nontransaction concurrency harness.
- Taxonomy: CWE-362, CWE-613.

### RR-03 — Refresh rotation can extend configured lifetime indefinitely

- Instance: `refresh-expiry-extension:backend/services/sessionService.js:79`
- Entrypoint/source: repeated legitimate or attacker-controlled refreshes before the current token expires.
- Root control/sink: line 79 rounds remaining lifetime up to whole days, then line 90 sets successor expiry to current time plus those rounded days rather than preserving the original absolute expiry.
- Impact: frequent rotation can continually move expiry forward; a compromised refresh session can outlive the configured 1/7/30/90-day lifetime.
- Closest control: initial day clamps in `backend/config/security.js:37-39` and the unexpired-token query at `backend/services/sessionService.js:50` do not enforce an absolute family lifetime.
- Counterevidence/proof gap: sliding sessions may be intentional product policy; confirm policy and expected maximum lifetime.
- Validation: recommended with a time-controlled rotation test.
- Taxonomy: CWE-613.

## Negative controls recorded

- JWT algorithm and issuer constrained; deleted/inactive users rejected.
- Google verifier checks configured audience and verified email.
- Verification/reset tokens are random, hashed, expiring; recovery responses are generic.
- Production CSRF checks Origin and double-submit token.
- Axios client uses credentialed same-origin transport, adds CSRF headers to mutations, serializes refresh, and retries once.

## Scan installation note

The installed skills reference `C:\Users\nisal\.codex\references\scan-artifacts.md`, which is absent. Existing repository evidence conventions were used: this scan directory contains the required threat model, runtime inventory, checklist, ledger, phase reports, and final report.

## Browser, realtime, and navigation shard

The following files were fully read line-by-line: `frontend/src/hooks/useSocket.js`, `frontend/src/services/socketService.js`, `frontend/src/utils/internalNavigation.js`, `frontend/src/redux/slices/authSlice.js`, and `frontend/src/services/authService.js`.

### ST-01 — Failed logout is converted to a fulfilled local logout while the server session may remain active

- Instance: `session-termination:frontend/src/services/authService.js:45`
- Affected locations: entrypoint/wrapper `frontend/src/redux/slices/authSlice.js:18`; root control `frontend/src/services/authService.js:44-45`; state sink `frontend/src/redux/slices/authSlice.js:44`.
- Attacker-controlled source: a logout request can fail before server-side revocation or cookie clearing because of a blocked request, CSRF bootstrap failure, network failure, or API failure.
- Broken control/sink: `authService.logout` catches every rejection and resolves successfully, so `logoutUser` always reaches its fulfilled reducer and clears only the Redux user state.
- Impact: the browser can appear logged out while HttpOnly access or refresh cookies remain usable. A reload, later application visit, or another person using a shared device may restore the victim session through `/auth/me`.
- Why plausible: HttpOnly cookies cannot be cleared by frontend JavaScript, and the assigned state flow contains no compensating session verification or failure state.
- Closest apparent control/counterevidence: when the server processes logout and only the response is lost, server-side revocation may already have succeeded. That does not cover failures before processing. Search evidence shows Navbar, AdminLayout, Sidebar, and `useAuth` dispatch this thunk without a visible compensating failure path.
- Validation recommended: block `/auth/logout` before it reaches the API, click logout, reload, and test whether `/auth/me` restores the session.
- Taxonomy: CWE-613.

### OR-01 — Caller-supplied fallback may bypass the internal-navigation allowlist

- Disposition: deferred pending full caller validation.
- Instance: `open-redirect:frontend/src/utils/internalNavigation.js:27`
- Affected locations: root control `frontend/src/utils/internalNavigation.js:26-27`; search-only potential caller `frontend/src/components/common/AIChatbot.jsx:94`.
- Attacker-controlled source: a structured chatbot item may supply an invalid `item.claimUrl` together with a provider- or response-controlled `item.url`.
- Broken control/sink: `toSafeInternalPath` validates only its primary value and returns `fallback` verbatim. The observed chatbot caller passes `item.url` as that fallback, potentially feeding a React Router link destination without the helper's internal-origin check.
- Impact: if the caller data is attacker-influenced and React Router accepts the absolute destination, the assistant could present an external-navigation or phishing link. Credential or callback impact is not yet proven.
- Closest apparent control/counterevidence: other observed callers use trusted constants, an empty string, or `null` as fallback. The chatbot file was not fully read in this shard, and the backend may guarantee `item.url` is internal. These proof gaps prevent promotion.
- Validation recommended: fully review the chatbot card source and link sink, then test an invalid `claimUrl` with an external `url`. The helper should validate a non-null fallback recursively or callers should pass only trusted constants.
- Taxonomy: CWE-601.

## Additional negative controls

- `socketService` uses credentialed cookie authentication and does not send a client-selected user identifier in the Socket.IO handshake (`frontend/src/services/socketService.js:8`). Server-side handshake and room authorization remain separate review boundaries.
- Socket notification title, message, and tag values reach string-based toast and native Notification APIs, not an HTML or DOM execution sink (`frontend/src/hooks/useSocket.js:38-63`).
- Local Redux user and role state controls route visibility only; it is not evidence of server-side authorization and creates no standalone privilege boundary in the reviewed files.
- Google login, profile, reset, and registration payloads are delegated to the API without a dangerous browser sink in `frontend/src/services/authService.js`; server-side validation and authorization require their own shards.

## Deployment and CI privileged-surface pass

Fully read and reviewed line-by-line: `docker-compose.yml`, `backend/Dockerfile`, `frontend/vercel.json`, `.github/workflows/ci.yml`, and `.github/workflows/deploy.yml`. Root `Dockerfile`, `railway.json`, and `vercel.json` do not exist; the nearest deployed/configuration equivalents were reviewed. These files are privileged build/deployment surfaces and are intentionally recorded here rather than checked off in the application-code checklist.

### DEP-01 — Public frontend container bridges the edge and unauthenticated MongoDB network

- Instance: `network-segmentation:docker-compose.yml:109`
- Affected locations: entrypoint `docker-compose.yml:105-106`; root control `docker-compose.yml:109-111`; sink `docker-compose.yml:7,10`.
- Attacker-controlled source: requests reaching the host-published frontend, followed by a compromise of that internet-facing container.
- Broken control/sink: the frontend joins both `edge` and the same `internal` network as MongoDB; MongoDB binds all container interfaces without an authentication flag.
- Impact: a frontend-container compromise could become direct MongoDB read/write access rather than remaining isolated to the presentation tier.
- Closest control/counterevidence: MongoDB has no host-published port; the frontend is read-only and has `no-new-privileges` at `docker-compose.yml:100,118`; no frontend-container RCE has been established. Redis is separately password-protected. This is a chained/post-compromise candidate, not a standalone remote exploit.
- Validation recommended: yes; confirm the frontend can reach port 27017 and assess whether a separate application/data network split is required.
- Taxonomy: CWE-284, CWE-306.

### DEP-02 — Repository production approval does not visibly gate provider deployment

- Instance: `release-gate:.github/workflows/deploy.yml:16`
- Affected locations: root control `.github/workflows/deploy.yml:16,24,30`; provider boundary `frontend/vercel.json:17,21,25,29`.
- Attacker-controlled source: an unverified or compromised source-branch change reaching an externally connected hosting provider.
- Broken control/sink: `production-approval` protects only image builds; both image steps use `push: false`, and no repository workflow performs or authorizes the Vercel/Railway production deployment.
- Impact: provider auto-deployment could bypass the apparent GitHub production-approval and release-verification gate, releasing source that has not passed the intended human gate.
- Closest control/counterevidence: Vercel/Railway may enforce branch protection, manual promotion, or deployment approval outside the repository. Those controls are not provable from these files.
- Validation recommended: yes; verify provider source-connection, branch, approval, and deploy-hook settings.
- Taxonomy: CWE-284.

### DEP-03 — Compose profile disables secure-cookie transport

- Instance: `cookie-transport:docker-compose.yml:59`
- Affected locations: entrypoint `docker-compose.yml:105-106`; root control `docker-compose.yml:51,59`; related origin constraint `docker-compose.yml:53`.
- Attacker-controlled source: a network attacker when this host-published Compose profile is used beyond localhost or exposed over plaintext HTTP.
- Broken control/sink: the backend is forced into development mode with `COOKIE_SECURE: "false"`, affecting authentication-cookie transport.
- Impact: session-cookie disclosure or reuse if the profile is treated as a public/staging deployment profile.
- Closest control/counterevidence: `CLIENT_URLS` is localhost-only, indicating a local-development intent. Suppress if deployment documentation and runtime controls prove the profile cannot be exposed publicly.
- Validation recommended: conditional; validate only for supported non-local Compose usage.
- Taxonomy: CWE-614.

### Deployment hardening note — Mutable external execution references

- Container tag instances: `docker-compose.yml:5,26`, `backend/Dockerfile:2,8`, `.github/workflows/ci.yml:93`.
- GitHub Action tag instances: `.github/workflows/ci.yml:25,26,38,39,57,58,74,85,86,124` and `.github/workflows/deploy.yml:18,19,21,27`.
- Risk: these tags are not immutable digests/commit SHAs, so an upstream tag compromise or mutation could change code executed in builds, CI, or runtime.
- Counterevidence: workflow permissions are `contents: read`; npm installs use `--ignore-scripts`; the release workflow does not publish; the backend image runs non-root at `backend/Dockerfile:12-16`; no upstream compromise is currently evidenced.
- Disposition: hardening-only unless validation finds a compromised/mutable upstream reference or a privileged downstream artifact consumer. Prefer image digests and GitHub Action commit SHAs where release reproducibility requires immutability.
- Taxonomy: CWE-829, CWE-494.

## Deployment and CI privileged-surface pass 2

Fully read and reviewed line-by-line: `.github/workflows/security.yml`, `.dockerignore`, `frontend/Dockerfile`, `frontend/nginx.conf`, and `backend/.dockerignore`. `backend/railway.json` is absent; `backend/.dockerignore` was reviewed as the nearest existing backend build/deployment-control file. These files remain privileged-surface evidence rather than application-code checklist rows.

### DEP-04 — Secret-scan job receives a broader security-events token through a mutable third-party action

- Instance: `ci-token-privilege:.github/workflows/security.yml:33`
- Affected locations: root control `.github/workflows/security.yml:12-15`; concrete execution/sink `.github/workflows/security.yml:33-35`.
- Attacker-controlled source: a compromise or mutation of the tag-resolved `gitleaks/gitleaks-action@v2` implementation, or another supply-chain substitution affecting that action.
- Broken control/sink: workflow-level `security-events: write` applies to both jobs, and the secret-scan job explicitly passes `secrets.GITHUB_TOKEN` to the mutable third-party action even though only the CodeQL job visibly needs security-event upload permission.
- Impact: a compromised action could use the job token to fabricate, overwrite, or otherwise tamper with repository security-analysis results; it also retains repository read access.
- Closest control/counterevidence: `contents` is read-only; GitHub restricts tokens for untrusted fork pull requests; no contents-write or production secret is present. The action is a known security-scanning project, but the tag is not an immutable commit.
- Validation recommended: yes; confirm the action's minimum token need, move permissions to job scope, remove explicit token passing if unnecessary, and pin an audited commit SHA.
- Taxonomy: CWE-250, CWE-829.

### DEP-05 — Static-file regex precedes and can bypass the dotfile deny rule

- Instance: `hidden-file-serving:frontend/nginx.conf:52`
- Affected locations: entrypoint/root control `frontend/nginx.conf:52-55`; intended deny control `frontend/nginx.conf:63-65`; image content sink `frontend/Dockerfile:14`.
- Attacker-controlled source: an HTTP request for a hidden path ending in a permitted static extension, such as `/.name.js`.
- Broken control/sink: Nginx evaluates regex locations in declaration order; the static-extension regex appears before the dotfile-deny regex, so a matching hidden asset can be served by `try_files` before the later deny rule is selected.
- Impact: disclosure of a hidden JavaScript, stylesheet, image, or font file if such a file exists in the generated `dist` copied into the runtime image.
- Closest control/counterevidence: only `/app/dist` is copied into the runtime image at `frontend/Dockerfile:14`; no sensitive hidden file in that directory was established in this bounded pass. Vite normally emits non-hidden hashed assets. This candidate depends on image-content validation.
- Validation recommended: yes; inspect the built image/webroot and test hidden-extension requests. Place the dotfile deny ahead of the asset regex or use a higher-precedence rule if hidden files are impossible by policy.
- Taxonomy: CWE-200, CWE-552.

### Deployment/config negative controls and deferred checks

- `frontend/nginx.conf:8-13` sets clickjacking, MIME sniffing, referrer, permissions, opener, and CSP controls; the CSP limits scripts and frames to self/Google and objects to none. `style-src 'unsafe-inline'` is hardening debt, not a standalone exploit without an injection source.
- `frontend/Dockerfile:12-17` uses the unprivileged Nginx image, exposes only port 8080, and defines a local health check. Its mutable `node:22.14-alpine` and `nginxinc/nginx-unprivileged:1.27-alpine` tags extend the existing DEP supply-chain hardening note.
- `.github/workflows/security.yml:20,21,25,30,33` adds mutable GitHub Action tag instances. The CodeQL job legitimately needs `security-events: write`; the overbreadth is specifically the secret-scan job.
- `backend/.dockerignore:3-4` excludes `.env` and every `.env.*` variant from the backend image context. The root `.dockerignore:3-4` excludes only `.env` and `.env.local`, but no root Dockerfile exists, so no active root-image secret sink was found.
- `frontend/Dockerfile:6` copies its full frontend build context. `frontend/.dockerignore` exists but was outside this five-file batch, so frontend-context secret exclusion remains deferred rather than assumed safe or vulnerable.
- `frontend/nginx.conf:3,29,45` accepts arbitrary hostnames and forwards `$host` to the backend. Host-header poisoning remains deferred because this batch found no backend absolute-URL, reset-link, authorization, or cache sink that consumes the forwarded value; provider canonical-host enforcement may also defeat the source.

## AI chat, report wizard, upload, and evidence-display shard

The following files were fully read line-by-line: `frontend/src/components/common/AIChatbot.jsx`, `frontend/src/components/common/ReportItemWizard.jsx`, `frontend/src/components/common/ImageUpload.jsx`, `frontend/src/components/common/ItemEvidenceSummary.jsx`, and `frontend/src/components/common/MatchExplanation.jsx`.

## AI provider transport shard

`backend/services/aiProviderService.js` was fully read line-by-line. Provider requests require deliberate `AI_ENABLED`, configured keys/models, HTTPS outside local development, bounded 2–30 second timeout, bounded attempt count, circuit breaking, JSON parsing, and caller-supplied schema validation. The provider URL is operator-controlled environment configuration rather than request/admin input; no attacker-controlled SSRF path was established. Provider messages and response-size/privacy constraints remain caller-boundary checks. No standalone high-impact candidate was promoted from this file.

### CH-01 — Assistant history is persisted under one browser-wide key and restored across account boundaries

- Instance: `cross-account-browser-storage:frontend/src/components/common/AIChatbot.jsx:194`
- Affected locations: source `frontend/src/components/common/AIChatbot.jsx:337-365`; storage wrapper `frontend/src/components/common/AIChatbot.jsx:206-221`; restore/display entrypoints `frontend/src/components/common/AIChatbot.jsx:193-204,545-560,565-634`; shared storage root control `frontend/src/utils/assistantHistory.js:1,55-69`.
- Attacker-controlled source: users can enter lost-item descriptions, locations, dates, ownership clues, and other personal content into the assistant; AI reply text is also stored.
- Broken control/sink: conversations are saved to the single key `lf-assistant-conversations-v1` without a user, guest-session, or account namespace. `AIChatbot` reloads that history globally without checking the current account.
- Impact: after logout or account switching in the same browser profile, another user or guest can see the previous user's assistant prompts and responses, exposing report activity or personal item/location details.
- Why plausible: the component passes no account identifier to load/save, and the helper's stored representation preserves user and AI message text.
- Closest apparent control/counterevidence: helper normalization limits storage to five conversations, twenty messages, 1,000 characters per message, and a seven-day TTL; it strips structured result cards and personal-summary objects; the UI offers manual deletion. These controls reduce volume and duration but do not enforce account isolation.
- Validation recommended: log in as user A, create a distinctive conversation, log out, then load the assistant as a guest or user B in the same browser profile.
- Taxonomy: CWE-359, CWE-922.

### DR-01 — Assistant report-draft handoff is not bound to the creating account or freshness window

- Instance: `cross-account-browser-storage:frontend/src/components/common/ReportItemWizard.jsx:143`
- Affected locations: source/storage `frontend/src/components/common/AIChatbot.jsx:255-263`; root control/consumer `frontend/src/components/common/ReportItemWizard.jsx:141-150`.
- Attacker-controlled source: the assistant API response can create a draft containing item name, category, colour, location, date, and related report fields derived from a user's conversation.
- Broken control/sink: the draft is stored at the fixed sessionStorage key `lf-assistant-report-draft` with only `createdAt`; the wizard checks report type and object shape but does not check account identity or age before merging fields into the next report form.
- Impact: after logout/account switching within the same tab, another authenticated user can receive the prior user's report draft, disclosing item/location details and risking accidental submission under the wrong account.
- Closest apparent control/counterevidence: sessionStorage is limited to the same tab, the value is removed after successful restoration, and images/contact details are not stored in this handoff. Those constraints narrow but do not close the shared-tab account-boundary path.
- Validation recommended: create a draft as user A, switch accounts in the same tab without opening the wizard, and open the matching create-report route as user B.
- Taxonomy: CWE-359, CWE-922.

### OR-01 caller update — Assistant result card reaches a link sink, but URL provenance remains unresolved

- Disposition: deferred pending backend URL-provenance validation.
- Instance: `open-redirect:frontend/src/utils/internalNavigation.js:27`
- Affected locations: API response source `frontend/src/components/common/AIChatbot.jsx:349-355`; link sink `frontend/src/components/common/AIChatbot.jsx:93-99`; shared root control `frontend/src/utils/internalNavigation.js:26-27`.
- Evidence update: `data.items` from `/ai/chat` is rendered directly as result cards. The claim link calls `toSafeInternalPath(item.claimUrl, item.url)`, so an invalid claim URL causes the helper to return `item.url` verbatim.
- Impact/precondition: an external URL in a provider- or attacker-influenced item could become an external navigation/phishing link. Backend construction or schema validation may constrain both values to internal routes; that exact producer must be checked before promotion. Credential or callback impact is not proven.
- Counterevidence: the primary report link uses trusted fallback `/search`; Markdown links are independently allowlisted; action links use an empty fallback.
- Taxonomy: CWE-601.

### OR-01 closure update — suppressed by exact backend URL construction

- Disposition: suppressed.
- Backend producer: `backend/controllers/aiChatController.js:56-71` constructs both `url` and `claimUrl` from fixed internal route prefixes plus Mongo document IDs; neither value comes from the provider, report fields, or request body.
- Route boundary: `backend/routes/aiRoutes.js:28` exposes chat behind a 20-per-five-minute limiter and optional authentication.
- Counterevidence: although `toSafeInternalPath` returns a caller-provided fallback verbatim, this independently reviewed caller's fallback is an internal path created by the API. Other reviewed callers use constants/null/empty fallbacks. No exploitable external-navigation source survives for this instance.

## AI chat backend shard

`backend/controllers/aiChatController.js` and `backend/routes/aiRoutes.js` were fully read line-by-line. Search regex values are escaped, search terms are capped, each model read is limited to 120 candidates, output cards use explicit public fields, personal counts are scoped to `req.user._id`, and AI output remains advisory with no server action/tool sink. Up to four client-supplied history entries can influence the provider prompt, but the provider cannot trigger claims, account changes, or private-object reads; no prompt-injection security finding was promoted. Per-message history schema/size hardening remains a cost/quality recommendation under the global 1 MB body cap and route limiter.

### AI-COST-01 — Expensive authenticated vision endpoint lacks a provider-cost-specific limiter

- Instance: `provider-cost-abuse:backend/routes/aiRoutes.js:23`.
- Affected locations: upload/body source `backend/controllers/aiController.js:14-20`; provider sink `backend/services/imageAnalysisService.js:132-144`; retry multiplier `backend/services/aiProviderService.js:80-105`.
- Attacker-controlled source: an authenticated user can repeatedly upload up to the middleware's 5 MB image limit and request vision suggestions.
- Broken control/sink: the route has authentication and the generic API limiter, but unlike public chat it has no endpoint-specific quota; a single request can consume multiple configured model/key attempts.
- Impact: provider charges, outbound bandwidth, base64 memory amplification, and service degradation. At current HEAD the generic 1,000-per-15-minute IP limit is high for a billed vision operation and inherits the open proxy-trust/topology question in RP-01 (`backend/server.js:81-85`).
- Closest controls/counterevidence: 5 MB upload limit, magic-byte checks, 2–30 second provider timeout, bounded attempts/circuit breaker, authentication, and global rate limiting. Provider-side quotas may further bound cost but are external and unverified.
- Validation recommended: issue a bounded authenticated burst against a mock provider and verify endpoint quota, concurrency, attempt count, and response behavior without spending live provider credits.
- Taxonomy: CWE-770, CWE-400.

## AI image/report controller shard

`backend/controllers/aiController.js` and `backend/services/imageAnalysisService.js` were fully read line-by-line. AI output is schema-checked and normalized with length/count/region bounds; prompts explicitly treat image text as untrusted, prohibit person identification and sensitive-trait inference, and return advisory fields only. Location output reduces restricted/private precision. The raw uploaded image is sent to the configured external vision provider only through an authenticated explicit endpoint; consent/UI disclosure and server-side public-image privacy enforcement remain separate open boundaries.

### EI-01 — Public evidence summary may disclose owner-supplied identifying attributes useful to fraudulent claimants

- Disposition: deferred pending product-policy and claim-proof validation.
- Instance: `ownership-evidence-disclosure:frontend/src/components/common/ItemEvidenceSummary.jsx:7`
- Affected locations: report-field source `frontend/src/components/common/ReportItemWizard.jsx:661-665`; render sink `frontend/src/components/common/ItemEvidenceSummary.jsx:7-15`; search-only public callers `frontend/src/pages/public/LostItemDetail.jsx:267` and `frontend/src/pages/public/FoundItemDetail.jsx:272`; serializer control `backend/utils/serializers.js:12-30`.
- Broken control/sink: the component labels and renders brand, model, colours, material, and `uniqueFeatures` as owner-provided evidence. `itemView` removes relationship/contact fields but does not visibly remove these attributes before public detail responses.
- Impact: if `uniqueFeatures` or similar fields are intended as ownership-verification knowledge, an unauthenticated viewer can copy them into a fraudulent claim and weaken reporter-side proof assessment.
- Closest apparent control/counterevidence: public attributes may be intentionally searchable descriptors; claim workflows require separately supplied private evidence and human reporter/admin approval. No automatic claim approval exists in these reviewed files. Validate whether these report fields are classified as public discovery metadata or private proof.
- Taxonomy: CWE-200.

## Additional negative controls from this shard

- Assistant Markdown does not enable raw HTML, and custom anchors render only paths accepted by `isSafeInternalPath` (`frontend/src/components/common/AIChatbot.jsx:582-588`). Assistant action URLs use an empty fallback and disappear when unsafe (`frontend/src/components/common/AIChatbot.jsx:613-624`).
- AI ownership/advisory disclosures are visible in the draft card, chat footer, item evidence, and match explanation (`frontend/src/components/common/AIChatbot.jsx:121,129,626-631,789-791`; `frontend/src/components/common/ItemEvidenceSummary.jsx:15`; `frontend/src/components/common/MatchExplanation.jsx:65-67`).
- The report wizard exposes explicit per-field/all-field AI suggestion controls and a human review step; reviewed code contains no automatic claim approval, account suspension, face identification, or ownership decision (`frontend/src/components/common/ReportItemWizard.jsx:223-236,640,678-717`).
- Autosaved normal report drafts are keyed by mode, operation/item, and authenticated user id (`frontend/src/components/common/ReportItemWizard.jsx:78,155-188`) and are removed after successful submission or explicit clear (`frontend/src/components/common/ReportItemWizard.jsx:417-434,483`).
- Image privacy scanning blocks step completion until every active photo has a resolved review state; unavailable scans require an explicit manual-review confirmation, and redaction creates replacement copies (`frontend/src/components/common/ReportItemWizard.jsx:238-345,365-375`). Server-side upload validation and private-original storage remain separate boundaries.
- Image preview object URLs are revoked when removed and on unmount (`frontend/src/components/common/ImageUpload.jsx:29-56`). Client MIME checks and compression are usability controls, not substitutes for server magic-byte, size, and parser validation (`frontend/src/components/common/ImageUpload.jsx:58-102`).
- Evidence and match explanation values render through React text contexts; no HTML injection sink exists in these two components. Match explanations always display an ownership warning (`frontend/src/components/common/MatchExplanation.jsx:41-67`).

## Assistant-history, public-detail, login, and navbar validation shard

The following files were fully read line-by-line: `frontend/src/utils/assistantHistory.js`, `frontend/src/pages/public/LostItemDetail.jsx`, `frontend/src/pages/public/FoundItemDetail.jsx`, `frontend/src/pages/public/Login.jsx`, and `frontend/src/components/layout/Navbar.jsx`.

### CH-01 validation update — Confirmed browser-wide storage control

- Full helper review confirms `ASSISTANT_HISTORY_KEY` is a single constant and all default load/save/remove operations use global `localStorage` without an account parameter (`frontend/src/utils/assistantHistory.js:1,55-80`).
- The helper preserves user and AI text while discarding structured card/personal-summary fields (`frontend/src/utils/assistantHistory.js:11-19,26-34`). Limits of five conversations, twenty messages, 1,000 characters, and seven days are exact volume/retention countercontrols, not account isolation (`frontend/src/utils/assistantHistory.js:2-4,37-52`).
- Discovery disposition remains reportable pending dynamic confirmation; confidence is high from the complete source chain.

### EI-01 validation update — Both anonymous detail routes render the evidence component

- Public lost-item detail renders `ItemEvidenceSummary` with the complete `currentItem` at `frontend/src/pages/public/LostItemDetail.jsx:267`.
- Public found-item detail does the same at `frontend/src/pages/public/FoundItemDetail.jsx:272`.
- The same pages expose report descriptions, locations, dates, tags, and images. This confirms public reachability; whether the identifying attributes are intended public search metadata or protected ownership knowledge remains the product-policy proof gap.

### LP-01 — Public lost-item response and page expose the reporter's raw location string despite location sensitivity metadata

- Instance: `location-precision:frontend/src/pages/public/LostItemDetail.jsx:281`
- Affected locations: source `frontend/src/components/common/ReportItemWizard.jsx:672`; API data control `backend/controllers/lostItemController.js:51-52,100-105`; serializer root control `backend/utils/serializers.js:12-30`; public sink `frontend/src/pages/public/LostItemDetail.jsx:269-284`.
- Attacker-controlled source: an unauthenticated visitor can request any active lost-item detail id; the reporter supplies free-text lost-location data.
- Broken control/sink: the controller computes `locationIntelligence`, including sensitivity-aware canonical metadata, but retains raw `lostLocation`. `itemView` returns it to outsiders, and the public page displays it verbatim rather than selecting an approximate zone for restricted/private locations.
- Impact: precise room, residence, office, or restricted-area text can reveal a reporter's recent whereabouts or sensitive campus location beyond what is required for public discovery.
- Closest apparent control/counterevidence: no coordinates are displayed and users may enter only a broad campus place. `publicLocationView` reduces canonical metadata, but it is not applied to the raw public string in this response path.
- Validation recommended: create reports using public, restricted, and private knowledge entries and compare anonymous API/page output.
- Taxonomy: CWE-359, CWE-200.

### LP-02 — Public found-item page exposes raw found and custody locations

- Instance: `location-precision:frontend/src/pages/public/FoundItemDetail.jsx:286`
- Affected locations: source `frontend/src/components/common/ReportItemWizard.jsx:672-674`; API data control `backend/controllers/foundItemController.js:51-59,101-106`; serializer root control `backend/utils/serializers.js:12-30`; public sinks `frontend/src/pages/public/FoundItemDetail.jsx:274-294`.
- Attacker-controlled source: an unauthenticated visitor can request an active found-item detail id; the finder supplies free-text found and `storedAt` locations.
- Broken control/sink: raw `foundLocation` and `storedAt` survive the public serializer and are rendered even when location intelligence has a sensitivity classification. `storedAt` has no separate public/private projection in the reviewed path.
- Impact: revealing the exact custody location of a valuable found item can enable unauthorized retrieval or theft; restricted/private place text can also disclose sensitive campus locations.
- Closest apparent control/counterevidence: item retrieval still requires human claim/handover approval, and a broad public location helps legitimate discovery. That does not prevent physical targeting when `storedAt` names an exact unattended location.
- Validation recommended: anonymously inspect reports with exact storage-room/desk text and sensitivity-tagged locations; verify intended public projection policy.
- Taxonomy: CWE-359, CWE-200.

### ST-01 validation update — Navbar navigates away without observing logout completion

- `Navbar.handleLogout` dispatches `logoutUser()` and immediately navigates to `/login` without awaiting or unwrapping the thunk (`frontend/src/components/layout/Navbar.jsx:74-77,242-249`). Combined with the service-level catch, this strengthens the false-logout/session-survival path.

## Additional negative controls from this shard

- Login redirect state is reconstructed from pathname/search/hash and passed through `toSafeInternalPath` with a constant `/dashboard` fallback before navigation (`frontend/src/pages/public/Login.jsx:31-39`).
- Navbar notification-provided links use `toSafeInternalPath` with `null` fallback; generated related-item links remain same-origin paths (`frontend/src/components/layout/Navbar.jsx:88-98,119-129`). These callers do not reproduce OR-01's unvalidated dynamic fallback.
- Public contact rendering is client-gated to admin, owner/finder, connected participant, or a contact-shared claim (`frontend/src/pages/public/LostItemDetail.jsx:101-107,306-400`; `frontend/src/pages/public/FoundItemDetail.jsx:105-111,316-402`). The previously reviewed `itemView` serializer separately omits email/phone for outsiders, so changing client state alone does not reveal absent contact fields.
- Notification titles/messages, item descriptions, tags, evidence values, and login errors render through React text contexts; no DOM/HTML execution sink appears in these files.
- Remembered login email is stored only after the user selects the remember-me control (`frontend/src/pages/public/Login.jsx:26-28,54-58,132-144`); no password or token is persisted by this page.

## Public search, directories, cards, and filter shard

The following files were fully read line-by-line: `frontend/src/components/cards/ItemCard.jsx`, `frontend/src/pages/public/SearchItems.jsx`, `frontend/src/pages/public/LostItems.jsx`, `frontend/src/pages/public/FoundItems.jsx`, and `frontend/src/components/common/SearchFilter.jsx`.

### LP-01/LP-02 validation update — Raw locations are exposed in bulk search cards

- `ItemCard` selects raw `lostLocation` or `foundLocation` and renders it on every public result card (`frontend/src/components/cards/ItemCard.jsx:13-17,27-35`).
- `SearchItems` requests both public collections in parallel when type is `both`, combines them, and renders each through `ItemCard` (`frontend/src/pages/public/SearchItems.jsx:138-159,484-506`). Each page can therefore expose up to twelve lost and twelve found raw location strings, and “Load more” supports enumeration of the full result set (`frontend/src/pages/public/SearchItems.jsx:92,194,515-520`).
- This broadens LP-01/LP-02 from one-id detail disclosure to efficient anonymous collection-scale discovery. The found-item card does not show `storedAt`; that higher-risk custody-location field remains confined to the public detail sink already recorded.

### SS-01 — Saved searches use one browser-wide key and may disclose prior users' search activity

- Disposition: deferred pending full helper review and product sensitivity classification.
- Instance: `cross-account-browser-storage:frontend/src/pages/public/SearchItems.jsx:120`
- Affected locations: query/filter source `frontend/src/pages/public/SearchItems.jsx:97-121,161-179`; save/load wrappers `frontend/src/pages/public/SearchItems.jsx:181-193`; display sink `frontend/src/pages/public/SearchItems.jsx:449-481`; search-only root control `frontend/src/utils/savedSearches.js:1,51-71`.
- Attacker-controlled source: a user can save free-text lost/found-item queries, categories, dates, types, and sort filters.
- Broken control/sink: saved searches use the single localStorage key `lf-saved-searches-v1`; this page loads them without a user/account namespace and shows the saved title to any later guest or account using the same browser profile.
- Impact: a subsequent shared-browser user can learn what item descriptions, categories, or date ranges a previous user searched, revealing lost-property activity or personal interests.
- Closest apparent control/counterevidence: saving requires an explicit click; helper search evidence shows sanitization, a five-entry maximum, and a thirty-day TTL. Search filters ordinarily contain lower-sensitivity discovery metadata rather than account records.
- Validation recommended: save a distinctive query as user A, switch to guest/user B in the same browser profile, and revisit `/search`.
- Taxonomy: CWE-359, CWE-922.

## Additional negative controls from this shard

- URL-derived search filters pass through `sanitizeSearchFilters`; query/category lengths, type, dates, and sort values are constrained before API use (`frontend/src/pages/public/SearchItems.jsx:97-105`). The helper allowlists type/sort and caps query/category lengths; backend `buildSort` independently allowlists sort fields.
- Search and category values render only through React text contexts. API error messages also render as text; no raw-HTML, script, or attribute execution sink exists in these five files.
- Item detail destinations are constructed as same-origin route paths (`frontend/src/components/cards/ItemCard.jsx:13,22,35`). Image URLs reach only `<img src>` after the image optimization helper; no script/navigation sink is present here.
- Client search page size is fixed at twelve; legacy directories request nine. Backend pagination caps direct API limits at fifty. The combined `both` view issues two bounded requests per page; no client-controlled unbounded page size or automatic infinite pagination is present.
- Search request cleanup prevents superseded responses from updating current state (`frontend/src/pages/public/SearchItems.jsx:138-159`), limiting stale-query data mixing.
- `LostItems` and `FoundItems` use bounded pagination/filter state, but current `App.jsx` routes redirect `/lost-items` and `/found-items` to unified `/search`; these two legacy components are not direct runtime routes at this revision.

## Claim, match, notification, and workflow-card shard

The following files were fully read line-by-line: `frontend/src/components/cards/ClaimCard.jsx`, `frontend/src/components/cards/MatchCard.jsx`, `frontend/src/components/cards/NotificationCard.jsx`, `frontend/src/components/common/ClaimModal.jsx`, and `frontend/src/components/common/WorkflowTimeline.jsx`.

### PC-01 — Pending-claim contact sharing bypasses the approved-claim privacy boundary

- Instance: `preapproval-contact-disclosure:frontend/src/components/cards/ClaimCard.jsx:147`
- Affected locations: UI entrypoint `frontend/src/components/cards/ClaimCard.jsx:131-157`; route boundary `backend/routes/claimRoutes.js:42-43`; root workflow control `backend/controllers/claimController.js:269-275`; PII serializer control `backend/utils/serializers.js:42-44`; display sinks `frontend/src/components/cards/ClaimCard.jsx:58-79`.
- Attacker-controlled source: an unverified claimant submits a pending claim; the reporter or an administrator can then press “Share contact” before deciding whether the ownership claim is valid.
- Broken control/sink: the backend explicitly allows contact sharing only while the claim is pending and sets `isContactShared=true`. `claimView` treats that flag as equivalent to approved status for contact unlocking, exposing reporter email/phone to the still-unapproved claimant and claimant contact to the reporter.
- Impact: a malicious or mistaken claimant can receive reporter PII before ownership approval, enabling direct social engineering, harassment, or off-platform contact and bypassing the intended approved-workflow boundary.
- Closest apparent control/counterevidence: only the item reporter or an administrator may activate sharing; the action is explicit, persisted, notified, and auditable. This is not an unauthenticated IDOR, but it conflicts with the stated rule that contact details remain hidden until the approved workflow.
- Validation recommended: submit a claim as user B, share contact as reporter A while status remains pending, then inspect B's claim response/card and public item response.
- Taxonomy: CWE-359, CWE-284.

### RW-01 — Rejected claims do not require a durable rejection reason at the API boundary

- Disposition: secondary workflow/audit candidate.
- Instance: `rejection-reason:backend/utils/validators.js:395`
- Affected locations: UI review action `frontend/src/components/cards/ClaimCard.jsx:131-142`; timeline sink `frontend/src/components/common/WorkflowTimeline.jsx:31-47`; root validation control `backend/utils/validators.js:389-400`; persistence control `backend/controllers/claimController.js:207-210,259-263`.
- Attacker-controlled source: an authorized reporter or administrator selects rejected and can call the API directly without a remark.
- Broken control/sink: `adminRemark` is optional server-side and the controller persists an empty string. Email later substitutes “Insufficient evidence,” but that fallback is not stored as the actual reviewer reason.
- Impact: rejected workflows can lack a durable explanation, weakening claimant transparency, dispute handling, and audit evidence. This does not itself grant unauthorized access.
- Closest apparent control/counterevidence: current MyClaims UI requires a reason for rejection and the admin dialog marks its remark field required; competing/deleted/cancelled system rejections assign fixed reasons. HTML required fields are bypassable, so the API remains the authoritative gap.
- Validation recommended: directly reject a pending claim with only `{status:"rejected"}` and inspect stored/API `adminRemark` plus notifications.
- Taxonomy: CWE-778.

### RW-02 — Match rejection has no reason field in UI, validation, or status mutation

- Disposition: secondary workflow/audit candidate.
- Instance: `rejection-reason:frontend/src/components/cards/MatchCard.jsx:141`
- Affected locations: UI sink `frontend/src/components/cards/MatchCard.jsx:135-157`; validator root control `backend/utils/validators.js:404-410`; mutation control `backend/controllers/matchController.js:68-70`.
- Attacker-controlled source: a participant or administrator can reject a suggested match with one click.
- Broken control/sink: the request schema accepts only status and the reviewed UI supplies no reason. The match's existing `reason` field describes similarity, not the human rejection decision.
- Impact: correction/audit evidence cannot distinguish false category, colour, location, privacy concern, or other rejection causes, reducing accountability and remediation quality. No authorization bypass is established.
- Closest apparent control/counterevidence: the separate correction UI records one of three fixed AI-feedback decisions, but a user can reject without submitting any correction; backend authorization and audit logging remain separate controls.
- Validation recommended: reject a suggested match and verify whether any immutable audit record captures a decision reason outside these paths.
- Taxonomy: CWE-778.

## Additional negative controls from this shard

- Claim submission presents a five-step review, requires a target acknowledgement, proof text, and verification answers, and explicitly states the final decision is human (`frontend/src/components/common/ClaimModal.jsx:93-144,170-258`). The client evidence score is advisory and is not sent as an approval instruction.
- Claim verification-question provider failure falls back to generic questions, but submission remains a pending claim requiring reporter/admin review; no automatic ownership approval occurs (`frontend/src/components/common/ClaimModal.jsx:58-81,132-139,244-257`).
- Claim proof statements and images render only from claim objects supplied to authorized participant/admin views. Proof-image links use `target="_blank"` with `noopener noreferrer` (`frontend/src/components/cards/ClaimCard.jsx:81-114`); the previously reviewed `claimView`/private-asset path redacts outsider evidence and issues protected asset views.
- Match confirmation and rejection require explicit human actions. A confirmed match only links the user to the claim flow; it does not mark ownership or complete handover (`frontend/src/components/cards/MatchCard.jsx:135-175`).
- AI correction decisions are fixed values and are submitted deliberately to the feedback API; this component contains no automatic model-training loop (`frontend/src/components/cards/MatchCard.jsx:23-31,125-133`).
- Claim, match, and notification text renders through React text contexts. Item/notification destinations are constructed as same-origin application paths; private proof anchors are provider URLs with opener/referrer protections. No raw-HTML/XSS sink appears in these five files.

## Claim, item, match, and media-model shard

The following files were fully read line-by-line: `backend/models/ClaimRequest.js`, `backend/models/FoundItem.js`, `backend/models/LostItem.js`, `backend/models/Match.js`, and `backend/services/cloudinaryService.js`.

### FI-01 — Found-item custody location may cross the public report boundary

- Disposition: deferred pending exact public item serializer/response validation.
- Instance: `custody-location-disclosure:backend/models/FoundItem.js:87`
- Affected locations: source/root field `backend/models/FoundItem.js:87-92`; ordinary document serialization configuration `backend/models/FoundItem.js:166-170`.
- Attacker-controlled source: a finder records the physical `storedAt` custody/storage location for the found item.
- Broken control/sink: the field is an ordinary selected schema property with no model-level privacy transform. A public item response that serializes it would disclose where the object is being held.
- Impact: an unauthenticated viewer could learn a precise custody location and attempt unauthorized retrieval or theft.
- Closest apparent control/counterevidence: the already inventoried `itemView` serializer may remove the field or public controllers may use a restricted projection; this shard does not establish that sink. Validate the public found-item list/detail responses before promotion.
- Taxonomy: CWE-200, CWE-359.

### MI-01 — Public delivery is the default for uploaded media

- Disposition: validation recommended at each upload caller.
- Instance: `public-media-default:backend/services/cloudinaryService.js:10`
- Affected locations: shared root control `backend/services/cloudinaryService.js:7-16`; public URL sink `backend/services/cloudinaryService.js:20-25`; item storage implementations `backend/models/FoundItem.js:48-60` and `backend/models/LostItem.js:48-60`.
- Attacker-controlled source: user-supplied report image buffers passed by an upload route/service.
- Broken control/sink: unless every sensitive caller explicitly sets `options.authenticated`, line 10 chooses Cloudinary `upload` delivery and line 21 returns a durable public URL. Lost/found item image schemas store only `url` and `publicId`, with no delivery classification to enforce private access later.
- Impact: an original or insufficiently redacted report image can become publicly retrievable outside application authorization, exposing faces, documents, location clues, or ownership evidence.
- Closest apparent control/counterevidence: the client privacy workflow can create redacted replacement copies, Cloudinary restricts parsing to `resource_type: 'image'`, and callers can opt into authenticated delivery. Exact server upload call sites must prove that only privacy-safe copies use the public default and that private originals never reach it.
- Taxonomy: CWE-200, CWE-359.

### MI-01 validation update — direct API uploads are public before any server-side privacy enforcement

- Disposition: validation candidate, high confidence.
- Concrete upload instances: `backend/controllers/lostItemController.js:41,123` and `backend/controllers/foundItemController.js:41,124` call `uploadMultipleImages` without `{ authenticated: true }`; the shared control therefore selects public `upload` delivery at `backend/services/cloudinaryService.js:10-25`.
- Public response instances: lost/found list and detail handlers return the stored image URLs through `itemView` at `backend/controllers/lostItemController.js:96-105` and `backend/controllers/foundItemController.js:97-106`.
- Broken privacy control: `backend/services/imagePrivacyService.js` only masks extracted text/normalizes regions; it does not transform uploaded pixels. `backend/services/itemProcessingService.js:12-14` analyzes the already-stored public URL asynchronously after creation and never replaces the image with a redacted server-generated copy.
- Reachability: a direct authenticated API client can bypass the frontend privacy-review/redaction flow and upload a magic-byte-valid image containing faces, identity cards, addresses, QR codes, or serial identifiers. Cloudinary resizing/format transformation does not remove visible content.
- Impact: durable unauthenticated disclosure at a provider URL and in public lost/found API/UI responses.
- Remaining validation: use a non-sensitive synthetic marked image against a mocked/local provider path or inspect a controlled test asset; do not upload real PII to a live provider.

### MI-02 — Media deletion failures are ignored after public references are removed

- Instance: `public-media-retention:backend/services/cloudinaryService.js:38`.
- Affected instances: lost update/delete `backend/controllers/lostItemController.js:152,172`; found update/delete `backend/controllers/foundItemController.js:154,174`.
- Attacker/user boundary: an owner removes an image or deletes a report while Cloudinary deletion is unavailable or returns a failure.
- Broken control/sink: `deleteMultipleImages` defaults to `strict: false`, converts provider errors/non-`ok` results into a returned failure count, and every report caller ignores that result. Database references are already removed and no retry/outbox cleanup record is created.
- Impact: previously public images can remain accessible by their durable URL after the UI/API reports successful deletion, extending privacy exposure and defeating expected deletion/retention behavior.
- Closest controls/counterevidence: deletion requests use `invalidate: true`; success and `not found` are accepted. Cached third-party copies cannot be recalled, but provider deletion failures within application control should be retried/audited.
- Validation recommended: simulate provider deletion rejection and verify the controller response plus absence of a retry record.
- Taxonomy: CWE-459, CWE-200.

## Lost/found controller and server-side image-privacy shard

`lostItemController.js`, `foundItemController.js`, `imagePrivacyService.js`, and `itemProcessingService.js` were fully read line-by-line. Ownership checks, status-transition guards, transaction re-reads, upload rollback on database failure, bounded tag/list normalization, pagination, safe sort allowlists, and cache invalidation are present. Exact backend response paths also confirm the LP-01/LP-02 raw-location candidates: `lostLocation`, `foundLocation`, and `storedAt` are stored as ordinary public fields while reduced `locationIntelligence` is stored alongside rather than replacing them.

### LP-03 — Restricted dynamic locations return exact canonical names instead of approximate zones

- Instance: `restricted-location-disclosure:backend/services/locationIntelligenceService.js:82`.
- Affected locations: community source fields `backend/controllers/locationKnowledgeController.js:27-47`; model precision/sensitivity fields `backend/models/LocationKnowledge.js:24-40`; approved-index mapping `backend/services/locationKnowledgeBootstrapService.js:6-20`; public resolver candidates `backend/controllers/locationKnowledgeController.js:12-24`.
- Attacker/user source: an authenticated community member can propose an exact canonical location and approximate zone, and an administrator can human-approve it as `restricted` or `zone-only`.
- Broken control/sink: approved non-public records retain exact `canonicalName`; `publicLocationView` and the public `/resolve` candidate mapping return that exact name regardless of sensitivity and never substitute `approximateZone`. Coordinates are removed for non-public records, but name-level precision is not reduced.
- Impact: an unauthenticated resolver user can learn an exact restricted/private location label that policy says should be exposed only as an approximate zone.
- Closest controls/counterevidence: community records are inactive until admin approval; coordinates are indexed only for `public` records and are omitted from current public views; built-in zone-only records already use area-level names. Dynamic restricted records remain vulnerable after approval.
- Validation recommended: approve a synthetic restricted record with a distinctive exact name and approximate zone in an isolated database, call `/api/locations/resolve`, and verify only the zone is returned.
- Taxonomy: CWE-200, CWE-359.

## Location knowledge/resolution shard

Fully read: `locationIntelligenceService.js`, `locationKnowledgeBootstrapService.js`, `locationKnowledgeController.js`, `LocationKnowledge.js`, `locationKnowledgeRoutes.js`, and runtime location data `seuslLocations.js`. Alias/language normalization, bounded top-three matching, explicit confidence/clarification output, admin-only approval/listing, version history, verification dates, and exclusion of unapproved community records are present. The precision-reduction defect is isolated as LP-03; raw report fields remain LP-01/LP-02.

## Dual-image comparison transport

`backend/services/imageComparisonService.js` was fully read line-by-line. It accepts only HTTPS URLs, limits provider attempts to one, schema-validates/sanitizes the comparison, masks sensitive textual evidence, and explicitly treats results as non-ownership proof. Runtime URL provenance from the reviewed item-processing path is Cloudinary upload output, not a request-supplied URL; no server-side fetch occurs in this service. A generic HTTPS-only host test would be insufficient by itself, but no attacker-writable URL source survives in the checked runtime chain, so no SSRF candidate was promoted.

### MM-01 — Match participant ids are not model-bound to item ownership

- Disposition: deferred pending match-writer and authorization-consumer validation.
- Instance: `denormalized-auth-principal:backend/models/Match.js:39`
- Affected locations: item references `backend/models/Match.js:39-50`; independently stored participant principals `backend/models/Match.js:51-62`.
- Attacker-controlled source: attacker-influenced lost/found reports reach match generation; the match writer derives four linked identifiers.
- Broken control/sink: the schema has no validation that `lostUserId` equals the referenced lost item's owner or that `foundUserId` equals the found item's owner. If downstream authorization trusts the denormalized user ids, a mismatched stored match can grant visibility/actions to the wrong account.
- Impact: cross-user match disclosure or unauthorized confirmation/rejection against another user's item.
- Closest apparent control/counterevidence: the match creation service may always derive users from freshly loaded item documents and controllers may re-check canonical ownership. Inspect every match writer and protected action before promotion.

### MM-01 closure update — suppressed by the only runtime writer and immutable item ownership

- Disposition: suppressed.
- Writer evidence: repository search found one runtime match creator, `backend/services/aiMatchingService.js:108-121`; it loads canonical lost/found documents and assigns `lostUserId: lost.userId` and `foundUserId: found.userId` in the same construction path.
- Immutability evidence: fully reviewed lost/found create/update controllers set `userId` only from `req.user._id` at creation and expose no ownership-transfer field during updates.
- Consumer evidence: all match routes are authenticated (`backend/routes/matchRoutes.js:22-27`); match list/detail/update checks use those writer-derived participant IDs, and claim approval additionally rechecks the reciprocal report owner.
- Counterevidence conclusion: no request/admin/import writer can create a mismatched principal tuple in the deployed runtime. Database/operator corruption remains outside an attacker-controlled application path.

## Match generation and participant-authorization shard

`backend/services/aiMatchingService.js`, `backend/controllers/matchController.js`, and `backend/routes/matchRoutes.js` were fully read line-by-line. Candidate reads are category/status/date bounded and capped; visual comparisons are capped at five; all match endpoints require authentication; list/detail/update paths scope to participants/admin; a confirmation is advisory and continues through the secure claim workflow rather than approving ownership automatically. User decisions create pending AI feedback records, not automatic training actions. No separate high-impact candidate survived this shard.

`backend/services/matchScoringService.js` was also fully read. It applies bounded normalized/fuzzy comparisons across explicit evidence dimensions, caps temporal impossibilities, sanitizes/limits provider explanations upstream, reduces location intelligence for output, and always labels the score as a ranking signal rather than ownership proof. Candidate-set and visual-call bounds are enforced by its caller. No security candidate was promoted.

### HW-01 — Handover resolution/cancellation selects an arbitrary confirmed match instead of the approved claim connection

- Instance: `cross-workflow-object-binding:backend/services/itemWorkflowService.js:29`.
- Affected operations: resolve match selection `backend/services/itemWorkflowService.js:29-44`; cancel selection and mutations `backend/services/itemWorkflowService.js:62-84`; independently confirmable match writer `backend/controllers/matchController.js:68-104`.
- Attacker-controlled source: an authenticated lost/found participant can confirm more than one suggested match for the same item, while a reporter later approves one specific claim/match and establishes `connectedUserId` plus reciprocal `in_progress` state.
- Broken control/sink: resolve/cancel query only by the current item field and `status: 'confirmed'`; it does not bind the selected match to `connectedUserId`, the approved `ClaimRequest.matchId`, or the reciprocal item that was transitioned during approval. `findOne` has no deterministic sort.
- Impact: the actual reciprocal report/approved claim can remain unresolved, or an unrelated confirmed match/claim can be reverted/rejected. If the arbitrarily selected reciprocal is independently `in_progress`, another user's handover can be marked claimed or cancelled.
- Closest controls/counterevidence: callers require owner/connected participant/admin and a current `in_progress` item; reciprocal mutation additionally requires reciprocal `in_progress`. These guards limit reachability but do not prove the selected match is the active handover tuple.
- Validation recommended: construct two confirmed matches for one item, approve a claim tied to one match, then resolve/cancel repeatedly under a transaction-capable Mongo test database and verify which match/reciprocal/claim changes.
- Taxonomy: CWE-639, CWE-841.
- Taxonomy: CWE-639, CWE-863.

## Negative controls from claim/item/media-model shard

- Claim proof media defaults to authenticated delivery and stores no public URL by default (`backend/models/ClaimRequest.js:40-54`). Proof images are limited to three; verification answers are limited to five (`backend/models/ClaimRequest.js:49-66`). Existing claim serializer/controller evidence records outsider proof redaction and participant/admin authorization.
- Claim creation enforces exactly one of `foundItemId` or `lostItemId` through pre-validation (`backend/models/ClaimRequest.js:122-130`) and unique pending-claim indexes constrain repeated same-user claims per item (`backend/models/ClaimRequest.js:133-134`).
- Lost/found arrays and descriptive fields have bounded counts/lengths, date validation, enumerated workflow states, and common find/count hooks that exclude soft-deleted records (`backend/models/FoundItem.js:16-165,188-199`; `backend/models/LostItem.js:16-159,183-195`). Aggregation and bulk-update callers remain separate boundaries because these hooks do not cover them.
- Match scores, dimensions, confidence bands, and states are range/enum constrained; each lost/found pair has a unique index (`backend/models/Match.js:8-16,63-102`). These integrity controls do not substitute for participant ownership binding.
- Cloudinary uploads force `resource_type: 'image'`, constrain delivered dimensions, and clean up already-uploaded assets after a multi-upload failure (`backend/services/cloudinaryService.js:12-18,46-55`).
- Private evidence links are signed, expire after 300 seconds, and are not stored as durable URLs (`backend/services/cloudinaryService.js:58-65`). Deletion uses the persisted public id/delivery type and requests CDN invalidation (`backend/services/cloudinaryService.js:31-35`); caller authorization remains the controlling boundary.

## Background jobs, distributed locks, and outbox shard

The following files were fully read line-by-line: `backend/cron/autoCleanCron.js`, `backend/jobs/cleanupJob.js`, `backend/jobs/reminderJob.js`, `backend/services/jobLockService.js`, and `backend/services/outboxService.js`.

### BG-01 — A same-process caller can re-enter an already-held distributed job lock

- Instance: `job-lock-reentrancy:backend/services/jobLockService.js:11`
- Affected locations: root control `backend/services/jobLockService.js:10-15`; release sink `backend/services/jobLockService.js:22,24-27`; concrete jobs `backend/jobs/cleanupJob.js:37` and `backend/jobs/reminderJob.js:68`.
- Source: overlapping cron/manual/duplicate-initialization invocations of the same named job inside one process.
- Broken control/sink: the acquisition query treats `{ owner }` as an acquisition-success condition, so a second invocation from the same hostname/PID refreshes the lease and enters the critical section instead of being rejected. Either invocation can then delete the shared lock while the other is still running.
- Impact: concurrent cleanup or reminder execution, duplicate provider actions, inconsistent retention updates, and a window for a third worker to enter after the first same-owner invocation releases the lock.
- Closest control/counterevidence: different owners are excluded atomically and duplicate-key upsert races return false. Normal cron frequency makes overlap uncommon, but exported job functions and duplicate initialization keep the path plausible.
- Validation recommended: yes; invoke the same locked task concurrently in one process and observe both task bodies entering.
- Taxonomy: CWE-362.

### BG-02 — Fixed job leases can expire while work continues

- Instance: `job-lock-lease-expiry:backend/services/jobLockService.js:8`
- Affected locations: lease creation/update `backend/services/jobLockService.js:8,12`; unrenewed task execution `backend/services/jobLockService.js:24-27`; 55-minute callers `backend/jobs/cleanupJob.js:37` and `backend/jobs/reminderJob.js:68`.
- Source: a large backlog or slow Cloudinary/email/database provider call extending a task past 55 minutes.
- Broken control/sink: the lock has no heartbeat/renewal or fencing token while `task()` runs; another instance can acquire the expired row and execute concurrently.
- Impact: duplicated deletion/notification/email work and conflicting final state across application instances.
- Closest control/counterevidence: cleanup caps each model at 1,000 rows and reminder dedupe keys narrow repeated delivery. Reminder's query is unbounded, and provider latency makes the fixed lease duration non-authoritative.
- Validation recommended: yes; run a task beyond its TTL and attempt acquisition from another owner.
- Taxonomy: CWE-362.

### BG-03 — Cleanup can archive an item before deleting its analysis, permanently skipping retry

- Instance: `retention-orphan:backend/jobs/cleanupJob.js:26`
- Affected locations: selection control `backend/jobs/cleanupJob.js:11-15`; archive update `backend/jobs/cleanupJob.js:21-24`; analysis deletion sink `backend/jobs/cleanupJob.js:25-31`.
- Source: a process crash or `ImageAnalysis.deleteMany` failure after the item archive update succeeds.
- Broken control/sink: `isArchived` is set before analysis deletion, but future cleanup selection excludes archived items. The caught failure therefore has no path in this job to retry analysis deletion.
- Impact: image-analysis metadata derived from user images can remain indefinitely beyond the configured resolved-item privacy-retention period.
- Closest control/counterevidence: Cloudinary deletion occurs before archive and failures are logged; no transaction, compensating update, orphan-analysis sweep, or visible TTL is present in this file. The `ImageAnalysis` model may provide an independent TTL and must be checked before promotion.
- Validation recommended: yes; fault-inject the analysis delete after a successful archive and rerun cleanup.
- Taxonomy: CWE-459, CWE-664.

### BG-04 — Retention archival removes only images and description

- Instance: `incomplete-retention:backend/jobs/cleanupJob.js:23`
- Affected location/root control: `backend/jobs/cleanupJob.js:21-24`.
- Source: user-supplied resolved-report metadata retained in the lost/found document.
- Broken control/sink: the retention update clears only `images` and replaces `description`, then archives the document; other identifying, location, ownership, and unique-feature fields are not removed by this operation.
- Impact: archived report metadata can remain in the primary database beyond the represented privacy-retention action and remain exposed to administrative access or a later database compromise.
- Closest control/counterevidence: archived records are excluded from ordinary model reads and product policy may require minimal audit retention. Exact retained-field classification and any independent database expiry policy require validation.
- Validation recommended: yes; inspect the post-cleanup document against the approved retention schedule.
- Taxonomy: CWE-200, CWE-459.

### BG-05 — Reminder job materializes an unbounded eligible set

- Instance: `unbounded-job-query:backend/jobs/reminderJob.js:12`
- Affected locations: query/populate sink `backend/jobs/reminderJob.js:12-16`; per-item provider work `backend/jobs/reminderJob.js:19-49`; fixed lock caller `backend/jobs/reminderJob.js:68`.
- Source: growth or attacker-amplification of `in_progress` reports older than the cutoff.
- Broken control/sink: the query has no limit, cursor, or pagination and populates both participants before sequentially processing the full result set.
- Impact: worker memory/CPU/provider-call exhaustion, lease overrun, and overlapping duplicate reminder processing across instances.
- Closest control/counterevidence: report creation and state transitions may be rate-limited; notification/email calls use deterministic dedupe keys. Neither bounds the query or task duration.
- Validation recommended: yes; seed a large eligible set and measure memory/runtime relative to the 55-minute lease.
- Taxonomy: CWE-400.

### BG-06 — Outbox stale timeout can reclaim an event while its first processing attempt is active

- Instance: `outbox-lease-expiry:backend/services/outboxService.js:22`
- Affected locations: stale control `backend/services/outboxService.js:22,27`; claim update `backend/services/outboxService.js:23-35`; side-effect sink `backend/services/outboxService.js:38-43`.
- Source: `processItem` execution lasting longer than five minutes because of AI/image/database/provider work.
- Broken control/sink: the processing lease has a fixed five-minute stale cutoff with no heartbeat or fencing token; a second worker can atomically reclaim and execute the same event while the first worker remains active.
- Impact: duplicate item processing, duplicate provider spend, duplicate or conflicting matches/analysis, and race-dependent item state.
- Closest control/counterevidence: claim acquisition itself is atomic and each process has a `running` flag, but that flag is process-local. `processItem` may be idempotent; exact side effects require validation.
- Validation recommended: yes; delay `processItem` beyond five minutes and run a second worker.
- Taxonomy: CWE-362.

### BG-07 — A stale outbox worker finalizes without proving it still owns the event

- Instance: `outbox-fencing:backend/services/outboxService.js:44`
- Affected locations: final state mutation/save `backend/services/outboxService.js:44-59`; ownership written only at claim `backend/services/outboxService.js:31`.
- Source: two workers produced by the stale-reclaim path, with different completion/failure ordering.
- Broken control/sink: finalization calls `event.save()` without a compare-and-set on `status: processing`, `lockedBy: workerId`, attempt/version, or a fencing token. An earlier stale worker can overwrite a newer worker's completion with `pending`/`dead`, or mark completed after ownership moved.
- Impact: completed work can be resurrected and repeated, failures can mask success, and retry/dead-letter state becomes unreliable.
- Closest control/counterevidence: ordinary non-overlapping workers each own distinct atomically claimed events. The control fails specifically after lease expiry/reclaim.
- Validation recommended: yes; force two claim generations and complete them in reverse success/failure order.
- Taxonomy: CWE-362, CWE-667.

### BG-08 — Default random version makes enqueue dedupe unique per call

- Instance: `outbox-dedupe-default:backend/services/outboxService.js:10`
- Affected locations: root control `backend/services/outboxService.js:10-11`; create sink `backend/services/outboxService.js:12-16`.
- Source: repeated/retried callers enqueueing the same item without an explicit stable version.
- Broken control/sink: the default `randomUUID()` becomes part of `dedupeKey`, guaranteeing a new key for each call instead of deduplicating logically identical enqueue attempts.
- Impact: duplicate durable events and repeated item-processing side effects despite the apparent dedupe field.
- Closest control/counterevidence: callers can pass a stable version and the model may enforce a unique `dedupeKey`; every caller must be checked before promotion. The random default defeats that uniqueness only when the argument is omitted.
- Validation recommended: yes; enumerate callers and enqueue the same item twice without `version`.
- Taxonomy: CWE-362, CWE-664.

## Background-work negative controls

- `backend/cron/autoCleanCron.js:1-3` fails closed and prevents the legacy lock-free cron from running.
- Cleanup bounds retention days to 7-3,650 and batch size to 10-1,000 (`backend/jobs/cleanupJob.js:8,40`), compares `isArchived` during update, and preserves items for retry when Cloudinary deletion fails.
- Reminder notification/email calls carry stable per-participant dedupe/idempotency keys (`backend/jobs/reminderJob.js:25-40`) and only mark `reminderSent` after all participant operations fulfill (`backend/jobs/reminderJob.js:43-47`). Partial failure retry safety still depends on atomic enforcement inside the called services.
- Outbox batches are process-locally serialized and bounded to ten events (`backend/services/outboxService.js:63-72`); failures back off and become dead after seven attempts (`backend/services/outboxService.js:47-55`). These controls do not fence stale cross-process workers.

## Lost/found routes and validation-control shard

The following files were fully read line-by-line: `backend/routes/lostItemRoutes.js`, `backend/routes/foundItemRoutes.js`, `backend/utils/validators.js`, `backend/middlewares/validateMiddleware.js`, and `backend/middlewares/sanitizeMiddleware.js`.

### MA-LI-01 — Lost-item create body retains unvalidated privileged fields

- Disposition: deferred pending controller sink validation.
- Instance: `mass-assignment:backend/routes/lostItemRoutes.js:35`
- Affected locations: protected entrypoint `backend/routes/lostItemRoutes.js:35`; field validator `backend/utils/validators.js:178-215`; shared root control `backend/middlewares/validateMiddleware.js:17-29`.
- Attacker-controlled source: an authenticated multipart request can include arbitrary extra body properties alongside the validated report fields.
- Broken control/sink: the validator checks named public fields but does not reject unknown keys, and `validate` only reports errors—it does not replace `req.body` with `matchedData`. If `createLostItem` spreads or persists `req.body`, fields such as `userId`, `status`, `connectedUserId`, `isDeleted`, `isArchived`, `resolvedAt`, AI scores, or duplicate candidates remain attacker-controlled.
- Impact: forged ownership or workflow state, hidden reports, or unauthorized relationship/status creation.
- Closest apparent control/counterevidence: authentication runs before upload and validation; the controller may construct an explicit allowlisted object and overwrite ownership/status from trusted state. Validate the exact controller assignment before promotion.
- Taxonomy: CWE-915, CWE-639.

### MA-LI-02 — Lost-item update body retains unvalidated privileged fields

- Disposition: deferred pending controller sink validation.
- Instance: `mass-assignment:backend/routes/lostItemRoutes.js:36`
- Affected locations: protected entrypoint `backend/routes/lostItemRoutes.js:36`; update validator `backend/utils/validators.js:217-249`; shared root control `backend/middlewares/validateMiddleware.js:17-29`.
- Attacker-controlled source: an authenticated item-update multipart body containing extra properties.
- Broken control/sink: unknown keys survive validation. If the controller forwards the body to an update operation, ownership, status, connection, deletion/archive, resolution, or AI-derived fields can be modified outside dedicated workflows.
- Impact: horizontal takeover of report state or bypass of match/claim/handover controls.
- Closest apparent control/counterevidence: route authentication and id syntax validation exist; controller ownership checks and an explicit update allowlist can suppress this candidate.
- Taxonomy: CWE-915, CWE-639, CWE-863.

### MA-FI-01 — Found-item create body retains unvalidated privileged fields

- Disposition: deferred pending controller sink validation.
- Instance: `mass-assignment:backend/routes/foundItemRoutes.js:35`
- Affected locations: protected entrypoint `backend/routes/foundItemRoutes.js:35`; field validator `backend/utils/validators.js:253-295`; shared root control `backend/middlewares/validateMiddleware.js:17-29`.
- Attacker-controlled source: an authenticated multipart body with valid public fields plus arbitrary extra keys.
- Broken control/sink: the validation layer does not strip or reject unknown keys. A controller that persists the full body would expose `userId`, status/connection, deletion/archive, resolution, and derived-risk/report-quality fields to mass assignment.
- Impact: forged custody/report ownership, workflow bypass, or hidden/tampered found-item records.
- Closest apparent control/counterevidence: the controller may create a trusted allowlisted payload and assign the current user server-side; validate that implementation.
- Taxonomy: CWE-915, CWE-639.

### MA-FI-02 — Found-item update body retains unvalidated privileged fields

- Disposition: deferred pending controller sink validation.
- Instance: `mass-assignment:backend/routes/foundItemRoutes.js:36`
- Affected locations: protected entrypoint `backend/routes/foundItemRoutes.js:36`; update validator `backend/utils/validators.js:297-334`; shared root control `backend/middlewares/validateMiddleware.js:17-29`.
- Attacker-controlled source: authenticated found-item update body with extra properties.
- Broken control/sink: unknown fields survive validation and could reach a broad update sink.
- Impact: unauthorized ownership/status/connection/archive/deletion mutations, including bypass of claim and handover transitions.
- Closest apparent control/counterevidence: id validation, route authentication, controller ownership enforcement, and an explicit controller update allowlist can suppress this candidate; inspect the controller.
- Taxonomy: CWE-915, CWE-639, CWE-863.

### PS-01 — Push endpoint validation does not constrain server-side egress targets

- Disposition: deferred pending notification network-sink validation.
- Instance: `ssrf-push-endpoint:backend/utils/validators.js:559`
- Affected locations: source/root control `backend/utils/validators.js:557-573`; expected network consumer remains to be reviewed.
- Attacker-controlled source: an authenticated user-supplied push subscription endpoint.
- Broken control/sink: the endpoint validator requires syntactically valid HTTPS but does not reject loopback, link-local, private, internal DNS, redirecting, or non-approved push-service destinations.

### PS-01 sink update — authenticated arbitrary HTTPS endpoint reaches `web-push`

- Network sink: `backend/services/notificationService.js:89-105` loads the stored subscription and calls `webpush.sendNotification`; `backend/controllers/notificationController.js:103-131` repeats only HTTPS/length/key checks before persistence.
- Trigger path: an attacker can use one account as the subscription target and another account to generate workflow notifications (for example by submitting a claim against the first account's report). Delivery errors are server-logged and stale endpoints are removed only for 404/410.
- Remaining proof gap: this is blind POST-only egress with an encrypted Web Push body; no response body is exposed, common metadata/private services may reject HTTPS/TLS or the request shape, and no concrete sensitive internal target is yet proven. Keep deferred until a safe mock/private-range test establishes redirect/DNS behavior and meaningful impact.
- Recommendation if validated: resolve and block loopback/link-local/private/reserved IP ranges across redirects, or constrain subscriptions to institution-approved browser push-service origins while accounting for vendor variation.

### MA-LI-01/02 and MA-FI-01/02 closure — suppressed by explicit controller assignment

- Disposition: suppressed for all four validation seeds.
- Although the validators do not reject every unknown multipart field, fully reviewed lost/found create and update controllers never spread or pass the request body into a generic model update. Creation constructs explicit objects; updates assign an explicit field allowlist and force `contactVisibility = 'request_only'`.
- Ownership, status, connection, archive, deletion, `userId`, AI metadata, and resolution fields cannot be selected by extra request properties in these routes.

## Notification/push shard

`notificationController.js`, `notificationRoutes.js`, `notificationService.js`, and `Notification.js` were fully read line-by-line. All notification object mutations are user-scoped; push keys are hidden from normal serialization; VAPID private material remains server-side; payload navigation uses fixed internal routes; dedupe has a unique partial index. Notification storage has indexes and bounded reads but no TTL/retention policy other than account deletion, retained as a performance/operations recommendation rather than a promoted security finding.
- Impact: if the notification service passes the stored endpoint to a server-side HTTP/web-push client, a user can induce blind requests into internal or cloud network boundaries.
- Closest apparent control/counterevidence: HTTPS-only, 2,048-character limit, and authentication narrow input. The downstream library may enforce Web Push endpoint semantics or egress controls may block private networks; inspect the actual sender before promotion.
- Taxonomy: CWE-918.

## Negative controls from route/validation shard

- Public lost/found access is limited to list/detail `GET` routes using `optionalAuth`; every create, update, delete, resolve, and cancel-connection route uses `protect` (`backend/routes/lostItemRoutes.js:30-39`; `backend/routes/foundItemRoutes.js:30-39`). Object-level ownership remains a controller responsibility.
- Authentication runs before multipart parsing. `uploadMultiple` runs before field validators so multipart fields are available, while controllers run only after validation (`backend/routes/lostItemRoutes.js:35-36`; `backend/routes/foundItemRoutes.js:35-36`). File size/type/count limits remain the upload-middleware boundary.
- Contact visibility is forced to `request_only`; requests cannot select the model's legacy/public value (`backend/utils/validators.js:17-20`). This is exact counterevidence against client-selected pre-approval contact exposure in these create/update routes.
- Public item query inputs use type, enum, length, pagination, and sort-field allowlists (`backend/utils/validators.js:491-528`). Mongo ids are syntax checked and route ids use `mongoIdParam` (`backend/utils/validators.js:485-489`).
- The global sanitizer replaces keys beginning with `$` or containing `.` before routes (`backend/middlewares/sanitizeMiddleware.js:6-17`), blocking direct request-key Mongo operator injection. This does not provide a field allowlist and is not a substitute for controller-side trusted query construction.
- Validation errors return only field names and static messages, not submitted values (`backend/middlewares/validateMiddleware.js:17-27`).

## Account, profile, session, and notification-preference shard

The following files were fully read line-by-line: `backend/controllers/userController.js`, `backend/routes/userRoutes.js`, `backend/services/accountService.js`, `backend/services/notificationPreferenceService.js`, and `backend/models/RefreshSession.js`.

### AC-01 — Concurrent account deletion can pass the last-admin count in both transactions

- Instance: `last-admin-write-skew:backend/services/accountService.js:16`
- Affected locations: route entrypoint `backend/routes/userRoutes.js:24-30`; root control `backend/services/accountService.js:14-17`; transactional user deactivation `backend/services/accountService.js:20-29,119-127`.
- Attacker/user boundary: two currently active administrators concurrently invoke self-service account deletion while exactly two active administrators remain.
- Broken control/sink: each transaction counts active admins and updates a different user document. Snapshot transactions can both observe a count of two and pass the guard; because the writes target different user rows, the count predicate itself is not an atomic shared write/fence.
- Impact: both administrators can be deactivated, leaving no active administrator and locking institutional operators out of privileged recovery/approval workflows.
- Closest control/counterevidence: each individual deletion is transactional, the route requires authentication, password-backed accounts require the current password, and a single sequential deletion is blocked. These controls do not close concurrent write skew.
- Validation recommended: yes; run two deletions against a replica set with synchronized transaction timing and confirm whether one aborts through a write conflict.
- Taxonomy: CWE-367, CWE-362.

### AC-02 — Password commit precedes refresh-session revocation without atomic failure handling

- Instance: `password-session-revocation:backend/controllers/userController.js:50`
- Affected locations: password mutation `backend/controllers/userController.js:44-50`; revocation/cookie sink `backend/controllers/userController.js:51-53`.
- Attacker-controlled source: a previously stolen refresh session while the legitimate user changes the password.
- Broken control/sink: the password is committed before `revokeAllUserSessions`; a revocation failure returns an error after the credential change but leaves old refresh sessions valid and does not clear the current cookies.
- Impact: an attacker can continue refreshing access despite the legitimate user's completed password change until revocation is retried or the refresh session expires.
- Closest control/counterevidence: revocation normally runs immediately and the session model has an expiry TTL; the user can retry with the new password. Existing access-token TTL also bounds but does not revoke already minted access tokens.
- Validation recommended: yes; fault-inject the session delete/update after `user.save()` and test an old refresh token.
- Taxonomy: CWE-613, CWE-664.

### AC-03 — Cancelled claimant evidence is omitted from account-deletion database cleanup

- Instance: `account-deletion-claim-retention:backend/services/accountService.js:65`
- Affected locations: claim/media source `backend/services/accountService.js:32-41`; claim cleanup controls `backend/services/accountService.js:65-90`; post-commit media deletion `backend/services/accountService.js:145`.
- Attacker/user boundary: a deleting user has one or more terminal claimant records outside the explicitly handled `pending`, `approved`, and `rejected` statuses, including `cancelled` when permitted by the claim model.
- Broken control/sink: the first update clears evidence only for pending/approved participating claims; the second clears only rejected claims owned by the deleting claimant. Other claimant statuses retain `proofDescription`, `proofImages` references, and the claimant relationship in MongoDB even though gathered provider media is deleted afterward.
- Impact: private ownership-proof text and stale evidence references can remain linked to the pseudonymized account after the API reports personal data anonymized.
- Closest control/counterevidence: proof media for every claimant claim is collected for provider deletion; pending/approved/rejected cases are explicitly scrubbed; product or legal policy may intentionally retain some terminal records. Exact schema statuses and retention policy determine promotion.
- Validation recommended: yes; create each allowed terminal claim state, delete the claimant account, and inspect the stored document.
- Taxonomy: CWE-200, CWE-459.

### AC-04 — User-authored report metadata survives account anonymization

- Instance: `account-deletion-report-retention:backend/services/accountService.js:45`
- Affected locations: report collection `backend/services/accountService.js:32-40`; deletion updates `backend/services/accountService.js:45-54`; user anonymization `backend/services/accountService.js:109-127`.
- Attacker/user boundary: a user deletes an account containing report descriptions, locations, unique features, custody details, or other user-authored report metadata.
- Broken control/sink: owned lost/found records are archived, marked deleted, disconnected, and stripped of images, but their remaining descriptive/location/evidence fields and `userId` relationship are not scrubbed by this service.
- Impact: account-linked report content can persist indefinitely in the primary database despite the response claiming personal data anonymization, increasing exposure under administrative access or database compromise.
- Closest control/counterevidence: ordinary reads exclude deleted/archived reports, direct contact/profile fields are removed from the User, and institutional audit/claim-integrity policy may require pseudonymized report retention. Validate field classification and retention duration before promotion.
- Validation recommended: yes; compare every persisted post-deletion field with the approved erasure/pseudonymization schedule.
- Taxonomy: CWE-200, CWE-359, CWE-459.

### NP-01 — Unknown notification channels fail open

- Disposition: deferred pending caller enumeration.
- Instance: `notification-preference-fail-open:backend/services/notificationPreferenceService.js:37`
- Affected locations: normalization/root control `backend/services/notificationPreferenceService.js:15-21`; channel decision `backend/services/notificationPreferenceService.js:35-40`.
- Source: an internal caller supplies a misspelled, new, or otherwise unsupported channel name.
- Broken control/sink: any channel other than exact `email` or `push` produces `null`, and line 38 returns `true`, bypassing both channel opt-outs. Unknown category keys likewise default enabled at line 40.
- Impact: notifications may be delivered through a channel/category the user has disabled or never consented to, exposing activity metadata or causing unwanted contact.
- Closest control/counterevidence: known callers may use only fixed `email`/`push` values and `notificationCategory` maps unknown event types to `system`; caller enumeration can suppress this candidate if the function is closed over typed constants.
- Validation recommended: yes; enumerate every call and test malformed/new channel/category values.
- Taxonomy: CWE-284, CWE-693.

## Account/profile negative controls and linked findings

- Every user route is protected before the profile, password, stats, and deletion handlers (`backend/routes/userRoutes.js:24-30`). The profile controller destructures only `fullName`, `phone`, and `studentId` (`backend/controllers/userController.js:14-25`), providing a concrete self-service field allowlist rather than assigning `req.body` wholesale.
- Password change verifies the current password (`backend/controllers/userController.js:44-49`). Self-service deletion verifies the current password for password-backed accounts (`backend/controllers/userController.js:94-102`); Google-only accounts do not receive a fresh-provider reauthentication challenge, a defense-in-depth gap narrowed by authentication and global CSRF controls.
- User statistics derive report IDs from `req.user._id` and scope claimant/match counts to the authenticated principal or their items (`backend/controllers/userController.js:56-91`); no direct cross-user selector was found in this shard.
- Account anonymization uses a Mongo transaction for user state, report/claim/match transitions, notification deletion, refresh-session deletion, and feedback scrubbing (`backend/services/accountService.js:20-140`). Connected counterpart reports are reset rather than left bound to the deleted user (`backend/services/accountService.js:55-64`).
- `deleteMultipleImages(media)` remains a non-strict post-commit operation whose result is ignored (`backend/services/accountService.js:145`), reinforcing the separately recorded provider-deletion retry candidate rather than creating a duplicate finding.
- Refresh tokens are stored only as unique hashes, excluded from ordinary selection, tied to a user/family, and TTL-expired (`backend/models/RefreshSession.js:3-14`). Revoked session IP/user-agent metadata remains only until expiry unless account deletion removes it.
- Notification preferences use a fixed field/category allowlist and ignore arbitrary object keys (`backend/services/notificationPreferenceService.js:1-21`). Boolean values default enabled unless exactly false; schema/validator typing remains the boundary for malformed stored/request values.

## Email, workflow delivery, outbox model, and runtime-setting shard

The following files were fully read line-by-line: `backend/services/emailService.js`, `backend/services/workflowEmailService.js`, `backend/models/OutboxEvent.js`, `backend/models/SystemSetting.js`, and `backend/utils/security.js`. `backend/models/Notification.js` was already checked, so `SystemSetting.js` was reviewed as directed.

### ED-01 — SMTP transport does not require TLS on submission ports

- Instance: `smtp-opportunistic-tls:backend/services/emailService.js:99`
- Affected locations: configuration source `backend/services/emailService.js:94-99`; credential/message sink `backend/services/emailService.js:156`.
- Source: deployment-selected SMTP host/port and a network attacker or misconfigured SMTP endpoint on a non-465 port.
- Broken control/sink: `secure` is true only for port 465, with no visible `requireTLS`, minimum TLS version, or certificate policy for port 587/other submission ports before username/password and workflow mail are transmitted.
- Impact: under a downgraded or plaintext SMTP connection, provider credentials, recipient addresses, workflow state, and security links may be exposed or modified in transit.
- Closest control/counterevidence: port 465 uses implicit TLS; many reputable SMTP servers advertise and enforce STARTTLS, and Nodemailer may upgrade automatically. Exact provider negotiation must be validated before promotion.
- Validation recommended: yes; test the configured provider with STARTTLS unavailable/stripped and require TLS explicitly for credentialed SMTP.
- Taxonomy: CWE-319.

### ED-02 — SMTP delivery ignores the computed idempotency key

- Instance: `smtp-email-idempotency:backend/services/emailService.js:156`
- Affected locations: idempotency root control `backend/services/emailService.js:148-154`; SMTP sink `backend/services/emailService.js:155-157`; workflow wrapper `backend/services/workflowEmailService.js:4-7`.
- Source: retrying reminder/claim/match/account workflows after timeout, process crash, or uncertain SMTP delivery.
- Broken control/sink: a stable key is computed and sent only to Resend; SMTP receives no idempotency control and no application-side delivery record prevents a retry from sending the same message again.
- Impact: duplicate security/workflow emails can disclose repeated activity, confuse handover/claim actions, or amplify notification abuse and provider cost.
- Closest control/counterevidence: most links/tokens remain identical and downstream jobs may dedupe before calling; SMTP itself has no standardized idempotency header. Exact retrying callers determine frequency and severity.
- Validation recommended: yes; simulate an SMTP acceptance followed by caller-visible timeout and retry the same event key.
- Taxonomy: CWE-362, CWE-664.

### ED-03 — Missing provider is returned as an ordinary false result, indistinguishable from user suppression

- Instance: `email-failure-semantics:backend/services/emailService.js:140`
- Affected locations: fail-closed branch `backend/services/emailService.js:140-145`; wrapper passthrough `backend/services/workflowEmailService.js:4-7`.
- Source: production/staging runtime without a configured email provider, or a provider initialization regression.
- Broken control/sink: provider absence returns `false` instead of rejecting, exactly like missing-email or preference suppression in the wrapper. Await-only callers therefore fulfill successfully and can mark an event handled without delivery.
- Impact: password/security/workflow notifications can be silently and permanently skipped while business state advances; reminder processing already treats a fulfilled false return as delivered-to-all in the reviewed job shard.
- Closest control/counterevidence: initialization logs a warning and readiness configuration may require an email provider externally. A deliberate user opt-out should remain a non-error, but provider failure needs a distinct result or exception.
- Validation recommended: yes; run each critical workflow with provider `none` and verify persisted delivery/retry state.
- Taxonomy: CWE-703, CWE-755.

### ED-04 — User-influenced item names reach message subjects without local control-character rejection

- Disposition: deferred pending provider/library behavior and field-validator confirmation.
- Instance: `email-header-injection:backend/services/emailService.js:48`
- Affected locations: subject implementations `backend/services/emailService.js:47-77`; SMTP/Resend sinks `backend/services/emailService.js:118-132,153-157`.
- Attacker-controlled source: report `itemName` values used by match, claim, contact, and reminder templates.
- Broken control/sink: subjects interpolate `String(data.itemName)` directly without rejecting CR/LF or other header control characters. HTML body values are escaped, but that escape does not apply to email headers.
- Impact: if the selected provider/library does not sanitize header values, a crafted item name could inject or corrupt message headers, add recipients, or manipulate mail presentation.
- Closest control/counterevidence: Nodemailer and Resend commonly validate/encode header fields; report validators may reject control characters. Exact behavior must be demonstrated before promotion.
- Validation recommended: yes; send CR/LF subject payloads through both configured provider modes and inspect raw messages/provider rejection.
- Taxonomy: CWE-93.

### ED-05 — Dead outbox events and their error text have no retention bound

- Instance: `dead-outbox-retention:backend/models/OutboxEvent.js:20`
- Affected locations: payload/error storage `backend/models/OutboxEvent.js:3-16`; TTL control `backend/models/OutboxEvent.js:20`.
- Source: repeatedly failing item-processing events whose provider/parser/database error messages are copied into `lastError`.
- Broken control/sink: the only TTL applies to `status: completed`; `dead` events persist indefinitely with item identifiers and up to 2,000 characters of error detail.
- Impact: operational error content and account/report linkage can accumulate beyond intended retention and become exposed through administrative access, backups, or database compromise.
- Closest control/counterevidence: payload contains only item type/id, completed events expire after 30 days, and error text is length-limited. Upstream code may sanitize errors and an external cleanup job may remove dead events; neither is enforced by this model.
- Validation recommended: yes; inspect real `lastError` values and define a dead-letter retention/audit policy with a TTL or scrub step.
- Taxonomy: CWE-200, CWE-459, CWE-532.

### ED-06 — Public runtime setting can store arbitrary Mixed content without key-specific classification

- Disposition: deferred pending controller/public-reader validation.
- Instance: `public-mixed-setting:backend/models/SystemSetting.js:13`
- Affected locations: arbitrary value root control `backend/models/SystemSetting.js:13-16`; public-classification control `backend/models/SystemSetting.js:23-27`.
- Source: an administrator or migration writes an arbitrary nested value and marks the record public.
- Broken control/sink: the schema does not bind known keys to types, size limits, secret classifications, or an allowlist of keys permitted to set `isPublic: true`.
- Impact: a mistaken or compromised privileged write can expose credentials/internal configuration through a public settings reader, or store oversized/active content later consumed unsafely by frontend/config clients.
- Closest control/counterevidence: `isPublic` defaults false, keys are tightly normalized, and admin routes/controllers may enforce a fixed allowlist plus response shaping. Validate those boundaries before promotion.
- Validation recommended: yes; enumerate setting writers/readers and attempt to publish secret-like and oversized structured values.
- Taxonomy: CWE-200, CWE-915.

## Email/delivery negative controls and deferred checks

- Every HTML text interpolation uses `escapeHtml`, and action links pass through URL parsing plus HTML-attribute escaping (`backend/services/emailService.js:4-20,22-32`). Raw HTML template selection is a fixed internal map, not caller-selected source code (`backend/services/emailService.js:34-79,135-148`).
- `safeUrl` rejects non-HTTP(S) schemes, preventing `javascript:`/`data:` link injection. It still allows arbitrary external and plaintext HTTP origins (`backend/services/emailService.js:12-20`); caller URL provenance must be enumerated before treating that as a phishing or downgrade finding.
- Resend uses a fixed HTTPS endpoint, a 15-second timeout, bearer authorization, JSON encoding, and provider idempotency headers (`backend/services/emailService.js:118-132,153-154`). Error responses are copied up to 200 characters into exception text; upstream logging should be checked for recipient/message-data disclosure, though the API key is not logged here.
- Recipient validation only checks for `@` (`backend/services/emailService.js:138`), but expected recipients come from stored user accounts. Exact validators and Nodemailer/Resend address parsing remain the defense against malformed/multi-address input.
- The outbox model constrains event type, item type, status, sizes, and unique dedupe keys and expires completed events after 30 days (`backend/models/OutboxEvent.js:3-20`), confirming the random-default dedupe candidate is a caller/control issue rather than a missing unique index.
- Security helpers use CSPRNG tokens, SHA-256 token hashing, constant-time comparison for equal-length inputs, and a 12-128 character mixed-class password policy (`backend/utils/security.js:1-11`). Length short-circuiting is not material for the fixed-length hashed-token comparisons expected here.

## Admin privilege and system-setting shard

The following files were fully read line-by-line: `backend/controllers/adminController.js`, `backend/routes/adminRoutes.js`, `backend/middlewares/roleMiddleware.js`, `backend/models/AdminLog.js`, and `backend/controllers/systemSettingController.js`.

### LA-STATUS-01 — Concurrent cross-deactivation can violate the last-admin invariant

- Instance: `last-admin-write-skew:backend/controllers/adminController.js:210`
- Affected locations: admin entrypoint `backend/routes/adminRoutes.js:30`; self-target guard `backend/controllers/adminController.js:213`; root control `backend/controllers/adminController.js:219-225`; transactional audit write `backend/controllers/adminController.js:226-233`.
- Attacker/privileged boundary: when exactly two active administrators remain, administrator A deactivates B while B concurrently deactivates A.
- Broken control/sink: each transaction can run `ensureNotLastActiveAdmin` against a snapshot that still contains two active admins and then update a different user document. The transactions need not conflict on a shared invariant/fence row.
- Impact: both transactions can commit, leaving no active administrator and locking the institution out of protected operations.
- Closest control/counterevidence: self-deactivation is blocked and the helper runs inside a transaction, but neither fact visibly serializes cross-target writes. Existing AC-01 records the same root-control family for self-service deletion; this is an independently reachable admin-status action.
- Validation recommended: run two concurrent status requests against a replica set with exactly two admins.
- Taxonomy: CWE-362, CWE-667.

### LA-ROLE-01 — Concurrent cross-demotion can violate the last-admin invariant

- Instance: `last-admin-write-skew:backend/controllers/adminController.js:247`
- Affected locations: admin entrypoint `backend/routes/adminRoutes.js:31`; self-target guard `backend/controllers/adminController.js:250`; root control `backend/controllers/adminController.js:255-261`; audit write `backend/controllers/adminController.js:262-269`.
- Attacker/privileged boundary: two remaining active admins concurrently demote each other to `user`.
- Broken control/sink: both snapshot transactions can pass the last-admin count and write distinct target users without a shared serialization point.
- Impact: zero remaining admin principals despite the intended guard.
- Closest control/counterevidence: exact role allowlist, self-demotion prohibition, current-DB role checks, transactions, and session revocation all protect ordinary requests; they do not visibly prevent write skew across two targets.
- Validation recommended: concurrent replica-set integration test.
- Taxonomy: CWE-362, CWE-667.

### LA-DELETE-01 — Concurrent cross-deletion is a separate last-admin action

- Disposition: linked validation candidate for existing AC-01 root control.
- Instance: `last-admin-write-skew:backend/controllers/adminController.js:288`
- Affected locations: admin entrypoint `backend/routes/adminRoutes.js:32`; self-target guard and anonymization call `backend/controllers/adminController.js:288-295`; shared root control is `ensureNotLastActiveAdmin` inside the already reviewed account service.
- Attacker/privileged boundary: two remaining admins concurrently request deletion of each other.
- Broken control/sink: each request targets the other admin, bypassing only the self-target prohibition; if both account-service transactions observe two active admins, they update distinct user documents.
- Impact: loss of every active administrator plus simultaneous account anonymization side effects.
- Closest control/counterevidence: `anonymizeAccount` is transactional and contains the last-admin count, but the existing AC-01 analysis found no shared invariant write. Preserve this route as an independent protected action during validation.
- Taxonomy: CWE-362, CWE-667.

### AL-SETTING-01 — Security-relevant setting changes have no audit write

- Instance: `missing-audit:backend/controllers/systemSettingController.js:103`
- Affected locations: setting allowlist and sensitivity classification `backend/controllers/systemSettingController.js:53-68`; privileged mutation `backend/controllers/systemSettingController.js:103-135`; audit schema available at `backend/models/AdminLog.js:8-64`.
- Privileged source: an authenticated administrator changes registration, email-verification, maintenance, contact, or claim-spam policy settings.
- Broken control/sink: `updateSetting` validates and persists the change but does not create an `AdminLog`, record the actor, source IP, previous value, or new value.
- Impact: disabling email verification/registration controls or weakening claim-abuse thresholds lacks an application audit trail, reducing incident attribution and detection of compromised-admin actions.
- Closest control/counterevidence: supported keys and values are strictly allowlisted and bounded; route-level admin authorization is expected. These prevent arbitrary settings but do not provide accountability for valid high-impact changes.
- Validation recommended: confirm no route-level audit middleware exists and exercise a setting change followed by admin-log retrieval.
- Taxonomy: CWE-778.

## Negative controls from admin privilege shard

- Every admin route first loads the current user and enforces current `admin` role (`backend/routes/adminRoutes.js:23-25`; `backend/middlewares/roleMiddleware.js:18-31`). This includes dashboard statistics, provider health, user management, deletion, and audit logs (`backend/routes/adminRoutes.js:27-33`); provider-health data is not public through this router.
- Status and role handlers reject self-target actions, validate exact boolean/role values, mutate inside Mongo transactions, and create the matching audit log in the same transaction (`backend/controllers/adminController.js:210-275`). Deactivation checks current user state during every subsequent authenticated request, and status/role changes revoke refresh sessions.
- User search escapes regex metacharacters before constructing Mongo regexes and uses bounded validated input (`backend/controllers/adminController.js:193-207`), providing exact counterevidence against regex injection/ReDoS through this endpoint.
- User API responses pass through the User model's sensitive-field `toJSON` transform and an additional `cleanUser` scrub (`backend/controllers/adminController.js:23-28,193-207`).
- Admin logs have required actor/action/target typing and useful actor/time/target indexes (`backend/models/AdminLog.js:8-70`). No application mutation/delete endpoint for logs exists in the reviewed admin router. Database-level immutability, retention, and tamper evidence remain operational controls outside this schema.
- Public settings use a fixed public-key set and additionally require persisted `isPublic: true`; private spam settings cannot be flipped public (`backend/controllers/systemSettingController.js:53-93,103-120`). Setting keys, types, ranges, nested contact fields, text lengths, and emails are explicitly normalized/allowlisted (`backend/controllers/systemSettingController.js:9-75`).

## Provider configuration, readiness, Redis, and Socket.IO shard

The following files were fully read line-by-line at current source HEAD `e5f410d`: `backend/config/cloudinary.js`, `backend/config/db.js`, `backend/config/redis.js`, `backend/config/socket.js`, and `backend/config/security.js`. `security.js` was re-reviewed despite already being checked in the original `ecf54c1` checklist because `ecf54c1..e5f410d` changed its production Redis requirement default.

### CF-01 — Current HEAD changes production Redis readiness from required to opt-in

- Instance: `redis-readiness-regression:backend/config/security.js:50`
- Source/delta: `ecf54c1..e5f410d` changed `asBool(process.env.REQUIRE_REDIS, isProduction)` to `asBool(process.env.REQUIRE_REDIS, false)`; current root control is `backend/config/security.js:50,68`.
- Supporting runtime locations: fallback/soft failure `backend/config/redis.js:16-17,54-65`; Socket.IO adapter omission `backend/config/socket.js:14-21`.
- Broken control/sink: production no longer requires `REDIS_URL` unless an operator explicitly opts back in. A missing variable attempts plaintext localhost, catches failure, and continues with a null Redis client; Socket.IO silently starts without its cross-instance adapter.
- Impact: production readiness can report an acceptable configuration while distributed cache, multi-instance realtime delivery, and any Redis-backed shared abuse controls are absent. If rate limiting depends on Redis, an attacker can distribute requests across instances to bypass a process-local limit; that downstream dependency must be verified.
- Closest control/counterevidence: this file describes Redis as a cache and the application provides null/fallback behavior. Single-instance deployments may remain functionally safe, and Compose explicitly sets `REQUIRE_REDIS: "true"`. The current change may be an intentional hosting workaround rather than a security fix.
- Validation recommended: yes; inspect readiness and rate-limit consumers, then test a multi-instance production deployment with `REDIS_URL` omitted. Classify Redis as required or explicitly document every safe degraded mode.
- Taxonomy: CWE-693, CWE-754.

### CF-02 — Invalid security-flag strings silently disable required-provider checks

- Instance: `security-flag-fail-open:backend/config/security.js:1`
- Affected locations: root parser `backend/config/security.js:1-4`; sensitive consumers `backend/config/security.js:40,50-53`; validation gates `backend/config/security.js:68-77`.
- Source: mistyped or whitespace-padded environment values such as `REQUIRE_EMAIL_PROVIDER=tru` or `REQUIRE_MONGO_REPLICA_SET="true "`.
- Broken control/sink: every non-empty value outside the exact true-word set becomes false; invalid values are not rejected and input is not trimmed. For `requireRedis`, `requireEmail`, `requireCloudinary`, and `requireTransactions`, false suppresses the corresponding readiness/environment requirement.
- Impact: a configuration typo can silently start production without transaction guarantees or required providers, weakening atomic claim/account workflows, media privacy behavior, notifications, or shared security controls.
- Closest control/counterevidence: invalid `COOKIE_SECURE` still fails the explicit production check; standard deployment values are normally exact. The fail-open effect remains for the provider/transaction requirement flags.
- Validation recommended: yes; table-test empty, valid true/false, whitespace, and invalid strings. Security requirement flags should reject invalid non-empty values.
- Taxonomy: CWE-20, CWE-693.

### CF-03 — MongoDB production transport is not required to use TLS

- Instance: `mongodb-transport:backend/config/db.js:9`
- Affected locations: URI source/sink `backend/config/db.js:3-15`; environment control `backend/config/security.js:55-59`.
- Source: a production `MONGO_URI` using plaintext `mongodb://` to a non-local database or explicitly disabling TLS.
- Broken control/sink: validation checks only that a URI exists; `mongoose.connect` receives it without an application-level production TLS/scheme requirement.
- Impact: database credentials, report/claim evidence, sessions, and administrative data may traverse the network without encryption if the selected Mongo deployment does not independently require TLS.
- Closest control/counterevidence: `mongodb+srv` managed services normally negotiate TLS, and local Compose traffic is isolated on an internal network. Exact production URI/provider policy can suppress this candidate.
- Validation recommended: yes; inspect the redacted scheme/TLS options of the deployed URI and require TLS for non-local production targets.
- Taxonomy: CWE-319.

### CF-04 — Redis production transport and authentication are not enforced

- Instance: `redis-transport:backend/config/redis.js:17`
- Affected locations: URI root control `backend/config/redis.js:16-20`; connect sink `backend/config/redis.js:54-64`; requirement control `backend/config/security.js:50,68`.
- Source: a production `REDIS_URL` using plaintext `redis://`, omitting credentials, or pointing to an externally reachable service.
- Broken control/sink: the application supplies no production check for `rediss://`, TLS options, or authenticated URL structure, and Redis is now optional by default.
- Impact: cached user/report data and adapter traffic may be observed or modified in transit; an unauthenticated exposed Redis can enable cache poisoning, cross-instance event manipulation, or denial of service.
- Closest control/counterevidence: Compose injects a required password and keeps Redis on an internal network; managed providers may enforce TLS/auth independently. Exact production URL/provider network policy is required for closure.
- Validation recommended: yes; verify redacted scheme, auth presence, certificate validation, and network exposure.
- Taxonomy: CWE-306, CWE-319.

### CF-05 — Cookie-authenticated WebSocket transport lacks an origin allowRequest check

- Instance: `cross-site-websocket-hijacking:backend/config/socket.js:13`
- Affected locations: transport/origin root control `backend/config/socket.js:12-13`; cookie-auth sink `backend/config/socket.js:22-31`; private room joins `backend/config/socket.js:33-36`; production cookie default `backend/config/security.js:42-47`.
- Attacker-controlled source: JavaScript on a malicious origin forces Socket.IO's WebSocket transport while the victim browser sends the `accessToken` cookie, especially when the production cookie uses `SameSite=None`.
- Broken control/sink: only Socket.IO `cors.origin` is configured. Socket.IO's official 4.x documentation states CORS applies only to HTTP long-polling and WebSocket connections are not subject to CORS restrictions; it recommends `allowRequest` to restrict reachability. No equivalent origin check exists here.
- Impact: cross-site WebSocket hijacking can authenticate as the victim and subscribe to their private room; for an administrator it also joins `admins`, allowing cross-origin receipt of private realtime notifications/events emitted elsewhere.
- Closest control/counterevidence: the JWT is algorithm/issuer checked and the current user is loaded/active; SameSite Lax/Strict or provider-level origin enforcement could prevent cookie delivery; this file registers no inbound mutation events. Those controls narrow impact to realtime data unless other event handlers exist.
- Validation recommended: yes; from a disallowed origin connect with `transports: ['websocket']` while authenticated and test private/admin event receipt.
- Source reference: Socket.IO official CORS guide, https://socket.io/docs/v4/handling-cors/ (lines 70-79 in the 2026-06-18 page snapshot).
- Taxonomy: CWE-346, CWE-352, CWE-441.

### CF-06 — Socket authorization survives token expiry, logout, demotion, and account deactivation

- Instance: `socket-authz-revocation:backend/config/socket.js:29`
- Affected locations: one-time auth snapshot `backend/config/socket.js:22-31`; durable room membership `backend/config/socket.js:33-36`.
- Attacker/user boundary: a connected user/admin whose access token expires or whose account is logged out, demoted, deactivated, or deleted after the handshake.
- Broken control/sink: the token and current role/state are checked only during connection; the socket stores a role snapshot and remains in `user:*`/`admins` rooms with no expiry timer, session-version check, user-state revalidation, or revocation disconnect shown.
- Impact: a demoted administrator can continue receiving admin realtime data and an inactive/deleted user can continue receiving account notifications for the lifetime of the socket, potentially beyond the 15-minute access-token TTL.
- Closest control/counterevidence: natural disconnects/restarts eventually remove membership; HTTP actions still reauthenticate; this file exposes no inbound mutation events. Event emitters may separately disconnect/revalidate affected sockets, which requires caller validation.
- Validation recommended: yes; hold a connection open across expiry/logout/demotion/deactivation and emit user/admin events.
- Taxonomy: CWE-613, CWE-863.

## Provider/config negative controls and deferred checks

- Cloudinary initialization requires all three credentials, never logs credential values, forces secure delivery, and otherwise returns false with a clear 503-oriented warning (`backend/config/cloudinary.js:12-33`). Production validation still requires Cloudinary by default (`backend/config/security.js:52,69-71`).
- Mongo startup has bounded retries, disables command buffering, and transaction support explicitly checks for a replica set (`backend/config/db.js:3-34`). Connection errors are logged verbatim at line 21; validate driver messages do not echo credential-bearing URIs before classifying this as secret logging.
- Redis disables its offline queue, bounds retry attempts, uses SCAN/UNLINK rather than blocking KEYS, and treats cached JSON as data rather than code (`backend/config/redis.js:19-32,95-145`). Cache error logs include raw keys at lines 101/117; caller key provenance determines log-injection/privacy risk.
- Socket JWT verification constrains HS256 and issuer, loads current user state at handshake, rejects missing/inactive/deleted users, and derives rooms only from the authenticated database user (`backend/config/socket.js:22-36`). No client-supplied room join or arbitrary event handler exists in this file.
- Production environment validation enforces a 32-character access secret, secure cookies, HTTPS/non-local client origins, required transaction support, provider completeness, and a validated non-placeholder sender (`backend/config/security.js:55-78`). Exact `NODE_ENV=production` remains the prerequisite for production defaults.

## Claim risk, verification, and state-transition shard

The following files were fully read line-by-line: `backend/services/claimRiskPolicy.js`, `backend/services/claimRiskService.js`, `backend/services/claimVerificationService.js`, `backend/controllers/claimController.js`, and `backend/routes/claimRoutes.js`. The controller and router were already checked in the exhaustive list; they were re-read as producer/consumer context.

### CR-01 — Claimants can inflate evidence strength with self-authored questions and length-only answers

- Instance: `risk-triage-bypass:backend/services/claimVerificationService.js:32`
- Affected locations: generated trusted-question source `backend/services/claimVerificationService.js:8-29`; unbound answer parser `backend/services/claimVerificationService.js:32-45`; scoring root control `backend/services/claimVerificationService.js:47-72`; risk consequence `backend/services/claimRiskPolicy.js:19-22,43-50`; request path `backend/controllers/claimController.js:79-90,120-134`.
- Attacker-controlled source: an authenticated claimant supplies arbitrary `verificationAnswers[].question` and answer text, a long description, and optional proof files.
- Broken control/sink: submitted questions are not bound to the server-generated question ids or wording. Evidence scoring awards up to 35 points solely for the number of answers at least ten characters long, 35 for description length, and 25 for file count. An attacker can manufacture easy questions/answers to reach `fair` or `strong`, avoiding the 25-point weak-evidence risk signal and possibly `requiresHumanReview` triage.
- Impact: fraudulent claims can be down-ranked in the admin risk queue and displayed with overstated evidence quality, increasing human-review error risk.
- Closest apparent control/counterevidence: every claim is still forced to `pending`; the risk policy is explicitly `advisory-only`; only the reporter or an admin can approve. No automatic approval or account sanction results from the score.
- Validation recommended: submit three invented substantive answers and a long generic description, then compare evidence/risk output against the generated-question flow.
- Taxonomy: CWE-345, CWE-807.

### CR-02 — Proof-reuse detection compares provider ids, not image identity

- Instance: `reused-proof-bypass:backend/services/claimRiskService.js:15`
- Affected locations: exact-id reuse query `backend/services/claimRiskService.js:15-20`; fresh authenticated upload `backend/controllers/claimController.js:117-134`; risk penalty `backend/services/claimRiskPolicy.js:37-40`.
- Attacker-controlled source: a claimant re-uploads the same proof image used by another account.
- Broken control/sink: every new Cloudinary upload receives a new provider `publicId`, while the reuse query compares only exact `proofImages.publicId`. Re-uploading identical bytes under a fresh id bypasses the 40-point reused-proof signal.
- Impact: copied ownership evidence is not flagged for human review, weakening fraud detection and admin triage.
- Closest apparent control/counterevidence: evidence remains private, claims remain human-approved, and other history/frequency signals still apply. No content hash or perceptual-image comparison closes this specific reuse path in the reviewed chain.
- Validation recommended: upload identical proof bytes from two accounts and confirm different ids plus `reusedProof: false`.
- Taxonomy: CWE-354, CWE-807.

### CR-03 — Pending and daily claim limits are count-before-create races

- Disposition: secondary abuse/resource candidate; not an automatic-approval bypass.
- Instance: `claim-limit-race:backend/controllers/claimController.js:100`
- Affected locations: pending count/control `backend/controllers/claimController.js:100-102`; daily count/control `backend/controllers/claimController.js:103-105`; later upload/create sinks `backend/controllers/claimController.js:117-138`.
- Attacker-controlled source: one authenticated user submits concurrent claims for different items before any individual create becomes visible to the other count checks.
- Broken control/sink: count and create are not atomic and have no per-user quota row/reservation. The unique indexes prevent duplicate pending claims for the same item, not multiple concurrent claims across different items.
- Impact: configured pending/daily limits can be exceeded, producing extra private uploads, claims, admin work, email, and notification fan-out.
- Closest apparent control/counterevidence: global authentication/rate limiting, per-item unique pending indexes, maximum upload count/size, and post-create human review constrain impact. Treat as abuse/availability unless validation demonstrates material resource exhaustion.
- Validation recommended: concurrent multi-item creation harness.
- Taxonomy: CWE-362, CWE-799.

### CP-01 — Shared contact access is not revoked when a claim is rejected

- Instance: `post-rejection-contact-disclosure:backend/controllers/claimController.js:269`
- Affected locations: contact-share status check and mutation `backend/controllers/claimController.js:269-280`; rejection transition `backend/controllers/claimController.js:190-211`; competing-claim rejection `backend/controllers/claimController.js:233-239`; claimant read path `backend/controllers/claimController.js:183-187`; entrypoints `backend/routes/claimRoutes.js:37,40,43`.
- Attacker-controlled/participant source: a reporter or admin shares contact while a claim is pending, then rejects that claim or approves a competing claim.
- Broken control/sink: `isContactShared` is set true but neither direct rejection nor automatic competing-claim rejection clears it. The share operation also uses a read-then-save without a conditional `status: pending` update, so it can race a rejection and set the flag after rejection commits.
- Impact: a rejected claimant can plausibly retain access to reporter contact details through the authorized claim-read path, contrary to the final rejection decision.
- Closest apparent control/counterevidence: only the reporter/admin can initiate sharing, every claim read is participant/admin scoped, and contact is never shared automatically. Validate `claimView` on rejected claims to confirm whether status independently suppresses previously shared contact.
- Validation recommended: share, reject, then fetch as claimant; repeat with concurrent share/reject requests.
- Taxonomy: CWE-200, CWE-359, CWE-863.

## Negative controls from claim-risk/verification shard

- Every claim endpoint is authenticated (`backend/routes/claimRoutes.js:30-43`). List queries scope non-admins to claims they submitted or reports they own; single-claim reads require claimant, reporter, or admin participation (`backend/controllers/claimController.js:42-46,160-187`).
- Claim creation rejects self-claims, closed/claimed/in-progress items, and mismatched match/item/claimant triples; approval revalidates the match, reciprocal item ownership, and both item states inside the transaction (`backend/controllers/claimController.js:72-77,107-115,190-232`).
- Claim creation constructs an explicit trusted object, forces `claimantId` from the session and `status: pending`, uploads proof images as authenticated assets, and cleans them up after create failure (`backend/controllers/claimController.js:117-140`).
- Risk output never approves a claim, bans/suspends an account, or changes ownership. `evaluateClaimRiskSignals` labels itself `advisory-only`, and all non-low/rejected-threshold cases request human review (`backend/services/claimRiskPolicy.js:42-56`).
- Review is a human reporter/admin action. Claim, target item, reciprocal item, and match state changes occur together in a Mongo transaction; competing pending claims are rejected in that transaction (`backend/controllers/claimController.js:190-242`). Shared item writes provide a conflict point for concurrent approvals.
- Private proof images use five-minute signed views through the existing `claimView` serializer path; outsider proof/contact fields are redacted according to previously recorded serializer evidence (`backend/controllers/claimController.js:36-46,178-187`).
- Verification text is normalized and bounded; sensitive-secret keywords reduce evidence score and produce a removal warning (`backend/services/claimVerificationService.js:1,32-45,65-72`). This warning is advisory and does not itself remove submitted secrets.

## AI-decision and platform-feedback shard

The following files were fully read line-by-line: `backend/controllers/aiFeedbackController.js`, `backend/controllers/feedbackController.js`, `backend/models/AIDecisionFeedback.js`, `backend/models/Feedback.js`, `backend/routes/aiFeedbackRoutes.js`, and the short authorization context in `backend/routes/feedbackRoutes.js`. Existing validator and validation-middleware controls were re-read as consumer context.

### AF-01 — AI feedback accepts unowned, nonexistent targets and claimant-supplied algorithm identity

- Instance: `unbound-ai-feedback:backend/controllers/aiFeedbackController.js:10`
- Affected locations: user input and create sink `backend/controllers/aiFeedbackController.js:10-27`; bare target reference and non-unique compound index `backend/models/AIDecisionFeedback.js:3-30`; authenticated submit route `backend/routes/aiFeedbackRoutes.js:9`.
- Attacker-controlled source: any authenticated user submits a syntactically valid ObjectId for another user's match/image/location/report suggestion, or a nonexistent ObjectId, together with an arbitrary decision and `algorithmVersion` string.
- Broken control/sink: submission validates only target type, ObjectId syntax, decision enum, and string lengths. It never loads the polymorphic target, proves it exists, checks the submitter is a participant/owner, derives the algorithm version from the target, or prevents duplicate decisions.
- Impact: an attacker can manufacture or duplicate plausible-looking correction records, misattribute feedback to an arbitrary algorithm version, and create admin-review workload. If an administrator approves records without independently reopening each target, evaluation/training data integrity can be poisoned.
- Closest control/counterevidence: every new record is forced to `pending`; only admins can list or approve it; the immutable policy says admin-approved-dataset-only; no reviewed runtime consumer in this shard automatically trains a model. Therefore this is a feedback-integrity/human-review weakness, not proof of uncontrolled automatic training.
- Validation recommended: submit feedback for a nonexistent id, another user's target, and repeated identical tuples; then trace every approved-feedback dataset consumer before assigning final severity.
- Taxonomy: CWE-345, CWE-639, CWE-799.

## Negative controls from AI and platform feedback

- AI-feedback `targetType` and `decision` are exact allowlists; ids must be 24-hex ObjectIds; free text is bounded; `submittedBy`, `source`, and initial `status` are server-derived (`backend/controllers/aiFeedbackController.js:7-27`). These controls suppress generic mass assignment and operator injection through this endpoint.
- AI-feedback listing/review is admin-only and review status is restricted to approved/rejected (`backend/routes/aiFeedbackRoutes.js:10-11`; `backend/controllers/aiFeedbackController.js:53-62`). No automatic approval, claim decision, account suspension, face identification, or sensitive-trait inference appears in these files.
- Platform feedback submission is authenticated, validated, explicitly mapped to the current user, and forces `pending`; the schema bounds every text/enum/rating field (`backend/routes/feedbackRoutes.js:20`; `backend/controllers/feedbackController.js:15-26`; `backend/models/Feedback.js:8-63`).
- Platform-feedback list/respond actions are admin-only and validated (`backend/routes/feedbackRoutes.js:22-24`). Queries are built only from allowlisted scalar category/rating/status values, so no direct NoSQL operator injection is reachable through these routes.
- Admin responses are stored as bounded text rather than rendered or executed here (`backend/controllers/feedbackController.js:59-74`; `backend/models/Feedback.js:53-57`). Frontend rendering remains the required XSS sink review.

## Bootstrap, production migration, cache, error, and upload-middleware shard

The following files were fully read line-by-line: `backend/scripts/bootstrapAdmin.js`, `backend/scripts/migrateProduction.js`, `backend/middlewares/cacheMiddleware.js`, `backend/middlewares/errorMiddleware.js`, and `backend/middlewares/uploadMiddleware.js`.

### BM-01 — Concurrent bootstrap executions can both pass the no-active-admin guard

- Disposition: privileged operational candidate.
- Instance: `admin-bootstrap-race:backend/scripts/bootstrapAdmin.js:22`
- Affected locations: explicit gate/environment source `backend/scripts/bootstrapAdmin.js:12-19`; root control `backend/scripts/bootstrapAdmin.js:21-27`; admin create sink `backend/scripts/bootstrapAdmin.js:29-38`.
- Source: two authorized or accidentally duplicated bootstrap processes run concurrently with different valid admin identities before any active administrator exists.
- Broken control/sink: active-admin count, identity-existence checks, and admin creation are separate non-transactional operations. Both processes can observe zero active admins and create independently valid administrators.
- Impact: an unintended extra privileged account can be created without `ALLOW_ADDITIONAL_ADMIN=YES`, defeating the one-time bootstrap invariant and complicating privileged-account attribution.
- Closest control/counterevidence: execution requires the exact confirmation flag plus a strong operator-supplied password; existing users are never silently promoted; unique email/student-id indexes stop same-identity duplication; credentials are not printed. Exploitation requires process/environment authority.
- Validation recommended: yes; run two synchronized first-admin bootstraps against different emails and determine whether deployment orchestration guarantees singleton execution.
- Taxonomy: CWE-362.

### BM-02 — Data migration commits before security indexes are created

- Instance: `migration-index-race:backend/scripts/migrateProduction.js:90`
- Affected locations: transaction/mutation phase `backend/scripts/migrateProduction.js:62-90`; post-commit index sinks `backend/scripts/migrateProduction.js:93-106`.
- Source: live application writes, process failure, or index-build failure after the migration transaction commits and before every `createIndexes()` completes.
- Broken control/sink: duplicate claims and legacy data are changed transactionally, but uniqueness/security indexes are created afterward, concurrently, outside that transaction and without a visible maintenance/write lock. A live writer can recreate a duplicate before index construction, or one failed index can leave an already-mutated database with only a subset of intended constraints.
- Impact: duplicate pending claims, missing dedupe/session/workflow indexes, inconsistent release state, or a failed deployment whose destructive data changes already committed.
- Closest control/counterevidence: a replica set and explicit confirmation are mandatory; duplicate claims are deterministically closed; rerunning is largely idempotent. Deployment may externally stop writes and backup/rollback may be verified, but the script does not enforce or attest those conditions.
- Validation recommended: yes; run with concurrent claim writes and fault-inject one index build. Record maintenance-mode, backup, rollback, and post-index verification evidence.
- Taxonomy: CWE-362, CWE-664.

### BM-03 — Unclassified production errors disclose their raw message to clients

- Instance: `error-detail-disclosure:backend/middlewares/errorMiddleware.js:94`
- Affected locations: raw error copy `backend/middlewares/errorMiddleware.js:21-24`; response sink `backend/middlewares/errorMiddleware.js:90-99`.
- Attacker-controlled source: a request that reaches an unexpected database, provider, parser, filesystem, or programmer error not replaced by one of the explicit normalization branches.
- Broken control/sink: production hides the stack but always returns `error.message`; unknown 500 errors therefore expose dependency/provider/internal diagnostic text instead of a generic message and correlation identifier.
- Impact: clients may learn database paths/fields, provider behavior, internal hostnames, filesystem paths, configuration state, or other details useful for follow-on attacks; some dependency messages can include sensitive values.
- Closest control/counterevidence: common Mongoose/JWT/Multer/JSON failures are normalized and stack traces/full error objects are development-only. The leak remains for every unclassified error.
- Validation recommended: yes; trigger representative provider/database/internal failures in production mode and inspect response bodies.
- Taxonomy: CWE-209.

### BM-04 — Multipart limits do not bound aggregate request parts/fields or concurrent memory use

- Instance: `multipart-memory-exhaustion:backend/middlewares/uploadMiddleware.js:36`
- Affected locations: memory-storage sink `backend/middlewares/uploadMiddleware.js:9-10`; limit control `backend/middlewares/uploadMiddleware.js:35-43`; exported upload entrypoints `backend/middlewares/uploadMiddleware.js:89-105`.
- Attacker-controlled source: authenticated clients submit many concurrent multipart requests, maximum-count files, or large numbers of non-file fields/parts.
- Broken control/sink: each request can retain up to five 5-MB file buffers in process memory, while `fields`, `fieldSize`, `parts`, and header-pair limits are not explicitly bounded. File-size/count controls therefore do not cap aggregate parser work across fields or concurrency.
- Impact: memory/CPU exhaustion and process restart, disrupting reporting, claim, authentication-adjacent, and administrative workflows.
- Closest control/counterevidence: applicable routes authenticate before multipart parsing; variants cap files to one/three/five; global/provider rate limits may narrow concurrency. Exact route limits and proxy body caps need validation.
- Validation recommended: yes; load-test multipart fields/parts and concurrent 25-MB uploads under production proxy limits.
- Taxonomy: CWE-400, CWE-770.

### BM-05 — Signature-only image checks do not establish a valid, bounded image

- Disposition: deferred pending Cloudinary/parser behavior validation.
- Instance: `shallow-image-validation:backend/middlewares/uploadMiddleware.js:70`
- Affected locations: client MIME control `backend/middlewares/uploadMiddleware.js:13-33`; signature controls `backend/middlewares/uploadMiddleware.js:61-84`.
- Attacker-controlled source: a file containing an allowed magic prefix followed by malformed, polyglot, highly compressed, or extreme-dimension content.
- Broken control/sink: validation checks only a few leading bytes and does not decode the image, validate full structure, bound dimensions/frame count/decompressed pixels, or reject trailing active/polyglot content.
- Impact: downstream image-provider/parser resource exhaustion or content-type confusion if the provider stores/serves the original without safe decoding/re-encoding.
- Closest control/counterevidence: uploads are limited to 5 MB each; reviewed Cloudinary code forces `resource_type: image`, restricts delivered dimensions, and the external provider is expected to validate/decode image formats. No local native image parser executes this buffer.
- Validation recommended: yes; submit truncated, polyglot, decompression-bomb, and extreme-dimension samples and inspect provider delivery type/content.
- Taxonomy: CWE-20, CWE-400, CWE-434.

## Bootstrap/migration/middleware negative controls

- Bootstrap has no default credential: it requires explicit confirmation, operator email/password, a 14-character mixed-class password, no existing active admin unless separately confirmed, and refuses to promote an existing user (`backend/scripts/bootstrapAdmin.js:5-39`). Success logs never print credentials.
- Migration requires an explicit confirmation after a stated verified backup and a Mongo replica set; its data rewrites run in a transaction, force contact visibility to workflow-only, remove legacy raw token fields, deterministically reject duplicate pending claims, and classify public settings from a fixed key set (`backend/scripts/migrateProduction.js:17-90`). Backup existence and rollback viability remain external evidence rather than script-enforced controls.
- Repository search found no application call site for exported `cacheResponse` or `invalidateCache` beyond `backend/middlewares/cacheMiddleware.js` itself. Its URL-only key at line 16 would be unsafe for user/role/language-varying responses if adopted, but no current reachable cache-auth bleed instance exists; disposition suppressed/not reachable at current HEAD.
- Cache stores only successful GET JSON bodies, does not cache response headers/cookies, degrades on Redis failure, and uses TTLs (`backend/middlewares/cacheMiddleware.js:7-53`). Raw original URLs in cache keys can create fragmentation and may expose query secrets through Redis key error logs if a future caller caches sensitive query-string routes.
- Upload MIME and magic-byte allowlists reject non-image schemes and empty/mismatched headers; file variants cap count and per-file bytes (`backend/middlewares/uploadMiddleware.js:13-43,45-105`). These are useful controls but not aggregate/decode validation.
- Error responses expose stacks only in development and normalize common database, JWT, Multer, and malformed-JSON cases (`backend/middlewares/errorMiddleware.js:26-88,90-99`). Development full-error logging can contain sensitive diagnostics and should remain inaccessible outside local/dev environments.

## Category and public-statistics shard

The following files were fully read line-by-line: `backend/controllers/categoryController.js`, `backend/routes/categoryRoutes.js`, `backend/models/Category.js`, `backend/controllers/statsController.js`, and `backend/routes/statsRoutes.js`.

### CAT-AUTH-01 — Any authenticated user can mutate the global active taxonomy

- Instance: `global-taxonomy-authorization:backend/routes/categoryRoutes.js:29`
- Affected locations: entrypoint/root authorization `backend/routes/categoryRoutes.js:28-29`; provider-generated fields and create sink `backend/controllers/categoryController.js:123-145`; public consumer `backend/routes/categoryRoutes.js:25-26`.
- Attacker-controlled source: any authenticated account submits a unique requested category name.
- Broken control/sink: unlike create/update/delete, `/auto-create` has no admin-role check, validator, approval state, or human moderation. AI-corrected name/icon/description are immediately persisted with `isActive: true` and appear in the public taxonomy.
- Impact: a low-privilege user can pollute or manipulate globally visible classification data, create misleading/inappropriate categories, and degrade report/search consistency for every user.
- Closest apparent control/counterevidence: authentication, normalized unique names, schema length limits, and provider mapping to an existing category constrain duplicates/content size. The behavior is explicitly documented in the route comment and may be an intentional product feature; validate the intended governance model and UI confirmation before final severity.
- Validation recommended: yes; invoke the endpoint as a normal user and verify immediate public visibility without admin approval.
- Taxonomy: CWE-862, CWE-284.

### CAT-DOS-01 — Auto-create exposes unbounded AI cost and cache-aggregation amplification

- Instance: `ai-resource-amplification:backend/controllers/categoryController.js:124`
- Affected locations: unvalidated request entrypoint `backend/routes/categoryRoutes.js:29`; unbounded cleaned input and growing category list `backend/controllers/categoryController.js:123-130`; provider call `backend/controllers/categoryController.js:130`; active create/cache invalidation `backend/controllers/categoryController.js:136-145`; public full-collection aggregation on cache miss `backend/controllers/categoryController.js:15-38`.
- Attacker-controlled source: an authenticated user repeatedly supplies unique category strings, including strings up to the global body limit because this route does not use `createCategoryValidator`.
- Broken control/sink: provider generation happens before schema length validation and receives both the unbounded requested name and the full distinct active-category list. Every successful unique create deletes the shared public cache; the next public list request runs two whole-collection group aggregations. Repeating create/list grows provider prompt input and forces recurring database work.
- Impact: external-AI spend, database/category spam, cache churn, and aggregation load can be amplified by one authenticated account.
- Closest apparent control/counterevidence: the global API limiter, 1 MB JSON body limit, authentication, unique index, provider/model length checks, Redis cache, and 15-minute category cache bound individual operations. There is no route-specific quota, per-user category cap, pre-provider length validation, or pending moderation state.
- Validation recommended: measure provider calls, category growth, cache misses, and aggregation latency under repeated unique names.
- Taxonomy: CWE-400, CWE-770, CWE-799.

## Negative controls from category/statistics shard

- Manual category create/update/delete routes require both authentication and current admin role, validate ids and bounded body fields, and map explicit fields rather than spreading `req.body` (`backend/routes/categoryRoutes.js:31-34`; `backend/controllers/categoryController.js:41-100`).
- Category normalization uses NFKC, whitespace collapse, lowercase uniqueness, schema bounds, and a unique normalized-name index (`backend/models/Category.js:3-30`). Duplicate-create races are caught by the unique index (`backend/controllers/categoryController.js:41-60,136-150`).
- Category rename and report-category updates run in one Mongo transaction (`backend/controllers/categoryController.js:63-98`). Query selectors use server-loaded category names and fixed operators, not attacker-supplied query objects; no direct NoSQL injection path exists in these files.
- Stored category/AI strings are bounded data returned as JSON; no HTML/template/DOM execution sink exists in this backend shard. Frontend category render contexts remain the stored-XSS closure boundary.
- Public category caching stores one globally public taxonomy/count response, not user-specific content (`backend/controllers/categoryController.js:11-38`). Category mutations invalidate that cache.
- Public stats expose only three aggregate counts and use a fixed global public cache key with a five-minute TTL (`backend/controllers/statsController.js:8-27`; `backend/routes/statsRoutes.js:6`). No identity, location, category, contact, claim evidence, or per-user breakdown is returned.

## Search, report intelligence, and aggregate advisory shard

The following files were fully read line-by-line: `backend/services/chatSearchService.js`, `backend/services/conversationalReportService.js`, `backend/services/reportIntelligenceService.js`, `backend/services/reportQualityService.js`, and `backend/services/operationalIntelligenceService.js`.

No standalone security candidate was promoted from this shard. The following concrete controls and boundaries were confirmed:

- Search normalization treats report/query content as bounded data, expands at most 24 terms, considers at most ten concepts, and returns a fixed maximum of four explanation strings (`backend/services/chatSearchService.js:39-45,74-113,166-212`). Fuzzy matching has a small edit-distance threshold and reviewed callers bound report field lengths, suppressing a direct regex-injection or clearly unbounded algorithmic-DoS hypothesis here.
- Follow-up context reads at most the last ten entries and returns at most 500 characters from prior user content (`backend/services/chatSearchService.js:115-128`). No database, privileged tool, or executable prompt sink appears in this deterministic service.
- Conversational drafts are deterministic, capped to 500 source characters, advisory, and explicitly require review; inferred fields do not write a report in this service (`backend/services/conversationalReportService.js:46-84`). The privacy notice warns against secrets. Existing report-wizard review/apply behavior must remain the write-boundary control.
- Duplicate-report lookup is explicitly scoped to `userId`, excludes deleted/archived items, reads at most 40 candidates, and returns at most ten (`backend/services/reportIntelligenceService.js:17-32`). Although its local serializer includes precise location, only an authenticated same-account caller should receive it; controller authorization remains consumer validation.
- Report quality and duplicate scores are labelled `advisory-only`; no approval, ownership, moderation, account sanction, face identification, or sensitive-trait inference sink exists (`backend/services/reportQualityService.js:10-57`; `backend/services/reportIntelligenceService.js:35-45`).
- Operational guidance operates on aggregate counts, withholds recommendations below 20 reports, requires cohort minimum samples, labels recommendations experimental/advisory, and explicitly rejects individual prediction/profiling semantics (`backend/services/operationalIntelligenceService.js:70-187`). Labels are length-bounded plain strings; frontend rendering remains the stored-XSS sink check.

## Image-analysis/job-lock models and API primitives shard

The following files were fully read line-by-line: `backend/models/ImageAnalysis.js`, `backend/models/JobLock.js`, `backend/utils/apiError.js`, `backend/utils/apiResponse.js`, and `backend/utils/asyncHandler.js`.

No new standalone candidate was promoted from this shard:

- Image-analysis coordinates, confidence, moderation decision, provider, and principal scalar fields are typed/bounded, and `(itemType,itemId)` is unique (`backend/models/ImageAnalysis.js:8-60`). Several string arrays lack schema-level item/count bounds, but the only runtime writer found is the previously reviewed normalization path in `imageAnalysisService`; retain producer validation as the primary resource-integrity control and cover direct model writes in tests.
- `ImageAnalysis.imageUrl` is a stored string, not a fetch sink in this model. Previously reviewed runtime provenance derives it from the application's upload pipeline, so this schema does not independently establish SSRF.
- Job locks have a unique name plus required owner/expiry fields (`backend/models/JobLock.js:3-7`). Previously recorded `BG-01`/`BG-02` remain service-level acquisition/lease candidates; this model adds neither an ownership bypass nor a missing uniqueness control.
- `ApiError` carries caller-supplied messages/details and stack state, but disclosure depends on `errorMiddleware`; that sink is reviewed separately (`backend/utils/apiError.js:11-35`).
- `ApiResponse` serializes the exact controller-supplied data object without a generic secret scrub (`backend/utils/apiResponse.js:16-33`). Sensitive-field safety therefore remains a controller/model-serializer obligation, not a defect independently exploitable through this utility.
- `asyncHandler` consistently forwards promise rejections to Express error handling and performs no dynamic evaluation or trust-boundary transformation (`backend/utils/asyncHandler.js:14-16`).

## Service worker, browser image processing, push, and saved-search shard

The following files were fully read line-by-line: `frontend/public/sw.js`, `frontend/src/utils/imageRedaction.js`, `frontend/src/utils/imageTransform.js`, `frontend/src/utils/pushNotifications.js`, and `frontend/src/utils/savedSearches.js`.

No new standalone candidate was promoted. Existing `MI-01` and `SS-01` remain the relevant root issues:

- Push notification navigation is reduced to a same-origin path both when received and clicked, preventing an attacker-controlled notification URL from becoming an external open redirect (`frontend/public/sw.js:4-12,31-51`). Title/body are notification text fields, not HTML sinks, and are length bounded.
- The service worker excludes all cross-origin, `/api/`, and `/socket.io/` requests from cache handling and caches only successful basic static subresources (`frontend/public/sw.js:56-73`). This suppresses a current authenticated-API cache bleed hypothesis. Static cache entries remain origin-wide and should be cleared/versioned across security-sensitive asset releases.
- Privacy redaction normalizes/clamps at most 20 regions, decodes locally, draws the original into a fresh canvas, applies bounded pixelation regions, and re-encodes to JPEG/PNG/WebP (`frontend/src/utils/imageRedaction.js:24-42,86-142`). Canvas re-encoding removes original file metadata. If no region is supplied it deliberately returns the original file, preserving existing `MI-01`: the UI/direct-API boundary must not imply that automatic analysis guarantees redaction.
- Crop/rotation likewise decodes locally and re-encodes through canvas without uploading or fetching attacker-chosen URLs (`frontend/src/utils/imageTransform.js:37-92`). Large decoded pixel dimensions can consume browser memory; the reviewed report/upload boundaries cap input bytes, while pixel-dimension validation remains a performance-hardening opportunity rather than a separate exploit shown here.
- Push permission is requested only in the explicit subscription function; server keys come from the same-origin API, subscriptions are posted through the shared API client, and service-worker scope is the fixed `/sw.js` (`frontend/src/utils/pushNotifications.js:35-63`). Unsubscribe removes both browser and server registrations; partial network failure is an operational cleanup case.
- Saved-search filters are allowlisted/length-normalized, capped to five, and expired after 30 days (`frontend/src/utils/savedSearches.js:1-18,38-48`). This confirms `SS-01` as a same-browser cross-account privacy issue from the global storage key, not injection or unbounded storage.

## Frontend preference, constant, formatting, helper, and lazy-load shard

The following files were fully read line-by-line: `frontend/src/utils/accessibilityPreferences.js`, `frontend/src/utils/constants.js`, `frontend/src/utils/formatDate.js`, `frontend/src/utils/helpers.js`, and `frontend/src/utils/lazyWithRetry.js`.

No standalone candidate was promoted:

- Accessibility preferences accept only three text scales and exact booleans, then toggle fixed dataset/class values (`frontend/src/utils/accessibilityPreferences.js:1-46`). The global localStorage key contains no account data.
- API/socket origins are build-time operator configuration with same-origin defaults (`frontend/src/utils/constants.js:6-7`). A malicious `VITE_*` value is a deployment/supply-chain compromise, not an end-user input path; exact production bundle values belong in deployment validation.
- Date utilities parse and format values as text without an HTML or code sink (`frontend/src/utils/formatDate.js:13-39`). Invalid-date exceptions can affect component resilience but do not establish a trust-boundary violation here.
- Text/status/name helpers return plain strings or fixed class strings. `optimizeImageUrl` rewrites only Cloudinary upload URLs and otherwise returns the HTTPS-upgraded source (`frontend/src/utils/helpers.js:9-120`); runtime image provenance is reviewed at the API/upload serializers rather than assumed safe from this helper.
- Lazy chunk retry recognizes fixed error patterns, stores only the current URL in session storage, allows at most one reload per URL/window, and never evaluates stored text (`frontend/src/utils/lazyWithRetry.js:3-50`). Current URLs may contain sensitive query strings, so authentication/reset routes must avoid secrets in URLs; existing token-route handling is reviewed separately.

## Frontend auth hooks, route guards, debounce, and Redux root shard

The following files were fully read line-by-line: `frontend/src/hooks/useAuth.js`, `frontend/src/hooks/useDebounce.js`, `frontend/src/routes/AdminRoute.jsx`, `frontend/src/routes/ProtectedRoute.jsx`, and `frontend/src/redux/store.js`.

### RS-01 — Redux root has no account-bound reset for participant/private slices

- Disposition: deferred pending every slice/logout reducer review.
- Instance: `cross-account-redux-state:frontend/src/redux/store.js:17`
- Affected locations: direct root reducer map `frontend/src/redux/store.js:17-28`; logout wrapper `frontend/src/hooks/useAuth.js:24`; auth guard state dependency `frontend/src/routes/ProtectedRoute.jsx:11-28`.
- Source/boundary: account A loads claims, matches, notifications, reports, or admin data, logs out, and account B authenticates in the same SPA execution context.
- Broken control/sink: the store has no root reducer that clears all account-bound slices on logout/account change. Whether sensitive state survives depends on each slice handling logout and each page replacing rather than briefly rendering prior values.
- Impact: stale account-A data can remain in memory and be rendered or reused after account B logs in, especially if a request fails or pages render before refetch completion.
- Closest control/counterevidence: route guards hide protected outlets while auth is false; a full reload recreates the store; individual slices may clear on logout or reset on mount. Those controls must be enumerated before promotion.
- Validation recommended: load every private slice as A, fail/block the logout request, authenticate as B without reloading, and inspect state/UI before and after failed refetches.
- Taxonomy: CWE-359, CWE-488.

## Negative controls from auth hooks and route guards

- `useAuth` exposes action creators without token storage. Its logout callback returns the dispatch promise without `.unwrap()` (`frontend/src/hooks/useAuth.js:20-28`), reinforcing existing `ST-01`: callers can treat a rejected server logout as a locally fulfilled flow unless they explicitly inspect the action.
- Protected/admin guards depend only on Redux authentication/current-role state and are navigation controls, not security authorization (`frontend/src/routes/AdminRoute.jsx:11-27`; `frontend/src/routes/ProtectedRoute.jsx:11-28`). Reviewed backend routes independently reauthenticate/authorize privileged operations.
- The saved redirect state comes from React Router's current in-app location object, not a caller-provided external URL in these guards (`frontend/src/routes/ProtectedRoute.jsx:13,27`). Login consumer validation remains required.
- Debounce holds only the caller value for a bounded timer and cancels on dependency change (`frontend/src/hooks/useDebounce.js:15-28`); delay selection can affect UX/request volume but provides no trust-boundary sink.
- Redux serializability checking is disabled for FormData (`frontend/src/redux/store.js:29-32`). This reduces development diagnostics but does not persist or expose state by itself.

## Generic form control and pagination shard

The following files were fully read line-by-line: `frontend/src/components/common/Button.jsx`, `frontend/src/components/common/Input.jsx`, `frontend/src/components/common/Select.jsx`, `frontend/src/components/common/Textarea.jsx`, and `frontend/src/components/common/Pagination.jsx`.

No standalone security candidate was promoted:

- Button variants/sizes resolve through fixed class allowlists, loading disables interaction, and content/icons render as React nodes without an HTML sink (`frontend/src/components/common/Button.jsx:8-56`). Security-critical double-submit prevention still depends on callers passing loading/disabled state.
- Input and textarea labels, values, helper text, and errors use ordinary React rendering/native controls, so attacker text is escaped rather than interpreted as markup (`frontend/src/components/common/Input.jsx:27-62`; `frontend/src/components/common/Textarea.jsx:18-36`). Password reveal is an explicit local button and does not persist the value.
- Select options render label/value via native React option properties; no dynamic HTML, code evaluation, or style construction exists (`frontend/src/components/common/Select.jsx:29-69`). Server allowlists remain authoritative for privilege/state fields.
- Pagination exposes only previous/next actions and respects explicit/bounds-derived disabled state (`frontend/src/components/common/Pagination.jsx:6-20`). It does not clamp malicious programmatic `page`/`totalPages` props; existing backend `PG-01` and query validators are the trust-boundary controls.

## Language context and focused translation shard

The following files were fully read line-by-line: `frontend/src/i18n/imageProcessingTranslations.js`, `frontend/src/i18n/realtimeNotificationTranslations.js`, `frontend/src/i18n/recoveryTranslations.js`, `frontend/src/i18n/uiResidualTranslations.js`, and `frontend/src/i18n/LanguageContext.jsx`.

No standalone security candidate was promoted:

- The language choice is constrained to the fixed options set before writing the document language/dataset (`frontend/src/i18n/LanguageContext.jsx:4-16,23-37`). Translation interpolation returns ordinary strings and performs no HTML parsing (`frontend/src/i18n/LanguageContext.jsx:18-21,39-43`); React consumers must continue avoiding `dangerouslySetInnerHTML`.
- Privacy/image failure messages distinguish ordinary editing fallback from privacy-safe redaction failure, and the latter tells the user to remove the image or switch browsers (`frontend/src/i18n/imageProcessingTranslations.js:3-31`). Existing `MI-01` is a workflow enforcement issue, not a missing warning-string issue.
- Recovery messages explicitly require physical handover confirmation and state that AI suggestions are not ownership/handover proof; cancellation reason UX asks for at least five characters in all three languages (`frontend/src/i18n/recoveryTranslations.js:3-128`). Existing `RW-01` remains the backend/API enforcement gap.
- Profile-completion and push strings describe optional notifications and authorised contact sharing; they do not themselves expose values or make authorization decisions (`frontend/src/i18n/realtimeNotificationTranslations.js:1-20`; `frontend/src/i18n/uiResidualTranslations.js:1-81`).

## Statistic card, chart, and loader shard

The following files were fully read line-by-line: `frontend/src/components/cards/StatCard.jsx`, `frontend/src/components/charts/DashboardChart.jsx`, `frontend/src/components/charts/MonthlyReportsChart.jsx`, `frontend/src/components/charts/StatusPieChart.jsx`, and `frontend/src/components/common/Loader.jsx`.

No standalone candidate was promoted. Titles, values, labels, counts, and empty-state messages pass through React/Chart.js data properties rather than HTML injection sinks. Styling choices come from fixed maps. Chart work is proportional to supplied arrays/keys; reviewed stats producers return bounded aggregate groups, so no attacker-amplifiable frontend resource path was demonstrated in these components. The loader uses a fixed same-origin logo path and fixed size-class allowlist.

## Primary layout and mobile navigation shard

The following files were fully read line-by-line: `frontend/src/components/layout/AdminLayout.jsx`, `frontend/src/components/layout/DashboardLayout.jsx`, `frontend/src/components/layout/Footer.jsx`, `frontend/src/components/layout/MobileBottomNav.jsx`, and `frontend/src/components/layout/PublicLayout.jsx`.

### TC-01 — Global footer overstates AI/privacy assurance as “Privacy-first AI verification”

- Disposition: trust/transparency candidate linked to `MI-01` and advisory-only AI controls.
- Instance: `unsupported-assurance:frontend/src/components/layout/Footer.jsx:30`
- Affected location: globally visible footer badge `frontend/src/components/layout/Footer.jsx:28-31`.
- Broken control: the badge states that the product provides “Privacy-first AI verification,” while reviewed AI functions are explicitly advisory and do not verify ownership; `MI-01` demonstrates a scanner-unavailable route that can publish an untouched image through the public media path.
- Impact: users may infer that AI verifies ownership or guarantees image privacy and therefore submit sensitive images/details with more confidence than the actual controls support.
- Closest control/counterevidence: report/claim/recovery screens contain stronger local notices that AI is not proof and require human decisions. The footer claim is short marketing text, not an authorization mechanism, but it is global and unqualified.
- Validation recommended: usability/policy review; replace with an evidence-supported statement that distinguishes human verification, advisory AI, and manual privacy review.
- Taxonomy: CWE-451, CWE-1021 (interface trust context; final taxonomy may be adjusted).

## Layout/navigation negative controls

- Both admin logout buttons dispatch `logoutUser` without awaiting or checking the server result (`frontend/src/components/layout/AdminLayout.jsx:45,76-83,105-113`), reinforcing existing `ST-01`; no new root issue was created.
- Admin link destinations and all mobile navigation/report destinations are fixed internal routes. Unauthenticated report redirect state uses the current router pathname, not an external URL (`frontend/src/components/layout/MobileBottomNav.jsx:24-43,45-114`).
- Layouts expose semantic main/navigation landmarks and no raw HTML, script, dynamic external URL, or privileged API action (`frontend/src/components/layout/AdminLayout.jsx:65-121`; `frontend/src/components/layout/DashboardLayout.jsx:11-23`; `frontend/src/components/layout/PublicLayout.jsx:11-20`). Backend guards remain authoritative for admin pages.

## Public registration, recovery, verification, and contact shard

The following files were fully read line-by-line: `frontend/src/pages/public/ForgotPassword.jsx`, `frontend/src/pages/public/Register.jsx`, `frontend/src/pages/public/ResetPassword.jsx`, `frontend/src/pages/public/VerifyEmail.jsx`, and `frontend/src/pages/public/Contact.jsx`.

No new standalone security candidate was promoted:

- Forgot-password UI applies syntactic email validation, displays only the address the visitor submitted, and moves to a generic dispatched state after the API call (`frontend/src/pages/public/ForgotPassword.jsx:23-55`). Account-enumeration resistance remains the reviewed backend response/timing control.
- Registration uses the same password/email/phone/student-id constraints as the server-facing validation, sends an explicit field set, and passes Google credentials only to the dedicated auth action (`frontend/src/pages/public/Register.jsx:39-111`). No token is written to browser storage here.
- Reset and verification tokens are read from URL fragments rather than query parameters, reducing server log/referrer exposure; tokens are posted through the auth service and never rendered (`frontend/src/pages/public/ResetPassword.jsx:16-48`; `frontend/src/pages/public/VerifyEmail.jsx:13-47`). The fragment remains in browser history until navigation and should be replaced/cleared after success as defense in depth; backend single-use/expiry is authoritative.
- API error messages are rendered as React text (`frontend/src/pages/public/ForgotPassword.jsx:35-39,69`; `frontend/src/pages/public/ResetPassword.jsx:43-45,75`; `frontend/src/pages/public/VerifyEmail.jsx:37-41,74-78`). No XSS sink exists, but existing `BM-03` covers raw production message disclosure.
- Contact details come only from the fixed public setting and are encoded for the Google Maps query; the reviewed settings controller validates email/phone values and uses a fixed public-key allowlist (`frontend/src/pages/public/Contact.jsx:21-27,60-104`). External map links use `noopener noreferrer`.
- Contact submission requires the authenticated Redux user and posts only subject/message/fixed rating/category; editable display email is not sent as an identity override (`frontend/src/pages/public/Contact.jsx:34-58,109-116`). Backend authentication and explicit feedback mapping prevent caller identity spoofing.

## Item fields, language/scroll/status controls, and animated background shard

The following files were fully read line-by-line: `frontend/src/components/common/ItemAttributeFields.jsx`, `frontend/src/components/common/LanguageSwitcher.jsx`, `frontend/src/components/common/ScrollToTopButton.jsx`, `frontend/src/components/common/SpaceBackground.jsx`, and `frontend/src/components/common/StatusBadge.jsx`.

No standalone security candidate was promoted:

- Item attribute controls only update caller-owned state and render escaped labels/text; lack of client maxlength attributes does not bypass reviewed server list/scalar bounds (`frontend/src/components/common/ItemAttributeFields.jsx:6-22`).
- Language selection iterates the fixed supported options and passes codes through the constrained language provider (`frontend/src/components/common/LanguageSwitcher.jsx:5-94`). No user-controlled HTML/class/URL sink exists.
- Scroll and status controls use fixed actions/classes; the assistant-state custom event changes only visibility (`frontend/src/components/common/ScrollToTopButton.jsx:6-49`; `frontend/src/components/common/StatusBadge.jsx:9-16`).
- The decorative canvas is hidden from assistive technology, pauses while the document is hidden, uses 30fps/lower star counts for low-effects/mobile, and renders one static frame for reduced motion (`frontend/src/components/common/SpaceBackground.jsx:13-29,47-57,100-111,302-317,337-387,390-397`).
- Performance hardening: resize events are not throttled and each event recreates up to 900 star objects before the next animation frame (`frontend/src/components/common/SpaceBackground.jsx:35-98,332-345`). This is locally triggered browser work, not an unauthenticated remote resource-exhaustion path; cover sustained resize/device-rotation in performance UAT.

## Sidebar, notification/profile modals, and admin report moderation shard

The following files were fully read line-by-line: `frontend/src/components/layout/Sidebar.jsx`, `frontend/src/components/modals/NotificationPreferencesModal.jsx`, `frontend/src/components/modals/ProfileCompletionModal.jsx`, and `frontend/src/components/admin/AdminReportModeration.jsx`.

### AL-REPORT-01 — Administrator deletion of another user's report has no admin audit record

- Instance: `missing-audit:frontend/src/components/admin/AdminReportModeration.jsx:56`
- Affected locations: privileged UI action `frontend/src/components/admin/AdminReportModeration.jsx:56-65,98,107`; server authorization/mutation `backend/controllers/lostItemController.js:157-174` and `backend/controllers/foundItemController.js:159-176`; generic authenticated routes `backend/routes/lostItemRoutes.js:37` and `backend/routes/foundItemRoutes.js:37`.
- Privileged source: an administrator archives/deletes a student report from the admin moderation screen.
- Broken control/sink: the generic delete controllers allow either owner or admin and cascade report/match/claim/image-analysis mutations, but never create `AdminLog`, identify that the actor used admin authority, or record a reason/previous state.
- Impact: compromised or mistaken administrators can remove public reports, reject active matches/pending claims, and initiate public-image deletion without an application audit trail for attribution/review.
- Closest control/counterevidence: explicit confirmation UI, current-user authentication, admin/owner authorization, in-progress handover prohibition, and a Mongo transaction protect state integrity. They do not provide accountability, and direct API callers bypass the UI confirmation.
- Validation recommended: delete another user's lost/found report as admin and query admin logs; confirm no external audit middleware/provider event exists.
- Taxonomy: CWE-778.

## Sidebar/modal/moderation negative controls

- Sidebar destinations are fixed internal paths. Its logout is another fire-and-forget dispatch (`frontend/src/components/layout/Sidebar.jsx:8-28`), reinforcing `ST-01` rather than creating a new root issue.
- Notification preference UI constructs only fixed channel/category boolean fields and posts through the same-origin API (`frontend/src/components/modals/NotificationPreferencesModal.jsx:15-69,83-144`). Backend validation rejects unknown keys and user-scopes persistence.
- Profile completion validates phone/student id, restricts selection to browser-declared image types, compresses toward 2 MB/1024 px, and sends an explicit FormData/object shape (`frontend/src/components/modals/ProfileCompletionModal.jsx:34-83`). On compression failure it sends the original file; backend signature/5 MB checks remain authoritative. This profile avatar path is distinct from report-image privacy redaction.
- Admin moderation renders all report/user text through React and uses fixed image/status/date properties; no raw HTML sink exists (`frontend/src/components/admin/AdminReportModeration.jsx:70-107`). It displays exact admin-authorized location/storage data, so public `LP-01`/`LP-02` are not caused by this privileged screen.

## User claims, matches, reports, and notifications page shard

The following files were fully read line-by-line: `frontend/src/pages/user/MyClaims.jsx`, `frontend/src/pages/user/MyMatches.jsx`, `frontend/src/pages/user/MyFoundItems.jsx`, `frontend/src/pages/user/MyLostItems.jsx`, and `frontend/src/pages/user/Notifications.jsx`.

No new root candidate was promoted; these pages provide concrete reachability for existing findings:

- Claim review is a deliberate human action. The UI requires a rejection remark and submits an explicit id/status/remark object (`frontend/src/pages/user/MyClaims.jsx:60-102,180-226`), while existing `RW-01` remains the direct-API/backend validation gap. Contact sharing is a separate explicit confirmation, but it is offered before approval, reinforcing `PC-01` (`frontend/src/pages/user/MyClaims.jsx:70-79,151-165`).
- Match confirmation/rejection is a human click, not automatic AI approval. Rejection sends no reason, reinforcing `RW-02`; backend participant/state checks remain authoritative (`frontend/src/pages/user/MyMatches.jsx:22-42,87-96`).
- Own-report pages request a user-id-filtered list, clear list state on unmount, and use confirmation before delete (`frontend/src/pages/user/MyFoundItems.jsx:20-60,176-183`; `frontend/src/pages/user/MyLostItems.jsx:20-60,176-183`). In-flight fulfilled requests can repopulate after unmount/account change, reinforcing `RS-01`/`RR-UI-01`; backend ownership checks protect edits/deletes.
- Notification data/actions use the user-scoped API/thunks, render through `NotificationCard`, and use fixed preference keys (`frontend/src/pages/user/Notifications.jsx:25-116,118-249`). Existing `RS-01`/`CF-06` cover stale cross-account socket/Redux delivery; this page adds no logout reset.
- All user/report/notification values render through React, fixed routes, or native date formatting; no raw HTML or external navigation sink appears in these pages.

## Admin management translations and category/report wrapper shard

The following files were fully read line-by-line: `frontend/src/i18n/adminManagementTranslations.js`, `frontend/src/pages/admin/ManageCategories.jsx`, `frontend/src/pages/admin/ManageFoundItems.jsx`, and `frontend/src/pages/admin/ManageLostItems.jsx`.

### TC-02 — Account closure confirmation overstates anonymization completeness

- Disposition: trust/transparency candidate linked to `AC-03` and `AC-04`.
- Instance: `unsupported-assurance:frontend/src/i18n/adminManagementTranslations.js:38`
- Affected locations: English assertion `frontend/src/i18n/adminManagementTranslations.js:37-45`; equivalent Sinhala `:174-182`; equivalent Tamil `:311-319`.
- Broken control: the irreversible confirmation says personal data, sessions, and private media are removed and related workflows are safely closed/archived. Discovery candidates `AC-03` and `AC-04` found claimant-evidence/workflow cleanup gaps and owned report descriptive/location data surviving user anonymization.
- Impact: an administrator may tell a data subject that closure is privacy-complete when identifying report/workflow content remains, creating false erasure assurance and weaker manual follow-up.
- Closest control/counterevidence: direct account identifiers, sessions, and private media may be removed as stated; some surviving report content may be intentionally retained/anonymized under policy. The UI does not distinguish erased, pseudonymized, retained, or institutionally archived data.
- Validation recommended: execute account closure against all report/claim/media relations and build a field-level retention matrix before final wording/severity.
- Taxonomy: CWE-451, CWE-200.

## Admin management negative controls

- Settings strings accurately state claim signals are human-review only and never automatically ban/suspend/approve/reject (`frontend/src/i18n/adminManagementTranslations.js:104-138,241-275,378-412`). Existing `SET-ATOMIC-01` concerns partial policy persistence, not misleading automation wording.
- Manual category management sends explicit name/icon/description fields through Redux; backend routes require admin and validate/normalize bounds (`frontend/src/pages/admin/ManageCategories.jsx:15-65,98-106`). Text/icon/description render through React, suppressing stored-XSS in this page.
- Found/lost admin pages are thin fixed-type wrappers over the already reviewed moderation component (`frontend/src/pages/admin/ManageFoundItems.jsx:1-4`; `frontend/src/pages/admin/ManageLostItems.jsx:1-4`). Existing `AL-REPORT-01`/`MI-02` cover their privileged mutation and media cleanup risks.

## System-settings route and pagination-helper closure shard

The following files were fully read line-by-line: `backend/routes/systemSettingRoutes.js` and `backend/utils/pagination.js`.

### PG-01 — Unbounded/non-finite page values can produce an invalid or unsafe database skip

- Candidate surface: any controller that passes an unvalidated `req.query.page` through `paginate` before applying the returned `skip` to a database query.
- Attacker control: `query.page` is parsed with `parseInt`, then only lower-bounded at one; it is not required to be finite, a safe integer, or below a maximum (`backend/utils/pagination.js:22-25`). A sufficiently large decimal value can therefore become an unsafe integer or `Infinity`, and multiplication can preserve/produce a non-finite `skip`.
- Impact hypothesis: the downstream query can reject with a server error rather than a controlled 4xx/empty page, or request an excessively deep offset whose database work is disproportionate to the response. Route-level validators suppress this where present, but the shared helper does not make that invariant universal.
- Verification needed: enumerate every `paginate` caller and confirm a strict positive bounded page validator precedes it; otherwise reproduce with very large page values and measure response/error/database behavior. Harden centrally with finite/safe-integer checks and a defensible maximum page/offset or cursor pagination.
- Confidence: medium as a shared-helper weakness; exploitability remains caller-dependent.

No settings-route authorization candidate was promoted:

- `/public/:key` is the only unauthenticated route; the previously reviewed controller accepts only fixed `PUBLIC_SETTING_KEYS` and additionally queries `isPublic: true`. The dynamic private read/update routes independently require both authentication and the `admin` role (`backend/routes/systemSettingRoutes.js:12-17`). Route order also prevents `/public/:key` from being consumed by the single-segment admin route.
- The pagination helper caps `limit` to `1..50`, defaults malformed/zero values safely, and computes fixed response metadata (`backend/utils/pagination.js:22-36`). `buildSort` maps only caller-provided allowlisted field names to numeric sort directions, suppressing direct sort-field injection (`backend/utils/pagination.js:48-71`). `parseInt` prefix acceptance is loose input semantics but does not bypass the limit cap.
- Existing `AL-SETTING-01` remains the relevant settings mutation audit-trail candidate; these routes confirm the update is admin-only but add no audit middleware themselves.

## Frontend admin, AI, category, and claim service-boundary shard

The following files were fully read line-by-line: `frontend/src/services/adminService.js`, `frontend/src/services/aiFeedbackService.js`, `frontend/src/services/aiService.js`, `frontend/src/services/categoryService.js`, and `frontend/src/services/claimService.js`.

No new standalone security candidate was promoted. These clients expose existing backend findings but do not introduce a second trust-boundary bypass:

- All requests use the shared `api` client; none of these services reads, writes, logs, or places an access/refresh token in storage, request bodies, URLs, or JavaScript-readable headers (`frontend/src/services/adminService.js:6-58`; `frontend/src/services/aiFeedbackService.js:1-6`; `frontend/src/services/aiService.js:1-28`; `frontend/src/services/categoryService.js:6-37`; `frontend/src/services/claimService.js:6-63`). The previously reviewed shared client supplies credentialed cookie auth and CSRF headers for mutations.
- Dynamic admin/category/claim/feedback ids and claim question parameters are interpolated without `encodeURIComponent` (`frontend/src/services/adminService.js:34,42,58`; `frontend/src/services/aiFeedbackService.js:6`; `frontend/src/services/categoryService.js:29,37`; `frontend/src/services/claimService.js:34,45,53,58,63`). Current callers supply database ids and fixed item types, while corresponding backend routes require authentication/role as applicable and reject invalid Mongo ids/enums (`backend/routes/adminRoutes.js:23-33`; `backend/routes/aiFeedbackRoutes.js:9-11`; `backend/routes/categoryRoutes.js:31-34`; `backend/routes/claimRoutes.js:30-43`). Malformed values produce route/validation failures rather than an authorization or external-URL sink; encoding remains robustness hardening.
- Admin status/role and claim review/contact methods construct narrow request bodies (`frontend/src/services/adminService.js:33-43`; `frontend/src/services/claimService.js:44-54`). Category create/update and AI-feedback submit/review forward caller objects, but frontend allowlisting would not be a security boundary: reviewed backend validators/controllers map or allowlist fields and independently authorize admin mutations. Existing `AF-01` remains the feedback-integrity root because the submit backend fails target ownership/existence/algorithm binding, not because this wrapper forwards the payload.
- `suggestDetailsFromImage` and `submitClaim` send only caller-provided `FormData`; browser multipart processing plus backend upload middleware provide the actual size/type boundary (`frontend/src/services/aiService.js:4-13`; `frontend/src/services/claimService.js:13-19`). Explicitly setting `Content-Type` can be adapter-sensitive but does not expose data or bypass server validation in the reviewed browser/Axios path.
- The vision and category-auto-create calls are direct and have no client-side debounce, cancellation, or quota (`frontend/src/services/aiService.js:4-13,26-29`). Client throttling is bypassable and therefore not the missing security control; these reachable UI calls reinforce existing server-side `AI-COST-01`, `CAT-AUTH-01`, and `CAT-DOS-01`. Current generic API limiting is 1,000 requests per 15 minutes, while only AI chat has a tighter route limiter (`backend/server.js:81-85`; `backend/routes/aiRoutes.js:14-28`).
- Service methods return backend JSON/data directly and do not catch or reformat errors. Admin responses remain admin-only, claim detail/evidence is participant/admin scoped by the reviewed backend, and AI/category responses are application data rather than HTML execution sinks. Raw unexpected backend error text remains the separately recorded `BM-03` sink; these wrappers merely propagate Axios rejection objects to their consumers.

## Frontend admin/category/claim/item Redux-slice shard

The following files were fully read line-by-line: `frontend/src/redux/slices/adminSlice.js`, `frontend/src/redux/slices/categorySlice.js`, `frontend/src/redux/slices/claimSlice.js`, `frontend/src/redux/slices/foundItemSlice.js`, and `frontend/src/redux/slices/lostItemSlice.js`.

### RS-01 validation update — Reviewed private slices retain account data and accept late responses across logout

- Disposition update: strengthened from root-level deferred hypothesis to a high-confidence cross-account state-lifecycle candidate; browser/UI reproduction is still needed to measure actual render exposure.
- Sensitive state confirmed: admin state retains user records and audit logs (`frontend/src/redux/slices/adminSlice.js:76-86,108-111,134-137`); claim state retains lists and the selected claim, and `shareClaimContact` replaces both with the contact-sharing response (`frontend/src/redux/slices/claimSlice.js:64-72,85-101,139-142`); found/lost slices retain report lists and selected details, including mutation responses from authenticated create/update flows (`frontend/src/redux/slices/foundItemSlice.js:66-81,90-106,117-136`; `frontend/src/redux/slices/lostItemSlice.js:66-81,90-106,117-136`).
- Broken lifecycle control: none of these four slices handles the auth logout fulfilled action or an account/principal change. Found/lost expose manual clear actions, but those actions are neither logout listeners nor automatic account-bound resets in the reviewed files (`frontend/src/redux/slices/foundItemSlice.js:75-82`; `frontend/src/redux/slices/lostItemSlice.js:75-82`). Claim can clear only `currentClaim`, not its claim list; admin exposes no reset reducer (`frontend/src/redux/slices/claimSlice.js:73-77`; `frontend/src/redux/slices/adminSlice.js:76-88`).
- Late-response path: every pending thunk is accepted unconditionally and every fulfilled reducer writes its payload without checking `requestId`, current principal, or current authentication. A request issued by account A can therefore complete after logout/account-B login and repopulate the store even if a synchronous reset is later added only at logout (`frontend/src/redux/slices/adminSlice.js:89-142`; `frontend/src/redux/slices/claimSlice.js:78-147`; `frontend/src/redux/slices/foundItemSlice.js:83-148`; `frontend/src/redux/slices/lostItemSlice.js:83-148`).
- Security impact: account B or a guest in the same SPA lifetime may briefly or persistently receive account-A user/audit/claim/contact/report state if the next request fails, is delayed, or the component renders cached state before replacement. The contact-sharing response makes claim state particularly sensitive.
- Required fix/validation: implement an account-bound root reset plus cancellation/generation or principal/request ownership checks that reject late completions; reproduce A-load -> delayed request -> logout -> B-login -> release response while inspecting Redux and rendered pages. A full page reload is a mitigating user action, not a lifecycle guarantee.
- Taxonomy: CWE-359, CWE-488.

### RR-UI-01 — Out-of-order requests can overwrite the active list/detail with stale results

- Source: rapid filter/page changes or navigation from entity A to B while multiple `fetch*` requests remain in flight.
- Broken control/sink: the slices track one shared `isLoading` flag and accept all fulfilled actions. They do not store/compare the latest thunk `requestId`, abort the superseded call, or verify that a detail response still matches the active route. A slower earlier list/detail request can overwrite the newer result (`frontend/src/redux/slices/adminSlice.js:91-115,130-141`; `frontend/src/redux/slices/claimSlice.js:81-105`; `frontend/src/redux/slices/foundItemSlice.js:86-110`; `frontend/src/redux/slices/lostItemSlice.js:86-110`). Mutation completions also assign `currentClaim`/`currentItem` regardless of intervening navigation (`frontend/src/redux/slices/claimSlice.js:125-142`; `frontend/src/redux/slices/foundItemSlice.js:130-136`; `frontend/src/redux/slices/lostItemSlice.js:130-136`).
- Impact: stale sensitive details can appear under the wrong currently selected claim/report and users can act on misleading state; shared `isLoading` can become false while another request remains active. Server authorization still controls which payloads can be obtained, so this is not a backend IDOR by itself.
- Validation/fix: delay A after B in browser/API mocks and assert route/entity identity, list filters, and loading state. Track latest request IDs per operation, abort superseded reads, keep operation-specific pending counts, and only update `current*` when entity/request context still matches.
- Confidence: high for deterministic stale overwrite; security severity depends on consuming pages and account-reset behavior.

Counterevidence and non-findings:

- Categories are public taxonomy data in the reviewed backend route/controller boundary, so category state surviving logout is not a cross-user confidentiality defect. It remains vulnerable to ordinary stale-fetch ordering, but this shard establishes no sensitive sink (`frontend/src/redux/slices/categorySlice.js:54-106`).
- Thunks pass caller payloads to services, including FormData and upload callbacks, but Redux is not the authorization/validation boundary. Previously reviewed server validators, ownership checks, and admin-role checks must remain authoritative; no client-side payload shaping here bypasses them (`frontend/src/redux/slices/adminSlice.js:31-73`; `frontend/src/redux/slices/categorySlice.js:20-51`; `frontend/src/redux/slices/claimSlice.js:31-61`; `frontend/src/redux/slices/foundItemSlice.js:31-63`; `frontend/src/redux/slices/lostItemSlice.js:31-63`).
- Rejections retain only `error.message` or a server response `message`, not a raw stack/object/body. User-facing consumers should still map internal failures to stable safe copy, but these reducers do not independently expose headers, tokens, or response bodies.

## Frontend image-privacy, AI-suggestion, feedback, and modal shard

The following files were fully read line-by-line: `frontend/src/components/common/ImagePrivacyReview.jsx`, `frontend/src/components/common/AISuggestionReview.jsx`, `frontend/src/components/common/FeedbackModal.jsx`, `frontend/src/components/common/ConfirmDialog.jsx`, and `frontend/src/components/common/Modal.jsx`.

### MI-01 validation update — scanner-unavailable manual confirmation reaches the public-image sink

- Reachable frontend instance: when AI image review fails, the report wizard creates a `manual-review` record (`frontend/src/components/common/ReportItemWizard.jsx:260-289`). `ImagePrivacyReview` lets the user self-confirm that file without transforming it (`frontend/src/components/common/ImagePrivacyReview.jsx:39-56`); the callback changes only the review state to `manually-reviewed` (`frontend/src/components/common/ReportItemWizard.jsx:347-352`). The step validator then treats the image as resolved and permits submission (`frontend/src/components/common/ReportItemWizard.jsx:365-375`).
- Public sink: the resulting original `File` remains in the wizard image array and is appended to the report upload (`frontend/src/components/common/ReportItemWizard.jsx:466-477`). Lost/found controllers upload it without authenticated delivery (`backend/controllers/lostItemController.js:41,123`; `backend/controllers/foundItemController.js:41,124`), so the shared storage service returns a durable public Cloudinary URL (`backend/services/cloudinaryService.js:7-25`).
- Impact refinement: provider/AI unavailability converts privacy scanning into a warning-and-self-attestation control. A hurried or mistaken user can publish an unredacted face, identity document, address, plate, QR code, serial identifier, or location clue. This strengthens existing `MI-01`; it is not a separate duplicate candidate.
- Counterevidence: the fallback is explicit, explains that automatic review is unavailable, and requires one confirmation per affected file; files positively identified as `redaction-required` use a separate redaction action and cannot use this manual-confirm button (`frontend/src/components/common/ImagePrivacyReview.jsx:25-56`). Those UX controls reduce accidental publication but do not produce the required privacy-safe public derivative or secure private original.
- Required fix/validation: make the server authoritative. Store originals as authenticated/private assets, create a privacy-safe public derivative only after server-side moderation/redaction or a separately auditable human workflow, and reject direct API/public uploads that lack that artifact. Validate with a non-sensitive synthetic marked image while the AI provider is unavailable.

## Negative controls and hardening notes from this shard

- AI suggestions are advisory and require an explicit per-field **Apply** or explicit **Apply all** action; the user can dismiss them, privacy warnings are shown, and the form remains editable (`frontend/src/components/common/AISuggestionReview.jsx:26-75`). No silent form overwrite or automatic claim/ownership decision occurs in this component.
- `FeedbackModal` submits only after an explicit user action and bounds the subject/message inputs (`frontend/src/components/common/FeedbackModal.jsx:16-64`). This is ordinary product feedback, not an automatic model-training call. The separate AI-feedback backend records new submissions as `pending`, requires an authenticated admin to approve/reject them, and states an admin-approved-dataset-only policy (`backend/controllers/aiFeedbackController.js:10-33,36-63`; `backend/models/AIDecisionFeedback.js:21-26`). No uncontrolled automatic-training path was established in this shard.
- All reviewed suggestion, warning, reason, title, and message values render through React text contexts; none uses raw HTML, script evaluation, or a caller-selected external navigation sink.
- `Modal` implements an Escape handler, backdrop close, focus trapping, focus restoration, dialog semantics, and body-scroll restoration (`frontend/src/components/common/Modal.jsx:14-137`). `ConfirmDialog` disables action buttons while `isLoading`, but Escape/backdrop/close remain active during an in-flight action because the base modal is unaware of the busy state (`frontend/src/components/common/ConfirmDialog.jsx:13-55`). That can create confusing stale/destructive-operation UX, but no duplicate request, authorization bypass, or secret exposure was demonstrated; record it as state-integrity hardening, not a security candidate.

## Frontend accessibility, AI-loading, category, empty-state, and location-assistant shard

The following files were fully read line-by-line: `frontend/src/components/common/AccessibilityPreferences.jsx`, `frontend/src/components/common/AILoadingToast.jsx`, `frontend/src/components/common/CreatableCategorySelect.jsx`, `frontend/src/components/common/EmptyState.jsx`, and `frontend/src/components/common/LocationAssistant.jsx`.

### CAT-AUTH-01/CAT-DOS-01 validation update — ordinary field blur triggers global category creation before report submission

- Reachable trigger: `CreatableCategorySelect` retains arbitrary typed text and, on blur, converts any non-empty trimmed value into a selection without requiring the visible **Add** action or a separate confirmation (`frontend/src/components/common/CreatableCategorySelect.jsx:70-90`). It imposes no input-length cap.
- Call chain: the report wizard passes this change directly to `ensureCategory` (`frontend/src/components/common/ReportItemWizard.jsx:649-658`); a non-existing name immediately calls `aiService.autoCreateCategory`, stores the returned AI-generated category in the form, and refreshes the global category collection (`frontend/src/components/common/ReportItemWizard.jsx:196-217`). This happens before the report is submitted, so clicking outside the field and later abandoning the report can still mutate global taxonomy and consume provider/database/cache resources.
- Amplification refinement: the component does not disable creation while the request is loading, deduplicate in-flight names, require a completed report, or ask for governance approval. Repeated type-and-blur interactions provide a low-friction UI trigger for the already recorded backend authorization/cost/cache-amplification roots. Client controls would remain bypassable, so the required security fix is still server-side role/moderation, strict pre-provider length validation, per-user/route quotas, idempotency/concurrency control, and delayed activation.
- Counterevidence: whitespace-only input is ignored; selecting an existing option clears the typed ref; the wizard maps case-insensitive existing category names without calling the provider (`frontend/src/components/common/CreatableCategorySelect.jsx:72-89`; `frontend/src/components/common/ReportItemWizard.jsx:196-203`). Backend authentication, normalization, and unique indexes also constrain anonymous use and exact duplicates. These do not prevent low-privilege global mutation or unique-name amplification.

### LP-01/LP-02 validation update — location privacy metadata is received but not presented or enforced by the input assistant

- `LocationAssistant` sends the user's free-text location to the protected same-origin resolver after a 550 ms pause once at least three characters exist (`frontend/src/components/common/LocationAssistant.jsx:8-33`). It renders exact canonical name, verification status, and area, but does not render the response `privacyNotice` or use the returned `sensitivity` classification (`frontend/src/components/common/LocationAssistant.jsx:48-60`).
- When multiple suggestions exist, clicking one explicitly replaces the report field with the exact `suggestion.canonicalName`; `suggestion.sensitivity` is ignored (`frontend/src/components/common/LocationAssistant.jsx:61-73`). The backend response includes sensitivity and claims private/restricted places are approximate, but `publicLocationView` itself returns canonical name and area without a sensitivity branch (`backend/controllers/aiController.js:27-45`; `backend/services/locationIntelligenceService.js:82-89`).
- Impact refinement: the assistant gives no visible warning to broaden a private/restricted location and does not itself enforce an approximate zone. The report wizard later submits the free-text value, reinforcing existing `LP-01`/`LP-02` public raw-location disclosure rather than creating a separate finding. Precision reduction must be enforced in the public server serializer/projection; the UI should also display the privacy notice and sensitivity-aware preview before submission.
- Counterevidence: suggestion application requires an explicit click; the component never silently overwrites the field with `result.best`; no coordinates are rendered; and the current bundled static locations are public or zone-level entries. Dynamic approved location knowledge and future restricted/private entries make server-enforced projection the durable boundary.

## Negative controls and hardening notes from this shard

- The location resolver is deterministic in-process location matching rather than an external AI-provider call (`backend/services/locationIntelligenceService.js:35-53`). Its route requires authentication, the controller caps normalized queries at 300 characters, the UI debounces requests, and only three suggestions render (`backend/routes/aiRoutes.js:23-25`; `backend/controllers/aiController.js:27-45`; `frontend/src/components/common/LocationAssistant.jsx:10-33,61-73`). Cleanup suppresses stale UI writes but does not abort the already-issued HTTP request; adding `AbortController`/request identity would reduce benign resource waste and stale loading behavior, not establish the missing server abuse boundary.
- `AILoadingToast` renders caller messages and translations only as React text, performs no AI action, ownership decision, or suggestion application, and its only action dismisses the fixed toast id (`frontend/src/components/common/AILoadingToast.jsx:5-16`). Its generic “extracting” copy is a product-accuracy concern after completion, not a security claim.
- Category labels, create labels, errors, helper text, empty-state content, and location values use React/react-select rendering without raw-HTML or evaluation sinks. `EmptyState` invokes only the callback supplied by its trusted parent and constructs no URL (`frontend/src/components/common/CreatableCategorySelect.jsx:92-128`; `frontend/src/components/common/EmptyState.jsx:10-38`).
- Accessibility preferences use fixed option keys/values and the previously reviewed sanitizer-backed storage helper (`frontend/src/components/common/AccessibilityPreferences.jsx:14-24,40-68`). The launcher is visually hidden (`frontend/src/components/common/AccessibilityPreferences.jsx:28-36`), which may make the feature unreachable without another caller, but that is accessibility/product verification rather than a confidentiality or authorization defect.

## Frontend admin claims, matches, users, settings, and AI-feedback-review shard

The following files were fully read line-by-line: `frontend/src/pages/admin/ManageClaims.jsx`, `frontend/src/pages/admin/ManageMatches.jsx`, `frontend/src/pages/admin/ManageUsers.jsx`, `frontend/src/pages/admin/SiteSettings.jsx`, and `frontend/src/pages/admin/AIFeedbackReview.jsx`.

### SET-ATOMIC-01 — Abuse-control settings can partially commit while the UI reports the combined save failed

- Instance: `partial-security-policy-update:frontend/src/pages/admin/SiteSettings.jsx:128`.
- Privileged source/boundary: an administrator edits the three claim-abuse thresholds as one visible form and presses one save button (`frontend/src/pages/admin/SiteSettings.jsx:224-235`).
- Broken control/sink: the handler issues three independent setting mutations inside `Promise.all` (`frontend/src/pages/admin/SiteSettings.jsx:122-150`). Each backend request independently upserts one key and has no shared transaction/version (`backend/controllers/systemSettingController.js:103-135`). If one request fails after another succeeds, `Promise.all` rejects, the page shows a single failure toast, and local state remains the old combined object even though part of the security policy is already live.
- Impact: operators can unknowingly leave inconsistent anti-abuse policy in production—for example a raised daily limit can persist while the pending/rejected limits appear unsaved—or unexpectedly tighten one control. This weakens configuration assurance and complicates incident reconstruction.
- Closest controls/counterevidence: client and server independently enforce strict numeric bounds; only administrators can mutate supported keys; the page can be reloaded to discover actual values. Those controls prevent arbitrary values but do not provide atomic all-or-nothing policy update, compare-and-set protection, rollback, or an accurate partial-success result.
- Validation/fix: force the second/third request to fail after the first succeeds, then reload and compare all keys. Replace the three writes with one server-side transactional policy endpoint (or explicit sequential compensation), return per-key results/version, and refresh authoritative state after any failure.
- Taxonomy: CWE-703, CWE-367.

### AF-01 validation update — The human approval UI omits the context needed to detect forged feedback

- The admin page displays only target type, decision, submitter name, optional dimension/note, policy, and timestamp (`frontend/src/pages/admin/AIFeedbackReview.jsx:71-90`). It does not display or link `targetId`, load the underlying target, show `algorithmVersion`/source, compare the original AI result with the correction, or let the reviewer enter a case-specific review rationale.
- Approval/rejection is a one-click action with a generated generic note (`frontend/src/pages/admin/AIFeedbackReview.jsx:29-43,86-90`). This makes the existing `AF-01` server weakness—unowned/nonexistent targets and claimant-supplied algorithm identity—impossible to verify from the intended review screen before approval.
- Review completeness is also bounded incorrectly: the page requests `limit: 100`, while shared pagination caps the response at 50; it renders no pagination control and always loads the first newest page (`frontend/src/pages/admin/AIFeedbackReview.jsx:15-27,59-95`; `backend/controllers/aiFeedbackController.js:36-50`; `backend/utils/pagination.js:22-27`). Forged/new feedback can bury older pending records from this UI.
- Counterevidence: all records start pending; listing/review is admin-only; buttons render only for pending records; no reviewed runtime automatically trains a model. This remains feedback-integrity and review-workload risk, not proof of automatic poisoning. Fix target ownership/existence/version binding server-side, deduplicate submissions, show a safe target snapshot/diff and immutable provenance, require a meaningful review note, and provide real pagination.

### Existing workflow/audit validation updates

- `RW-02` is confirmed on the administrator path: suggested matches expose direct **Reject** and **Confirm** buttons and send only `{id,status}` with no reason/confirmation form (`frontend/src/pages/admin/ManageMatches.jsx:30-41,199-219`). AI score and explanation are displayed, but the click remains a human action; no automatic match confirmation occurs. Backend transaction/state checks reject an opposite decision after finalization and create pending AI feedback for the first decision (`backend/controllers/matchController.js:81-104`), limiting double-click conflict but not supplying a durable human reason.
- `LA-STATUS-01`, `LA-ROLE-01`, and `LA-DELETE-01` remain UI-reachable: `ManageUsers` disables only actions targeting the current account, not an administrator who is currently the other last active admin (`frontend/src/pages/admin/ManageUsers.jsx:141-176`). Two administrators can therefore open confirmation dialogs for each other and submit cross-deactivation/demotion/anonymization concurrently. Server-side last-admin serialization remains the required fix; client counts would be stale and bypassable.
- `AL-SETTING-01` is reinforced by the actual settings UI. Email-verification changes are immediate one-click writes, while contact and abuse settings are direct saves; none asks for a reason or shows an audit receipt/version (`frontend/src/pages/admin/SiteSettings.jsx:72-107,122-150,179-235`). Strict allowlists/bounds and admin-only routes remain positive authorization controls but do not provide accountability.

## Negative controls from this admin shard

- Claim approval/rejection is explicitly initiated by a human administrator through a modal, and its textarea is required in this UI (`frontend/src/pages/admin/ManageClaims.jsx:43-74,144-190`). Existing `RW-01` remains the direct-API gap because the server permits an empty durable rejection reason; this page itself does not silently approve a claim.
- Claim cards receive admin context only on this admin route; user administration intentionally shows student id, email, and phone to an authenticated administrator (`frontend/src/pages/admin/ManageClaims.jsx:121-131`; `frontend/src/pages/admin/ManageUsers.jsx:128-176`). Reviewed backend routes independently require the admin role and claim proof links are short-lived signed assets. No anonymous/ordinary-user PII or proof sink was established in these pages.
- User status, role, and anonymization operations each require an explicit confirmation dialog and the UI blocks self-targeting (`frontend/src/pages/admin/ManageUsers.jsx:141-191`). The dialogs do not receive an in-flight loading flag, so repeated clicks can issue idempotent duplicate mutations/audit/email work; backend current-state/transaction controls determine final authority. Record per-action loading as robustness hardening, not a separate authorization finding.
- All user, claim, match, feedback, error, description, reason, and setting values render through React text/form contexts. Images reach only `<img src>` through the previously reviewed Cloudinary optimizer; these pages contain no raw-HTML/evaluation sink or caller-controlled external navigation.

## Frontend admin dashboard, logs, analytics, feedback, and location-knowledge shard

The following files were fully read line-by-line: `frontend/src/pages/admin/AdminDashboard.jsx`, `frontend/src/pages/admin/AdminLogs.jsx`, `frontend/src/pages/admin/Analytics.jsx`, `frontend/src/pages/admin/Feedback.jsx`, and `frontend/src/pages/admin/LocationKnowledge.jsx`.

### LP-03 validation update — The approval UI omits the privacy-safe projection before activating restricted knowledge

- Review context shown: canonical name, sensitivity, area/campus, aliases, source type/reference, current version, submitter, and last update (`frontend/src/pages/admin/LocationKnowledge.jsx:97-113`). This is useful human provenance and all status changes remain explicit administrator actions.
- Missing decision context: although the backend record contains `approximateZone`, coordinates, parent/nearby relationships, reviewer/time, and full version history, this page does not show those fields, a previous/current diff, or the public resolver projection. It therefore gives the reviewer no way to verify that a `zone-only`/`restricted` record will expose only its safe approximate zone before activation (`backend/models/LocationKnowledge.js:21-46`; `frontend/src/pages/admin/LocationKnowledge.jsx:97-119`).
- Activation sink: one click can mark a community record `map-source-verified`, `field-verified`, or `university-approved` with only a generated generic note (`frontend/src/pages/admin/LocationKnowledge.jsx:39-53,114-119`). The backend accepts that status, marks it active, increments history/version, and immediately refreshes the resolver (`backend/controllers/locationKnowledgeController.js:60-79`). Existing `LP-03` then returns exact canonical names because public projection has no sensitivity branch.
- Integrity/privacy impact refinement: a mistaken or compromised administrator can promote an exact restricted/private label as institution-verified without seeing the safe public representation or evidence history, causing misleading verification claims and precise public resolver disclosure. This strengthens `LP-03`; it is not a second precision finding.
- Required fix: enforce the approximate-zone projection server-side, show exact-versus-public previews plus history/source/reviewer/verification date, require a meaningful evidence note for stronger statuses, and consider a distinct institutional-approver permission or two-person approval for `university-approved`. Keep every status transition immutable/auditable.
- Counterevidence: listing/review routes require the current admin role; unapproved community records are inactive; status, sensitivity, version, source, and submitter are visible; backend records reviewer/time/history. There is no automatic or AI-driven approval in this page.

### Existing audit/accountability validation updates

- `AdminLogs` can display action, actor name/email, target model/id, details, IP address, and timestamp with pagination (`frontend/src/pages/admin/AdminLogs.jsx:69-98`). This confirms usable evidence for the actions that actually write `AdminLog`, while existing `AL-SETTING-01` remains visible as an absence: the fixed filter list includes user, claim, and category actions but no setting change, AI-feedback review, location approval, or platform-feedback response (`frontend/src/pages/admin/AdminLogs.jsx:11-14`). Adding a label would not fix missing producer-side audit writes.
- The log page contains no CSV/Excel/export functionality, formula construction, download, or raw-HTML sink, so export injection is not reachable here. Log strings and multiline details render through React text contexts (`frontend/src/pages/admin/AdminLogs.jsx:78-93`). The backend exposes logs only behind global admin middleware and no application mutation/delete route for `AdminLog` was found in the reviewed admin router; database-level tamper resistance and external immutable retention remain release-evidence controls.
- Platform feedback responses can be edited and status-changed, but the page shows the original user content separately and requires a response in this UI (`frontend/src/pages/admin/Feedback.jsx:138-169`). There is no visible immutable response history or audit receipt; add response-version/audit records for institutional accountability, but no privilege bypass or public PII sink was established here.

## Sensitive aggregate, PII, AI-claim, and rendering controls

- Dashboard statistics, operational risk counts, AI-provider health, audit records, analytics, feedback identities/content, and location-review data are all reached through endpoints protected by authentication plus current admin role (`backend/routes/adminRoutes.js:23-33`; `backend/routes/feedbackRoutes.js:22-24`; `backend/routes/locationKnowledgeRoutes.js:16-17`). These pages do not create a guest/ordinary-user aggregate or PII sink.
- Analytics location hotspots display exact raw bucket labels and counts, including possible low-count/single-report labels; `mergeBuckets` applies only normalization/sorting/top-eight selection, not minimum-count suppression (`frontend/src/pages/admin/Analytics.jsx:121-126`; `backend/services/operationalIntelligenceService.js:1-13`). Because administrators already have authorized report access, this was not promoted as a new cross-role disclosure. For privacy-by-design and shared screenshots/exports, prefer governed canonical zones and suppress/merge small cells. Prediction cohorts separately disclose their sample size and mark below-minimum cohorts; recommendations are labelled advisory/experimental (`frontend/src/pages/admin/Analytics.jsx:54-71,127-136`; `backend/services/operationalIntelligenceService.js:146-184`).
- The dashboard explicitly says strong matches await humans, counts AI corrections for review, exposes manual fallback status, and does not make an ownership/claim decision (`frontend/src/pages/admin/AdminDashboard.jsx:87-123,174-190`). A health-request failure is rendered identically to fallback mode/zero metrics because `aiHealth` becomes null; distinguish “unknown/unreachable” from confirmed fallback in operational UI, but this is readiness accuracy rather than authorization.
- User feedback subject/message/admin response, location/source/alias strings, log fields, chart/cohort labels, recommendation/brief text, and server errors render through React text nodes or chart props; none of these five pages uses `dangerouslySetInnerHTML`, HTML parsing, dynamic code, or untrusted external navigation. Feedback profile images reach only `<img src>` from the stored profile record and are visible solely to administrators (`frontend/src/pages/admin/Feedback.jsx:124-153`).

## Remaining Redux match/notification/theme/auth shard

The following files were fully read line-by-line: `frontend/src/redux/slices/matchSlice.js`, `frontend/src/redux/slices/notificationSlice.js`, `frontend/src/redux/slices/themeSlice.js`, and `frontend/src/redux/slices/authSlice.js`.

### RS-01 validation update — match and notification state add a concrete post-logout privacy path

- Match state retains the account-scoped match list, pagination, and current match. Its only clear action removes `currentMatch`; it has no logout/account-change listener and cannot clear the list (`frontend/src/redux/slices/matchSlice.js:42-55,63-94`). Match list/detail/status completions are accepted without principal or request-generation checks (`frontend/src/redux/slices/matchSlice.js:56-99`).
- Notification state retains full notification messages plus unread metadata and has no clear/reset-on-logout reducer. `resetUnreadCount` changes only the number, leaving messages intact (`frontend/src/redux/slices/notificationSlice.js:55-74,82-113`). This is directly account-private activity data, not public cache state.
- Concrete late ingress: `addSocketNotification` unconditionally prepends the supplied notification and increments unread count (`frontend/src/redux/slices/notificationSlice.js:64-70`). Combined with existing `CF-06` evidence that an authenticated socket is not disconnected/revalidated on logout, expiry, role change, or deactivation, account-A notifications can enter the shared Redux store after local logout and potentially after account B logs in.
- All match/notification async fulfillments also lack logout fencing, principal binding, or latest-request checks; an account-A HTTP response released after logout can repopulate the state (`frontend/src/redux/slices/matchSlice.js:56-99`; `frontend/src/redux/slices/notificationSlice.js:75-113`).
- Impact/validation: account B or a guest can receive account-A match evidence, report relationships, notification text, and activity signals within the same SPA lifetime. Validate with A socket + delayed match/notification request -> logout -> B login -> emit/release A events while observing Redux/UI. Root account reset must be paired with socket disconnect/reconnect and generation/principal checks, otherwise late events refill cleared state.

### ST-01 validation update — logout clears only auth state and does not fence older authentication completions

- `logoutUser` waits on the previously reviewed service wrapper, and the slice implements only its fulfilled reducer; that reducer clears `auth.user` and authentication flags but does not reset any other slice (`frontend/src/redux/slices/authSlice.js:18,44`). Because `authService.logout` swallows server failures, this remains a falsely successful local logout when revocation/cookie clearing never reached the server.
- Register, password login, Google login, and `fetchCurrentUser` fulfilled reducers all set authenticated user state without comparing request generation or a logout epoch (`frontend/src/redux/slices/authSlice.js:29-43`). A completion that was already in flight can therefore run after logout and restore `isAuthenticated`/role-bearing `user` state in the client. Backend authorization still blocks revoked sessions, but client route state and retained private slices can become visible/misleading until the next server rejection.
- `clearAuth` is likewise local state clearing, not server revocation (`frontend/src/redux/slices/authSlice.js:23-27`). It must not be presented as a security logout.
- Required fix/validation: propagate logout failure, await/unwrap it in callers, cancel/fence all auth and private-data thunks with an account/session generation, synchronously reset account-bound state, and explicitly disconnect the authenticated socket. Test both pre-request failure and response-lost-after-server-success cases.

Negative controls and hardening notes:

- No reviewed slice stores the authenticated `user`, role, token, notification, or match state in localStorage. Theme persistence writes only `LOCAL_STORAGE_THEME_KEY`; `applyThemeToDOM` maps only exact `dark`, `light`, or `system` values to a fixed `dark` class operation, so an arbitrary cached/action value is not used as a DOM/HTML/class-name injection sink (`frontend/src/redux/slices/themeSlice.js:9-36,44-59`). `setTheme` should still enum-normalize values for state integrity.
- `updateUserProfile` can replace the client user object, but it is an internal Redux action and does not alter the server session or establish backend role authorization (`frontend/src/redux/slices/authSlice.js:23-27`). Reviewed protected APIs independently authenticate and authorize requests.
- Socket notifications are appended without a collection cap, and duplicate events increment unread count again (`frontend/src/redux/slices/notificationSlice.js:64-70`). This can grow memory/count drift during a long or replay-heavy session; event deduplication and a bounded in-memory window are recommended. Server-controlled socket delivery and reload/fetch replacement reduce this to hardening absent a demonstrated attacker-controlled high-rate event source.
- Rejections retain message/code strings rather than raw response objects, stacks, headers, or tokens (`frontend/src/redux/slices/matchSlice.js:9-39`; `frontend/src/redux/slices/notificationSlice.js:9-52`; `frontend/src/redux/slices/authSlice.js:6-18`). Login/register/Google credentials are thunk arguments and should be excluded from production action logging/devtools, but these files do not persist those arguments themselves.

## Frontend feedback, item, location-knowledge, and match service-boundary shard

The following files were fully read line-by-line: `frontend/src/services/feedbackService.js`, `frontend/src/services/foundItemService.js`, `frontend/src/services/locationKnowledgeService.js`, `frontend/src/services/lostItemService.js`, and `frontend/src/services/matchService.js`.

No new standalone security candidate was promoted. Exact reachability and counterevidence:

- Lost/found list and detail methods intentionally call the public `optionalAuth` routes and return their response objects without privacy projection (`frontend/src/services/foundItemService.js:26-36`; `frontend/src/services/lostItemService.js:27-37`). Home and public search consume those methods. This confirms broad frontend reachability for existing `LP-01`/`LP-02` raw-location disclosure and `MI-01` public-image exposure; the defect remains the server serializer/storage boundary, not these transport wrappers.
- Lost/found create/update forward caller-built `FormData`, including images and location fields, and explicitly select multipart transport (`frontend/src/services/foundItemService.js:13-20,42-49`; `frontend/src/services/lostItemService.js:13-20,43-50`). Frontend shaping cannot enforce privacy against direct API callers. Reviewed backend upload limits, validators, explicit field mapping, ownership checks, and rollback controls prevent generic mass assignment, while the absence of an authoritative private-original/public-derivative pipeline remains existing `MI-01`.
- Axios serializes filter, location-resolution, and admin-list values via `params`, rather than concatenating them into a URL (`frontend/src/services/feedbackService.js:24-26`; `frontend/src/services/foundItemService.js:26-28`; `frontend/src/services/locationKnowledgeService.js:4,6`; `frontend/src/services/lostItemService.js:27-29`; `frontend/src/services/matchService.js:13-15`). Corresponding backend validators allowlist/bound query semantics, so no URL/query injection or unauthorized projection was established.
- Entity ids are interpolated without `encodeURIComponent` in feedback, item, location-review, and match paths (`frontend/src/services/feedbackService.js:35-36`; `frontend/src/services/foundItemService.js:34-71`; `frontend/src/services/locationKnowledgeService.js:7`; `frontend/src/services/lostItemService.js:35-72`; `frontend/src/services/matchService.js:21-32`). Runtime callers supply stored Mongo ids, and the reachable backend routes validate ids and independently enforce public/authenticated/admin/participant/owner boundaries. Malformed programmatic values can cause a 404/validation failure, not external navigation or object-authorization bypass; encoding remains robustness hardening.
- Platform-feedback admin reads/responses and location-knowledge list/review are labelled admin-only only by comments/API naming on the client, but the server independently requires current admin authorization and validates bodies (`backend/routes/feedbackRoutes.js:20-24`; `backend/routes/locationKnowledgeRoutes.js:14-17`). Raw client payload forwarding in `respondToFeedback`, location `suggest`, and location `review` does not create mass assignment because reviewed controllers construct explicit fields. Existing `LP-03` remains the public resolver's precision-projection root.
- Match methods use a narrow `{ status }` body, and every server match route requires authentication plus reviewed participant/admin object authorization (`frontend/src/services/matchService.js:13-33`; `backend/routes/matchRoutes.js:22-27`). No client-selected user/principal is transmitted. Match data remains subject to existing Redux account-reset/race candidate `RS-01`, not a new service-level leak.
- `connectFoundItem` and `connectLostItem` target `POST /:id/connect` (`frontend/src/services/foundItemService.js:60-62`; `frontend/src/services/lostItemService.js:61-63`), but neither method has a runtime caller and neither backend router defines that endpoint (`backend/routes/foundItemRoutes.js:30-39`; `backend/routes/lostItemRoutes.js:30-39`). These are stale/dead client methods causing a future 404 if reintroduced, not a currently reachable security mutation.
- All five services rely on the shared credentialed cookie/CSRF API client and contain no token/localStorage/header logging. They also propagate Axios/backend errors without sanitizing them. Consumer slices generally retain only `message`; unexpected server-message disclosure remains existing `BM-03`, not a second leak introduced by these wrappers.

## Frontend notification/settings/stats, client-validator, and admin-evidence-copy shard

The following files were fully read line-by-line: `frontend/src/services/notificationService.js`, `frontend/src/services/settingService.js`, `frontend/src/services/statsService.js`, `frontend/src/utils/validators.js`, and `frontend/src/i18n/adminEvidenceTranslations.js`.

### EV-PRIV-01 — Admin analytics falsely assures that private addresses are excluded from hotspots

- Instance: `misleading-privacy-evidence:frontend/src/i18n/adminEvidenceTranslations.js:62`.
- Affected locations: assurance text in all languages `frontend/src/i18n/adminEvidenceTranslations.js:62,137,143`; render sink `frontend/src/pages/admin/Analytics.jsx:121-125`; raw location source/grouping `backend/controllers/adminController.js:75-84`; pass-through `backend/controllers/adminController.js:169-175` and `backend/services/operationalIntelligenceService.js:1-14,165`.
- User-controlled source: lost/found reporters supply raw `lostLocation`/`foundLocation`; previously reviewed item flows also store sensitivity and verification metadata alongside those strings.
- Broken control/sink: the hotspot aggregations do not filter sensitivity, verification, `needsReview`, or governed canonical ids. They group by canonical name when present and otherwise fall back directly to the raw location. Nevertheless the UI states, “Private addresses are excluded” and that labels come from governed report data.
- Impact: exact private/restricted or unverified labels can be shown to administrators and used in operational hotspot recommendations under a false privacy/governance assurance. This can mislead privacy review, institutional evidence, or location-targeting decisions.
- Closest controls/counterevidence: analytics is admin-only, output is aggregate counts, and only the top eight merged labels are returned. The separate historical location-cohort query does require governed verification and public/zone-only sensitivity (`backend/controllers/adminController.js:114-140`), but those controls do not apply to hotspots.
- Validation recommended: insert isolated recent reports with a distinctive raw private address and sensitivity metadata, fetch admin stats, and verify the label appears while the exclusion notice is rendered. Apply the governed approximate-zone projection before grouping and make the copy describe the enforced rule.
- Taxonomy: CWE-359, CWE-451.

### EV-AUDIT-01 — Audit copy and filters advertise action evidence the application does not record

- Instance: `misleading-audit-completeness:frontend/src/i18n/adminEvidenceTranslations.js:4`.
- Affected locations: completeness/missing-evidence assurance and translated action labels `frontend/src/i18n/adminEvidenceTranslations.js:3-27,135-144`; advertised filters/render `frontend/src/pages/admin/AdminLogs.jsx:11-14,40-50,89-92`; actual writer inventory `backend/controllers/adminController.js:226-233,262-269` and `backend/services/accountService.js:131-139`.
- Broken control/sink: the UI offers claim approval/rejection and category create/update/delete filters and says missing evidence is shown as “not recorded,” but repository writer enumeration produces only user activation/deactivation, role promotion/demotion, and account anonymization. Entirely missing events cannot be displayed as “not recorded”; that fallback is used only for missing fields on a returned row. Conversely `USER_ANONYMIZED` is actually recorded but has no translated filter/label entry.
- Impact: an administrator or reviewer can infer that an empty claim/category filter proves no such action occurred, producing incomplete security/institutional audit evidence and weakening incident reconstruction. Existing `AL-SETTING-01` and `AL-REPORT-01` demonstrate the same UI cannot reveal whole missing event families.
- Closest controls/counterevidence: recorded user status/role/anonymization events are transactionally written and unknown action strings can render through a fallback. Neither control reconciles expected privileged state changes against actual records or warns that coverage is partial.
- Validation recommended: perform one claim review, category mutation, settings update, moderated report deletion, and account anonymization in an isolated environment; compare resulting rows and filter options. Label the view as partial until every privileged action has an enforced write and coverage test.
- Taxonomy: CWE-778, CWE-451.

## Negative controls and validator defects from this shard

- `notificationService` covers in-app notification reads/mutations, not push subscription persistence. All methods use the shared cookie/CSRF client; server routes authenticate first, scope objects to the current user, validate ids/queries, and expose no client-selected recipient (`frontend/src/services/notificationService.js:6-38`; `backend/routes/notificationRoutes.js:27-39`). Existing deferred `PS-01` remains rooted in the separate push-subscription utility/backend sender, and existing `RS-01` remains the account-lifecycle privacy defect.
- Setting keys are interpolated without URL encoding (`frontend/src/services/settingService.js:9-27`), but every runtime caller uses fixed literal keys. The reviewed controller independently allowlists keys/types/public classification; public reads require both a fixed `PUBLIC_SETTING_KEYS` member and stored `isPublic: true`. No attacker-chosen path, arbitrary public-setting read, or client-selected `isPublic` escalation survives.
- Public stats fetch a single fixed endpoint (`frontend/src/services/statsService.js:4-6`). The reviewed producer returns only three global counts, so no identity, precise location, contact, or small-cohort disclosure is introduced by this wrapper.
- Email, password, student-id, and phone validation is client convenience only; server validators remain authoritative. Password rules and student-id bounds align. The client deliberately accepts only Sri Lankan mobile formats while the server accepts any mobile locale, which is policy/UX drift rather than a bypass (`frontend/src/utils/validators.js:9-42`; `backend/utils/validators.js:48-71`).
- Concrete functional/security-usability defect: `validatePassword` returns a boolean (`frontend/src/utils/validators.js:18-24`), but the profile password-change handler destructures it as `{ isValid, message }`, making `isValid` always undefined and blocking every password rotation before the API call (`frontend/src/pages/user/Profile.jsx:141-149`). Registration/reset callers correctly treat it as boolean. Direct API password change remains protected and available, so this is not an authorization bypass; fix the return contract and regression-test valid/invalid rotation flows because inability to rotate a compromised password is security-relevant usability.
- `validateStudentId`/`validatePhone` assume string inputs and can throw on a truthy non-string (`frontend/src/utils/validators.js:31-42`), but reviewed DOM form callers supply strings and server endpoints independently type/normalize input. Record as defensive-hardening only.

## Main English/Sinhala/Tamil translation corpus shard

`frontend/src/i18n/translations.js` was fully read line-by-line (all 2,665 lines).

### MI-01 copy validation update — privacy assurance is stronger than the manual-fallback enforcement

- The English copy says every new public photo is checked and “unresolved sensitive content cannot be submitted” (`frontend/src/i18n/translations.js:914-925`), with equivalent Sinhala and Tamil assurances (`frontend/src/i18n/translations.js:1764-1775,2610-2621`). It also says original browser files are not uploaded after redaction/replacement (`frontend/src/i18n/translations.js:793-795,919-925`).
- Countercopy does disclose that automated analysis may be unavailable and then requires a manual privacy check/self-confirmation (`frontend/src/i18n/translations.js:789,922-924`; Sinhala `:1639,1772-1774`; Tamil `:2485,2618-2620`).
- Existing `MI-01` runtime evidence shows that this self-confirmation marks a provider-failure image resolved without producing a redacted derivative, after which the original `File` can reach the public upload. Therefore the absolute “unresolved sensitive content cannot be submitted” assurance is materially stronger than enforcement: an undetected/self-confirmed face, ID, address, QR code, card/phone number, or other sensitive region can still be submitted.
- Disposition: strengthen existing `MI-01`, not a duplicate finding. Revise copy only alongside the root server-authoritative private-original/public-derivative control; otherwise state clearly that manual confirmation does not guarantee removal and that the selected original may become public.

No additional standalone security candidate was promoted from this corpus:

- AI governance copy consistently requires human decisions and describes similarity/quality scores as advisory rather than ownership proof. It explicitly rejects automatic claim approval, face identification, and sensitive-trait inference (`frontend/src/i18n/translations.js:122,172,190,211,235,253-257,431,468,500,528-552,652,669-671,863-879,903-925`; equivalent Sinhala `:1081,1131,1149,1170,1194,1212-1216,1343-1344,1389-1402,1502,1519-1521,1713-1729,1753-1775`; Tamil `:1927,1977,1995,2016,2040,2058-2062,2189-2190,2235-2248,2348,2365-2367,2559-2575,2599-2621`). These statements align with previously reviewed human-review controllers and admin-approved AI-feedback dataset states.
- Manual search/reporting remains advertised when the assistant or quality/provider path is unavailable (`frontend/src/i18n/translations.js:584-620,789-805`; Sinhala `:1434-1470,1639-1655`; Tamil `:2280-2316,2485-2501`). No copy claims AI-provider availability as a condition for core reporting.
- The file contains no HTML/script payloads, `javascript:`/data URLs, external URLs, API keys, bearer values, secrets, or old Vercel/Railway/Heroku/Render/OpenAI/Gemini/Anthropic hosting/provider references. Google appears only as the current Google sign-in product label; AI provider text is generic/conditional.
- Reset/verification strings mention only a missing or expired token; no token value, storage instruction, URL template, logging instruction, or bearer transport is embedded (`frontend/src/i18n/translations.js:82-99,1041-1058,1887-1904`). Session copy correctly describes a secure cookie rather than localStorage token handling (`:29,988,1834`).
- Placeholders such as `{name}`, `{email}`, `{error}`, `{item}`, `{title}`, `{file}`, and `{source}` are ordinary translation interpolation markers, and this corpus contains no HTML or URL sink. They remain attacker-influenced text in some consumers, so rendering must stay escaped and email-subject/error consumers must newline-normalize/map safe messages; the translation data alone does not establish XSS, navigation, or header injection.
- Local-browser retention disclosures are present for saved searches, assistant text history, accessibility preferences, and report text drafts (`frontend/src/i18n/translations.js:498,617,634-640,808,831-833,965`; equivalent Sinhala `:1348,1467,1484-1490,1658,1681-1683,1815`; Tamil `:2194,2313,2330-2336,2504,2527-2529,2661`). Existing `SS-01`, chatbot-history, and draft cross-account findings govern whether those disclosures are sufficient; no hidden local-storage claim is introduced here.

## Public About/Home and user Dashboard/Profile page shard

The following files were fully read line-by-line: `frontend/src/pages/public/About.jsx`, `frontend/src/pages/public/Home.jsx`, `frontend/src/pages/user/Dashboard.jsx`, and `frontend/src/pages/user/Profile.jsx`.

### LP-01/LP-02 validation update — landing page publishes raw location strings anonymously

- `Home` fetches the public lost and found collections on initial anonymous render and stores up to three of each (`frontend/src/pages/public/Home.jsx:35-61`). Each card selects `item.lostLocation` or `item.foundLocation` directly and renders it as text (`frontend/src/pages/public/Home.jsx:13-28`), without consulting the available location-sensitivity/canonical-zone metadata.
- This is a prominent anonymous landing-page sink in addition to the already recorded search/detail sinks. It makes exact user-entered last-seen/found locations immediately visible and efficiently collectible from the newest reports, strengthening existing `LP-01`/`LP-02`; the fix remains a server-side public projection that reduces restricted/private locations to an approved approximate zone.
- Countercontrol: values render through React text nodes and links use fixed same-origin route shapes, so this page adds no XSS or external-navigation sink. It also does not display `storedAt`; that higher-risk custody location remains in the existing found-detail finding.

### RS-01 validation update — Dashboard/Profile local state is not principal-bound or late-response fenced

- Dashboard fetches account stats and suggested matches whenever the Redux `user` changes but does not first clear the prior `stats`/`matches`, set loading back to true, capture the user id, abort the previous request, or compare the principal before applying its response (`frontend/src/pages/user/Dashboard.jsx:55-102`). If principal B replaces A while the component remains mounted, A's values remain rendered during B's fetch and indefinitely on failure; a late A response can overwrite B's view.
- Profile initializes full name, phone, student id, and avatar URL from the current user. Its synchronization effect deliberately does nothing while editing (`frontend/src/pages/user/Profile.jsx:26-49`), so an in-place principal change can leave A's PII/form values under B and a subsequent submit sends those values to B's authenticated profile endpoint (`frontend/src/pages/user/Profile.jsx:74-101`). Password fields likewise are cleared only through cancel or successful completion, not on principal change (`frontend/src/pages/user/Profile.jsx:51-56,113-118,156-172`).
- Reachability/countercontrol: the normal protected-route logout redirect should unmount these pages, which destroys component-local state and substantially reduces the ordinary path. Existing `ST-01`/auth-race evidence nevertheless permits authentication identity changes and late fulfillments without a logout generation fence; browser validation should force that sequence. Treat this as strengthening `RS-01`, not a separate confirmed cross-account exploit, until the route lifecycle test is run.
- Fix: key the authenticated layout/pages by immutable principal/session generation, clear sensitive local state on principal change, abort old requests, and apply responses only when the captured principal/generation still matches.

### Password-rotation usability finding validation

- The previously recorded defect is exact and unconditional: `validatePassword(newPassword)` returns a boolean, but `Profile` destructures it as `{ isValid, message }`; `isValid` is therefore undefined and every password-change attempt returns before calling `/users/change-password` (`frontend/src/pages/user/Profile.jsx:141-162`; producer `frontend/src/utils/validators.js:18-24`). This blocks UI rotation even for a valid password and can delay remediation of a compromised credential. The protected API remains available to direct clients, so this is security-relevant usability rather than an authentication bypass.

Negative controls and hardening notes:

- About renders policy and AI descriptions only through React text contexts (`frontend/src/pages/public/About.jsx:7-48`). It has no HTML injection, external URL, dynamic navigation, provider-specific, automatic-approval, or automatic-training action. Its absolute image-privacy assurance remains governed by the existing `MI-01` copy/runtime mismatch.
- Home item names, descriptions, categories, locations, and dates render through React escaping; navigation targets are fixed same-origin report/search paths, with ids supplied by the reviewed database-backed public API (`frontend/src/pages/public/Home.jsx:13-28,74-105`). Public metrics are aggregate counts only. Fetch errors are logged in the local browser console for public endpoints, not exposed as page HTML (`:40-61`).
- Push permission is requested only after the user explicitly clicks Enable; iOS users outside standalone mode receive instructions instead, and failures map to fixed translated messages (`frontend/src/pages/user/Dashboard.jsx:73-82,113-129,194-213`). PWA install uses the browser-provided `beforeinstallprompt` event and requires a second explicit click (`:73-82,104-111,198`). No external link or silent install/permission path exists.
- Match confirmation/rejection remains an explicit user action and the page copy labels matches as suggestions; backend authorization/status validation remains authoritative (`frontend/src/pages/user/Dashboard.jsx:131-145,189-192`).
- Profile transmits PII/avatar only to fixed same-origin authenticated endpoints and does not itself write user data to localStorage; the “Update Redux state & LocalStorage” comment is stale because the code only dispatches Redux state (`frontend/src/pages/user/Profile.jsx:74-101`). Accessibility preferences are non-account UI settings. Avatar files are browser-compressed, but `accept="image/*"` is advisory and object URLs are not revoked (`:120-139,234-241`); retain server type/size validation and revoke replaced previews as defensive resource hardening.

## Frontend handover verification and report create/edit entrypoint shard

The following files were fully read line-by-line: `frontend/src/pages/protected/VerifyResolution.jsx`, `frontend/src/pages/user/EditFoundItem.jsx`, `frontend/src/pages/user/EditLostItem.jsx`, `frontend/src/pages/user/ReportFound.jsx`, and `frontend/src/pages/user/ReportLost.jsx`.

No new standalone security root was promoted. These entrypoints strengthen existing findings and close the requested boundaries:

### HW-01 validation update — Verification UI cannot identify or bind the approved handover tuple

- `VerifyResolution` loads and mutates only `{type,id}` from the route. Its confirmation prompt shows only item type/name and status; it never loads, displays, or sends an approved `claimId`, `matchId`, reciprocal report id, or connected-party identity (`frontend/src/pages/protected/VerifyResolution.jsx:15-52,103-124`). Cancellation likewise sends only item id plus reason (`:61-79,136-143`).
- This makes the frontend incapable of closing existing `HW-01`: the backend item-level workflow selects an arbitrary confirmed match rather than the approved claim connection. A participant cannot verify which relationship “Yes” will resolve, and the request supplies no binding value for the server to validate (`backend/services/itemWorkflowService.js:18-44,51-84`).
- Countercontrols: the page is behind `ProtectedRoute`; the backend reloads the item, requires `in_progress`, and independently authorizes admin, report owner, or `connectedUserId`. Nonparticipants who navigate to a public in-progress id can see the prompt but receive a server 403 on mutation (`backend/services/itemWorkflowService.js:13-27,57-60`). This is not a new client-side authorization bypass.
- Cancellation reasons are not client-only: the UI enforces 5–1,000 characters and the backend route validator independently enforces the same bound before persistence (`frontend/src/pages/protected/VerifyResolution.jsx:61-72,139`; `backend/utils/validators.js:576-581`). Direct API callers cannot omit the reason.

### DR-01/MI-01 reachability update — All four report entrypoints converge on the same draft and privacy boundary

- Create wrappers instantiate the shared wizard with only fixed `lost`/`found` mode; edit wrappers add the route-supplied item id (`frontend/src/pages/user/ReportLost.jsx:1-5`; `frontend/src/pages/user/ReportFound.jsx:1-5`; `frontend/src/pages/user/EditLostItem.jsx:1-10`; `frontend/src/pages/user/EditFoundItem.jsx:1-10`). All are nested under `ProtectedRoute` (`frontend/src/App.jsx:163-177`).
- This confirms existing `DR-01` reaches both create routes: the wizard restores the global assistant session draft before any account/freshness check. Normal create/edit autosave is better isolated by mode, operation/item id, and current user id; it stores only form text/step, not image bytes (`frontend/src/components/common/ReportItemWizard.jsx:78,133-188`). Drafts are removed after success or explicit clear (`:417-434,483`).
- Normal drafts have no TTL and persist through logout until success/manual clearing. They can contain exact locations and identifying attributes. User-id namespacing prevents ordinary in-app account-B restoration, but shared-device storage inspection/retention remains privacy hardening; add expiry plus logout/account-deletion cleanup without weakening offline recovery.
- All four pages inherit existing `MI-01`: new images use the wizard review flow, but provider failure can be self-confirmed without transformation and direct authenticated API uploads bypass the browser workflow entirely. Edit mode also treats already-stored images as existing without rescanning them (`frontend/src/components/common/ReportItemWizard.jsx:171-174,238-352,616-640`). The authoritative fix remains secure original storage plus a server-generated/privacy-approved public derivative.
- AI image values are not silently written into populated reports: the wizard stores the first suggestion separately and exposes explicit per-field/**Apply all** controls; image-derived suggestions are created only when both item name and description are empty (`frontend/src/components/common/ReportItemWizard.jsx:223-236,280,299,640`). The assistant-draft auto-merge remains the separately recorded `DR-01` handoff behavior.

## Duplicate-submit and direct-API counterevidence

- Report submit sets loading before dispatch; the shared `Button` disables itself for either `isLoading` or `loading`, so ordinary repeated clicks are fenced after the discrete React event flush (`frontend/src/components/common/ReportItemWizard.jsx:449-490,739-749`; `frontend/src/components/common/Button.jsx:8-21,42-50`). Resolution/cancellation buttons likewise disable while processing (`frontend/src/pages/protected/VerifyResolution.jsx:48-79,123-143`). Backend workflow transactions recheck current state, limiting repeated finalization.
- The report-create API has no idempotency key, per-user report quota, or duplicate uniqueness constraint. Each accepted direct/retried request uploads media, inserts another public report, and enqueues processing; duplicate assessment is advisory rather than a create rejection (`backend/controllers/lostItemController.js:38-72`; `backend/controllers/foundItemController.js:38-73`). Keep as abuse/performance hardening under authentication/global limiting unless validation demonstrates provider/storage/queue impact; client button state is not an authoritative abuse control.
- Edit route ids and report types originate from URL parameters, but server routes validate Mongo ids, authenticate mutations, and controllers require owner/admin before changing reports. The edit wrappers add no client-selected principal or status field, so changing the URL cannot create an IDOR despite the public detail fetch used to initialize the wizard.
