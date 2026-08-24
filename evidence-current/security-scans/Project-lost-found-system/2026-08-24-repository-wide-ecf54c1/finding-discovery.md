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

## AI chat, report wizard, upload, and evidence-display shard

The following files were fully read line-by-line: `frontend/src/components/common/AIChatbot.jsx`, `frontend/src/components/common/ReportItemWizard.jsx`, `frontend/src/components/common/ImageUpload.jsx`, `frontend/src/components/common/ItemEvidenceSummary.jsx`, and `frontend/src/components/common/MatchExplanation.jsx`.

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
