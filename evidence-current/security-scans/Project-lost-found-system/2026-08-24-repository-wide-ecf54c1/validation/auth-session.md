# Auth, session, and account validation

Validated target: `7499a19c41f8a333cf9580e619a76d3af4a8f009`  
Validation date: 2026-08-24  
Method: current-source trace plus targeted Node tests and one deterministic contract probe. No live provider, browser credentials, or Mongo replica-set URI was available; those limits are called out per instance.

## Closure matrix

| ID | Instance | Root line | Confidence | Method | Rubric | Disposition | Survives |
|---|---|---|---|---|---:|---|---|
| SR-01 | `session-revocation` | `backend/middlewares/authMiddleware.js:14` | high | static complete trace | 5/5 | reportable | yes |
| RR-01 | `refresh-reuse-rollback` | `backend/services/sessionService.js:55` | high | static transaction trace; DB test unavailable | 4/5 | reportable | yes |
| RR-02 | `refresh-reuse-race` | `backend/services/sessionService.js:49` | medium-high | static concurrency trace | 4/5 | reportable | yes |
| RR-03 | `refresh-expiry-extension` | `backend/services/sessionService.js:79` | high for behavior; medium for policy severity | static lifetime trace | 4/5 | reportable | yes |
| ST-01 | `session-termination` | `frontend/src/services/authService.js:45` | high | static end-to-end client/server trace | 4/5 | reportable | yes |
| RS-01 | `account-bound-redux-state` | `frontend/src/redux/store.js:17` | medium-high | static state/lifecycle trace | 4/5 | reportable | yes |
| AC-01 | `last-admin-write-skew` | `backend/services/accountService.js:16` | high | static transaction trace | 4/5 | reportable | yes |
| AC-02 | `password-session-revocation` | `backend/controllers/userController.js:50` | high | static failure-order trace | 4/5 | reportable | yes |
| AC-03 | `account-deletion-claim-retention` | `backend/services/accountService.js:65` | high | current-schema and workflow trace | 5/5 | not_applicable | no |
| AC-04 | `account-deletion-report-retention` | `backend/services/accountService.js:45` | high | static data-lifecycle trace | 5/5 | reportable | yes |
| PW-01 | `password-validator-contract` | `frontend/src/pages/user/Profile.jsx:145` | high | static trace plus deterministic runtime probe | 5/5 | reportable | yes |

No reviewed candidate remains deferred. The missing replica-set/browser runs reduce exploit-demonstration strength for RR-01, RR-02, ST-01, RS-01, AC-01, and AC-02, but their current-source paths and concrete preconditions are complete enough to retain. AC-03 is closed against the current schema rather than deferred.

## SR-01 — access JWTs survive refresh-session revocation

- Instance/root: `session-revocation:backend/middlewares/authMiddleware.js:14`.
- Method: complete static trace from token minting through protected-route authorization and logout/password-change revocation.
- Rubric: (1) reachable through any protected route using a previously minted access cookie/bearer token; (2) `issueAccessToken` includes no session id, family id, token version, or `jti` (`backend/services/sessionService.js:11-15`), while `loadUser` verifies only signature/issuer and current user activity (`backend/middlewares/authMiddleware.js:13-17`); (3) logout and password change revoke only `RefreshSession` rows (`backend/services/sessionService.js:119-126`); (4) a stolen pre-revocation access JWT continues authorizing requests until expiry while the user remains active; (5) inactive/deleted-user lookup and the default 15-minute expiry are real bounds, but neither gives immediate logout/password-change revocation.
- Counterevidence/uncertainty: `JWT_ACCESS_EXPIRE` defaults to `15m`; its cookie lifetime is parsed and clamped, but the raw JWT expiry string is not maximum-bounded by `validateSecurityEnvironment` (`backend/config/security.js:34-36,55-75`). Deployment may use a shorter value, but no provider configuration was part of this validation.
- Disposition: **reportable** (CWE-613). Add a server-checked session/token version or denylist binding and a regression test proving an old access token fails after logout and password reset/change.

## RR-01 — reuse detection revocation is aborted with its transaction

- Instance/root: `refresh-reuse-rollback:backend/services/sessionService.js:55`.
- Method: static Mongo transaction control-flow trace; the repository's replica-set test was invoked but skipped because no integration URI/opt-in was configured.
- Rubric: (1) reachable by replaying a refresh token already consumed by a successful rotation; (2) the reuse branch revokes the family at lines 56-62, then throws `ApiError` at line 64 inside `withTransaction` lines 99-103; (3) the closest control is the family `updateMany`, but the catch rethrows `ApiError` at line 105 instead of committing that write; (4) aborting the transaction rolls back the intended revocation, so the successor held by an attacker remains active; (5) the existing integration test encodes the desired invariant of zero active family sessions, but it did not execute in this environment.
- Counterevidence/uncertainty: atomic consumption prevents two successful direct uses of the same token; it does not preserve the family-revocation write after the deliberate exception. Runtime confirmation requires a Mongo replica set.
- Disposition: **reportable** (CWE-613). Persist reuse compromise outside the transaction that is intentionally aborted, or return a committed compromise result and throw only after commit; run `backend/tests/database.integration.test.js` with an isolated replica-set database.

## RR-02 — nontransaction fallback permits a successor/revocation race

- Instance/root: `refresh-reuse-race:backend/services/sessionService.js:49`.
- Method: static interleaving analysis of the explicit nontransaction fallback.
- Rubric: (1) reachable when `startSession`/`withTransaction` raises a non-`ApiError`, because line 106 retries the security-sensitive rotation without a session; (2) request A can atomically consume the old token, request B can observe it as reused and revoke the then-existing family, and A can insert its successor afterward at lines 77-92; (3) atomic `findOneAndUpdate` prevents two winners but no family compromise tombstone or insert-time fence covers the later successor; (4) the winning successor remains refresh-capable after detected replay; (5) production defaults require replica-set support and startup tests that capability, reducing normal-path likelihood, but transient transaction failure still selects the fallback and the existing DB test does not force this branch.
- Counterevidence/uncertainty: no synchronized forced-fallback harness was run, so the precise race was not observed against Mongo. The interleaving depends on two concurrent requests and a nontransaction fallback event.
- Disposition: **reportable** (CWE-362, CWE-613). Fail closed instead of silently downgrading rotation, or use a persistent family-compromised record checked atomically by successor creation; add a forced-fallback concurrency test.

## RR-03 — rotation moves the configured expiry forward

- Instance/root: `refresh-expiry-extension:backend/services/sessionService.js:79`.
- Method: deterministic static lifetime calculation.
- Rubric: (1) reachable through ordinary refresh before expiry; (2) remaining fractional days are rounded up at line 79 and the successor is assigned `Date.now() + remainingDays` at line 90 rather than the predecessor/family absolute expiry; (3) initial 1-90 day clamps and the unexpired-token predicate bound each individual token only; (4) repeated rotation can continually extend family lifetime and therefore attacker persistence; (5) no `familyExpiresAt`, absolute-session policy, or test preserving the original expiry was found.
- Counterevidence/uncertainty: sliding sessions may be a desired product behavior. The repository specifies token-day settings (`backend/.env.example:21`, `backend/config/security.js:37-39`) but contains no approved maximum family-lifetime statement. That policy ambiguity caps severity, not the confirmed unbounded extension behavior.
- Disposition: **reportable** (CWE-613). Store an immutable family expiry and clamp every successor to it; add a fake-clock test covering fractional-day rotations.

## ST-01 — failed server logout is presented as successful logout

- Instance/root: `session-termination:frontend/src/services/authService.js:45`.
- Method: static trace from logout UI through Axios, Redux, server revocation, and subsequent session bootstrap.
- Rubric: (1) reachable when `/auth/logout` fails before server processing due to network, CSRF bootstrap, request blocking, or API failure; (2) `authService.logout` catches every error and resolves (`frontend/src/services/authService.js:44-46`), so `logoutUser.fulfilled` clears only auth Redux state (`frontend/src/redux/slices/authSlice.js:18,44`), and Navbar navigates immediately without awaiting/unwrap (`frontend/src/components/layout/Navbar.jsx:74-77`); (3) HttpOnly cookies cannot be cleared locally, and no compensating `/auth/me` verification occurs; (4) a reload/later visit on a shared browser can restore the still-valid server session; (5) when the server did process logout and only the response was lost, refresh revocation/cookie clearing may already be safe, but pre-processing failures remain uncovered.
- Counterevidence/uncertainty: no authenticated browser credential was available to block the endpoint and reload. Existing E2E auth/logout is environment-gated and does not cover logout failure.
- Disposition: **reportable** (CWE-613). Propagate failure, await/unwrap callers, show a truthful retry state, and verify server termination before presenting security logout as complete.

## RS-01 — account-private Redux state is not reset or principal fenced

- Instance/root: `account-bound-redux-state:frontend/src/redux/store.js:17`.
- Method: static root/slice/request-lifecycle trace.
- Rubric: (1) reachable in one SPA lifetime when account A loads private data, logs out, and account B signs in, or when an A request settles after principal change; (2) the root reducer directly combines slices and never resets them on logout (`frontend/src/redux/store.js:17-28`), while logout clears only `auth` (`frontend/src/redux/slices/authSlice.js:44`); (3) private notifications, matches, claims/contact responses, admin user/audit data, and owned report state have no account-bound reset, and fulfilled reducers accept responses without principal/generation/request ownership checks; (4) B can briefly or persistently see A's retained notification/match/claim/admin/report state if replacement is pending, fails, or an old response lands late; Navbar keeps old notification messages during the B fetch because the pending reducer changes only loading/error (`frontend/src/components/layout/Navbar.jsx:57-68`; `frontend/src/redux/slices/notificationSlice.js:78-95`); (5) protected-route unmounts/full reloads reduce exposure, but they do not reset the singleton Redux store or fence late completions.
- Counterevidence/uncertainty: the earlier socket-based normal-logout subclaim is **suppressed**: `useSocket` disconnects when `user` disappears and again in effect cleanup (`frontend/src/hooks/useSocket.js:19-27,72-77`). This retained finding rests on deterministic Redux/HTTP lifecycle paths, not normal post-logout socket ingress. A browser A-to-B timing reproduction was unavailable.
- Disposition: **reportable** (CWE-359, CWE-488). Reset all account-bound slices synchronously on principal/session generation change and reject/cancel older HTTP and auth completions.

## AC-01 — last-admin check is vulnerable to write skew

- Instance/root: `last-admin-write-skew:backend/services/accountService.js:16`.
- Method: static transaction/invariant trace.
- Rubric: (1) reachable when exactly two active admins concurrently call authenticated self-deletion (`backend/routes/userRoutes.js:24-30`), with current passwords where applicable (`backend/controllers/userController.js:94-102`); (2) each transaction counts two admins and then updates a different `User` document (`backend/services/accountService.js:14-29,109-127`); (3) per-request transactions and sequential `count <= 1` protection do not create a shared write conflict or database invariant; (4) both commits can leave zero active administrators, blocking privileged recovery/review operations; (5) authentication, current-password verification, and sequential deletion protection materially narrow preconditions but do not close the concurrent case.
- Counterevidence/uncertainty: no synchronized replica-set test was available, so this was not reproduced against the configured Mongo deployment.
- Disposition: **reportable** (CWE-362, CWE-367). Serialize admin-count changes through a shared guard document/lock or enforce an equivalent durable invariant, then add a two-admin concurrent deletion test.

## AC-02 — password mutation can commit without session revocation

- Instance/root: `password-session-revocation:backend/controllers/userController.js:50`.
- Method: static failure-order trace.
- Rubric: (1) reachable through authenticated `PUT /users/change-password` when a database/error fault occurs after `user.save()`; (2) password commits at lines 49-50 before refresh revocation at line 51 and cookie clearing at line 52; (3) refresh expiry and immediate normal-path revocation are the closest controls, but no transaction/compensation joins the operations; (4) a stolen refresh token can remain usable even though the legitimate password change committed and the API returned an error; (5) retry with the new password can later revoke sessions, but users may reasonably treat the failed response ambiguously and the attacker window remains.
- Counterevidence/uncertainty: no fault-injected Mongo run was performed. The same ordering pattern also exists in reset-password flow, but this instance is scoped to the requested change-password candidate.
- Disposition: **reportable** (CWE-613, CWE-664). Make credential versioning authoritative for access/refresh validation or commit password mutation and session invalidation atomically; add a post-save revocation-failure test.

## AC-03 — cancelled/other claim-status cleanup gap is not reachable

- Instance/root: `account-deletion-claim-retention:backend/services/accountService.js:65`.
- Method: current model enum plus workflow transition trace.
- Rubric: (1) the proposed source requires a claimant record in a terminal status other than pending/approved/rejected; (2) `ClaimRequest.status` permits only those three values (`backend/models/ClaimRequest.js:87-95`); (3) current cancellation workflow maps cancellation to `rejected`, which account deletion scrubs at `backend/services/accountService.js:86-90`; (4) no current route/model path can create the candidate `cancelled` status; (5) pending/approved participant records and rejected claimant records have evidence/contact fields cleared, and all claimant proof media is collected for provider deletion.
- Counterevidence/uncertainty: legacy out-of-schema documents would be a migration/data-quality concern, not a current reachable entrypoint; no evidence of such production rows was available.
- Disposition: **not_applicable / suppressed** on target `7499a19`. If a future schema adds statuses, make cleanup status-independent for claimant evidence and add migration tests.

## AC-04 — deleted-account report metadata remains account-linked

- Instance/root: `account-deletion-report-retention:backend/services/accountService.js:45`.
- Method: complete static data-lifecycle trace across models, account service, cleanup job, API claim, and draft policy.
- Rubric: (1) reachable whenever a deleting user owns lost/found reports with authored descriptions, exact locations, unique features, or custody location; (2) deletion only archives/soft-deletes/disconnects reports and clears images (`backend/services/accountService.js:32-54`), leaving `userId`, item metadata, `lostLocation`/`foundLocation`, `uniqueFeatures`, and found `storedAt` in Mongo (`backend/models/LostItem.js:10-76`; `backend/models/FoundItem.js:10-92`); (3) public queries excluding deleted/archived rows and direct User-field anonymization reduce ordinary exposure, but do not anonymize the stored report; (4) administrative/database access or compromise still exposes authored sensitive data linked to the pseudonymized user after the response says personal data was anonymized (`backend/controllers/userController.js:102-104`); (5) the cleanup job does not close this path: account deletion immediately sets `isArchived: true`, while cleanup selects only `isArchived != true`, and even its normal action clears only images/description (`backend/jobs/cleanupJob.js:10-24`).
- Counterevidence/uncertainty: claim/audit integrity can justify limited pseudonymized retention, but the current policy is explicitly an unapproved draft with placeholder periods and requires records to be anonymized (`docs/public/DATA_RETENTION_AND_DELETION_POLICY.md:3-5,10-24`). No approved field-level retention schedule was available.
- Disposition: **reportable** (CWE-200, CWE-359, CWE-459). Define the approved field-level schedule and scrub/tokenize authored PII and the account link at deletion or a reliably scheduled deadline; make the API response accurately describe any retained data.

## PW-01 — Profile blocks every password rotation

- Instance/root: `password-validator-contract:frontend/src/pages/user/Profile.jsx:145`.
- Method: static producer/consumer trace plus direct Node execution of the producer and consumer destructuring.
- Rubric: (1) reachable on every Profile password-change submission; (2) `validatePassword` returns a boolean (`frontend/src/utils/validators.js:18-24`) but Profile destructures `{ isValid, message }`, so `isValid` is always `undefined` and lines 146-149 return before the API call; (3) backend password-change validation remains authoritative and the direct API is available, but the normal UI cannot reach it; (4) users cannot rotate a known/compromised credential through the product UI; (5) runtime probe with `StrongPassword!123` returned `{result:true,type:"boolean",isValid:null,consumerBlocks:true}`. The passing frontend static test only regex-checks password-policy source and does not exercise this contract (`frontend/tests/security.test.mjs:52-59`).
- Counterevidence/uncertainty: this is not an authorization bypass; it is deterministic security-relevant availability/usability.
- Disposition: **reportable**. Align the validator contract (boolean consumer or structured producer) and add a component test proving valid input calls `PUT /users/change-password` while invalid input does not.

## Commands and observed evidence

```text
git rev-parse HEAD
=> 7499a19c41f8a333cf9580e619a76d3af4a8f009

cd backend
node --test tests/static-security.test.js tests/security.test.js
=> 20 passed, 0 failed, 0 skipped

node --test tests/database.integration.test.js
=> 0 passed, 0 failed, 1 skipped
   concurrent refresh reuse revokes the complete session family # SKIP

cd ../frontend
node --test tests/security.test.mjs
=> 7 passed, 0 failed, 0 skipped

node --input-type=module -e "import { validatePassword } from './src/utils/validators.js'; const result=validatePassword('StrongPassword!123'); const {isValid,message}=result; console.log(JSON.stringify({result,type:typeof result,isValid:isValid??null,message:message??null,consumerBlocks:!isValid}));"
=> {"result":true,"type":"boolean","isValid":null,"message":null,"consumerBlocks":true}
```

The passing static suites are counterevidence only for the controls they actually assert. They do not cover access-token invalidation, logout-request failure, Redux account switching, last-admin concurrency, post-password-save revocation failure, field-level account erasure, or the Profile validator consumer contract.
