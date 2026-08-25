# Phase 3 validation shard — suppressed candidates and clean boundary families

- Target: `7499a19`
- Method: current-source source/sink trace and existing focused regression tests.

## SD-01 / SD-02 / SD-03 — selected User secrets are not serialized

Rubric: response entrypoints traced; explicitly selected secret fields identified; final serializer checked; test counterevidence reviewed; alternate response sinks searched.

- Registration/login/Google login return Mongoose `User` documents through `ApiResponse`; password login and Google login explicitly select normally hidden fields for verification/linking.
- `User.toJSON()` deletes password, Google id, verification/reset hashes and expiry, login lock state, push subscription, and version (`backend/models/User.js:57-64`) before JSON serialization.
- No alternate raw-object spread/`lean()` response path was found for these three auth responses.
- Disposition: **suppressed**, high confidence.

## OR-01 — assistant/navigation URLs remain internal

Rubric: caller-controlled URL provenance traced; every link sink checked; normalization tested; fixed backend constructors inspected; router advisory considered separately.

- Backend assistant actions/results construct fixed internal prefixes and database ObjectIds (`aiChatController.js:56-71,150-165,215,235`).
- Frontend Markdown/action/result links pass through `toSafeInternalPath`; login return paths use the same helper. It rejects external, scheme-relative, backslash, control-character, and encoded-separator inputs (`internalNavigation.js`; passing `runtime-hardening.test.mjs`).
- Notification-derived links are either fixed by item type/id or sanitized in Navbar.
- Disposition: **suppressed as an application open-redirect finding**, high confidence. Installed React Router advisory exposure remains separately tracked as `DEP-NPM-01` because package-range risk is broader than the currently identified sinks.

## MA-LI-01 / MA-LI-02 / MA-FI-01 / MA-FI-02 — report bodies do not mass-assign privileged state

Rubric: create/update entrypoints traced; privileged fields enumerated; controller assignment checked; model defaults checked; direct API bypass considered.

- Lost/found create controllers build explicit object literals and force `userId`, workflow status, and `contactVisibility:'request_only'` (`lostItemController.js:38-64`; `foundItemController.js:38-65`).
- Update controllers assign a fixed list of editable descriptive fields and again force contact visibility; they do not spread `req.body` or accept caller status/owner/connection/deletion/archive fields (`lostItemController.js:108-145`; `foundItemController.js:109-147`).
- Ownership/admin authorization and allowed workflow states are checked server-side before update.
- Disposition: **suppressed**, high confidence.

## MM-01 — Match principals are derived from canonical item owners

Rubric: all runtime match writers identified; principal fields traced; mutability checked; authorization consumers checked; alternate writers searched.

- Runtime matching creates `lostUserId`/`foundUserId` from the referenced reports, not request bodies (`aiMatchingService.js:108-121`).
- Report ownership is not editable through report updates; match status routes authorize against stored principals.
- No user-controlled match-creation endpoint or alternate principal writer was found. The handover selection bug is distinct and remains `HW-01`.
- Disposition: **suppressed**, high confidence.

## AUTH-02 clean control — Google identity verification/account binding

Rubric: token verification traced; audience/email verification checked; conflicting binding checked; uniqueness controls checked; response serialization checked.

- `googleClient.verifyIdToken` verifies the configured audience; controller requires subject, email, and `email_verified===true` (`authController.js:154-159`).
- Existing accounts with a different stored Google subject are rejected (`174-176`); provider subject and email are unique model fields, and secret values are removed by `toJSON`.
- Disposition: **suppressed / no candidate**, high confidence. Email-based linking intentionally trusts Google's verified-email assertion.

## AUTH-04 clean control — reset/verification tokens

Rubric: public entrypoints traced; token creation/storage checked; enumeration checked; consumption/replay checked; session effects checked.

- Opaque verification/reset values are hashed at rest; lookup uses hash plus expiry; success clears token fields. Forgot/resend responses are account-enumeration neutral. Reset links carry the value in a URL fragment rather than query/log path.
- Password reset revokes refresh sessions and clears auth cookies on the normal path. Post-password-save atomicity is tracked separately as `AC-02`.
- Disposition: **suppressed / no additional candidate**, high confidence.

## HTTP-01 / BROWSER-01 / BROWSER-03 clean controls

Rubric: global middleware order checked; browser HTML/Markdown sinks searched; service-worker cache/navigation boundaries traced; negative tests reviewed; residual candidates split out.

- Global API order applies CORS/credentials, rate limiting, CSRF, body parsing/sanitization, then routers; explicit health/preflight behavior is separated. Config-specific gaps remain `CF-*`/`RP-01`.
- No `dangerouslySetInnerHTML`/raw `innerHTML` application sink was found. React escapes ordinary text; ReactMarkdown replaces links with a same-origin-safe renderer. Email HTML uses escaping and safe URLs; email header behavior is separately assessed under `ED-*`.
- `sw.js` caches only same-origin GET script/style/font/image/manifest responses, excludes API/Socket.IO, and converts push navigation to a same-origin path before `openWindow`.
- Disposition: **suppressed / no additional candidate**, high confidence.

## NET-01 / NET-03 clean controls

Rubric: outbound URL sources traced; request-controlled URL inputs searched; allowlists/schemes checked; private-media provenance checked; provider-disabled behavior checked.

- AI provider base URLs are operator configuration, not request values; prompts treat user/image text as untrusted and bound request attempts/timeouts/schema parsing. Public chat cannot execute privileged application actions.
- Image comparison receives Cloudinary-origin report analysis URLs and enforces safe remote HTTPS image URL checks; claim proof delivery uses authenticated Cloudinary assets and signed views.
- Public report-media privacy/deletion issues remain `MI-01/MI-02`; they are not SSRF findings.
- Disposition: **suppressed / no additional SSRF or provider credential-leak candidate**, high confidence.

## BROWSER-02 mixed closure

- Open redirect candidate `OR-01`: suppressed above.
- Cookie/CSRF bootstrap and safe same-origin production defaults: effective.
- Session/logout/state lifecycle defects `ST-01`, `RS-01`, and `RR-UI-01`: reportable in their dedicated validation shards.
- Disposition: **reportable family because surviving instances exist**.

No source or provider state was changed.
