# Finding Discovery — Repository-wide ecf54c1

Status: in progress. Candidates are plausible discovery items, not validated findings.

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
- Impact: provider charges, outbound bandwidth, base64 memory amplification, and service degradation. The generic 300-per-15-minute IP limit is high for a billed vision operation and inherits the open proxy-trust/topology question in RP-01.
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
