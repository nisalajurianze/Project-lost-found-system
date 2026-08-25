# Deployment, configuration, email, background, bootstrap, and pagination validation

**Validated revision:** `7499a19c41f8` (`7499a19`)  
**Validation date:** 2026-08-24  
**Scope:** `CF-01..06`, `DEP-01..05`, `ED-01..06`, `BG-01..08`, `BM-01..05`, `PG-01`, plus `RP-01`, `PS-01`, and `NP-01`  
**Mutation boundary:** source/configuration was not edited. This file is the only artifact produced by this validation shard.

## Method and disposition rules

Every candidate was re-traced in the current checkout against five gates:

1. **R — reachable entrypoint:** an attacker, ordinary user, operator, worker, or deployment event can reach the source under stated preconditions.
2. **T — complete trace:** source -> trust/control boundary -> security- or reliability-relevant sink is complete.
3. **C — closest control:** the nearest countercontrol and its limitations were examined.
4. **I — concrete impact:** impact and required preconditions are concrete rather than hypothetical.
5. **P — proof:** current-source, installed-library, automated-test, or bounded runtime proof exists; target-provider facts are not inferred.

Rubric notation below is `R/T/C/I/P`: `Y` = satisfied, `N` = disproved, `?` = a material fact is unavailable, and `E` = only external/provider evidence can close the gate.

| Disposition | Count | Meaning |
|---|---:|---|
| Reportable | 21 | Complete current-source/runtime trace with concrete conditional impact. |
| Suppressed | 5 | A current countercontrol, caller inventory, or exact-artifact check breaks reachability/trace. |
| Deferred | 8 | The code condition exists, but a required entrypoint, target topology, provider behavior, or concrete impact is not proven. |
| **Total** | **34** | Every assigned candidate is closed individually below. |

## Configuration and realtime (`CF`)

| ID | Disposition | R/T/C/I/P | Current closure |
|---|---|---|---|
| CF-01 | **Reportable** | Y/Y/Y/Y/Y | Production does not make Redis mandatory by default (`backend/config/security.js:50`). Startup and readiness accept an unavailable Redis when that flag is false (`backend/server.js:50,94,101`); the global limiter then uses process memory and Socket.IO has no Redis adapter. On two or more backend instances, limits multiply per instance and realtime rooms are instance-local. Documentation saying Redis is required in production is advisory, not an enforced default. Preconditions: production flag omitted/false plus horizontal scaling or Redis outage. |
| CF-02 | **Reportable** | Y/Y/Y/Y/Y | `asBool` treats every non-empty value outside four exact truthy strings as false and does not trim (`backend/config/security.js:1-4`). A bounded runtime import with `REQUIRE_EMAIL_PROVIDER=tru` and `REQUIRE_REDIS=' true '` produced both flags as `false`; required dependencies can therefore be silently disabled by a typo/whitespace. Startup checks cannot recover because they consume the already-false flags. |
| CF-03 | **Deferred — external deployment evidence** | ?/Y/Y/Y/E | Production validates only presence of `MONGO_URI`, not TLS scheme/options (`backend/config/security.js:57-58`; `backend/config/db.js:4-16`). Compose uses plaintext Mongo only on an `internal: true` network, which is a relevant local countercontrol. The actual Railway/production URI, Atlas TLS state, private-network routing, and certificate verification are unavailable; do not claim exposed plaintext transport without redacted target configuration/connection evidence. |
| CF-04 | **Deferred — external deployment evidence** | ?/Y/Y/Y/E | `REDIS_URL` is presence-checked only when required; no `rediss:`/authentication policy exists (`backend/config/security.js:68`; `backend/config/redis.js:13-46`). Compose does require a password and isolates Redis internally (`docker-compose.yml:25-33,55,124-127`). Actual managed Redis URL, TLS mode, ACL, and network exposure are external, so current target compromise is unproven. |
| CF-05 | **Reportable** | Y/Y/Y/Y/Y | Cookie-authenticated Socket.IO accepts both polling and direct WebSocket, but configuration has CORS only and no Engine.IO `allowRequest`/explicit Origin rejection (`backend/config/socket.js:13,22-35`). Polling CORS is useful counterevidence; direct WebSocket handshakes are not browser-CORS protected. A bounded local handshake with only `https://good.example` allowlisted connected successfully over direct WebSocket while sending `Origin: https://evil.example` and a valid cookie. With production cross-site cookies (`SameSite=None; Secure`), a malicious origin can read private realtime notification events. Preconditions: victim session cookie is sent and the target browser/network permits the cross-site handshake. |
| CF-06 | **Reportable** | Y/Y/Y/Y/Y | JWT, active state, and role are checked only at handshake, then copied into rooms (`backend/config/socket.js:22-35`). There is no expiry timer, periodic revalidation, or server-side disconnect on logout, password reset, deactivation, deletion, or demotion. A bounded local test connected with a one-second JWT, waited 1.6 seconds, then received a user-room notification while still connected. The frontend hook disconnects when its local user becomes absent, which closes ordinary successful client logout, but it does not close remote administrative deactivation/demotion or server-side token expiry. The current sink is user-room notification delivery (`backend/services/notificationService.js:86-87`); admin-room delivery is latent because no caller of `emitToAdmins` was found. |

## Deployment and CI (`DEP`)

| ID | Disposition | R/T/C/I/P | Current closure |
|---|---|---|---|
| DEP-01 | **Deferred** | ?/?/Y/Y/Y | Compose attaches the public frontend proxy to both `edge` and the Mongo/Redis/backend `internal` network (`docker-compose.yml:109-112`), and Mongo itself has no authentication. However, the frontend image is unprivileged, read-only Nginx with no demonstrated request-to-code-execution or file-write primitive. A compromised frontend process would gain lateral reach, but that prerequisite is not established by this candidate. Network segmentation should still place the proxy only with the backend and keep data services backend-only. |
| DEP-02 | **Deferred — external provider evidence** | E/Y/Y/Y/E | The repository workflow is manual, approval-environment gated, and build-only (`push: false` in `.github/workflows/deploy.yml`); it does not deploy. Vercel/Railway project source connections, branch filters, production approval requirements, and auto-deploy state are provider settings absent from Git. Provider screenshots/API exports and an exact deployed commit are required. |
| DEP-03 | **Deferred — deployment-scope misuse** | ?/Y/Y/Y/E | Compose explicitly forces development, insecure cookies, optional cloud/email, and publishes the frontend port on all host interfaces (`docker-compose.yml:51-63,105-106`). README describes it as `http://localhost:3000`, but the bind is not loopback-enforced. This is acceptable only for a trusted local workstation/network; exposure on a shared/LAN/public host would provide a non-production security profile. Host firewall/bind evidence determines applicability. |
| DEP-04 | **Reportable** | Y/Y/Y/Y/Y | The whole security workflow receives `security-events: write`, while the secret-scan job executes mutable third-party `gitleaks/gitleaks-action@v2` and explicitly passes `GITHUB_TOKEN` (`.github/workflows/security.yml:12-14,33-35`). On push/schedule/manual runs, compromise or retagging of that action can use a broader token than the job needs and falsify/exfiltrate scan context. Pin the action by full commit and set permissions per job (secret scan normally needs only `contents: read`). |
| DEP-05 | **Suppressed for the exact artifact** | N/N/Y/N/Y | Nginx's static-extension regex precedes the dotfile deny (`frontend/nginx.conf:52-65`), so a hidden file ending in a listed extension would be served. Exact `7499a19` inventory contains only `logo.png`, `manifest.json`, `robots.txt`, and `sw.js` under `frontend/public`; current `frontend/dist` contains no dot-prefixed file. No disclosure object exists in the built input/artifact, so this candidate is not currently reportable. Keep an ordering regression test or move the deny rule before static handling. |

## Email and settings (`ED`)

| ID | Disposition | R/T/C/I/P | Current closure |
|---|---|---|---|
| ED-01 | **Reportable** | Y/Y/Y/Y/Y | SMTP transport sets `secure` only for port 465 and does not set `requireTLS` (`backend/services/emailService.js:91-100`). Installed Nodemailer starts TLS only when advertised unless `requireTLS` is true (`backend/node_modules/nodemailer/lib/smtp-connection/index.js:1466-1510`); otherwise authentication can proceed on plaintext SMTP. Preconditions: SMTP configured on 25/587 and a server/MITM suppresses STARTTLS. Require TLS (and validate certificates), or document an explicitly trusted TLS-wrapped provider. |
| ED-02 | **Reportable** | Y/Y/Y/Y/Y | Stable idempotency keys are forwarded only to Resend; SMTP `sendMail` ignores them (`backend/services/emailService.js:149-158`). The reminder job retries the whole participant set whenever any participant operation fails (`backend/jobs/reminderJob.js:25-49`), so an SMTP success followed by another failure can resend the same message next run. There is no application delivery ledger/provider message-id fence. Impact is duplicate workflow email, confusion, and repeated disclosure to the same mailbox; provider-side dedupe is unproven. |
| ED-03 | **Reportable (configuration-dependent)** | Y/Y/Y/Y/Y | With provider absent, `sendEmail` fulfills with `false` rather than rejecting (`backend/services/emailService.js:139-145`). `sendWorkflowEmail` preserves that result, but the reminder uses only promise fulfillment and may mark `reminderSent=true` (`backend/jobs/reminderJob.js:25-49`). Durable in-app notification is a countercontrol, and production defaults `REQUIRE_EMAIL_PROVIDER` to true, but `CF-02` or an explicit false setting makes readiness accept this state. Impact: operators can believe email-dependent handling completed when no email was attempted. |
| ED-04 | **Suppressed** | Y/N/Y/N/Y | Item names can contain CR/LF because item validators bound/trim length without an explicit newline ban, and templates place the value in Subject. However, installed Nodemailer normalizes every default header value by replacing CR/LF with spaces before folding (`backend/node_modules/nodemailer/lib/mime-node/index.js:1100-1169`). The SMTP sink therefore does not preserve an injected header boundary. Retain a regression test and local subject normalization as defense in depth. |
| ED-05 | **Reportable** | Y/Y/Y/Y/Y | Outbox TTL applies only to `completed` rows (`backend/models/OutboxEvent.js:20`). `dead` events and their item identifiers, attempts, timestamps, and up-to-2,000-character `lastError` remain indefinitely (`backend/models/OutboxEvent.js:4-18`; `backend/services/outboxService.js:47-57`). Admin dashboard counting is visibility, not retention. Preconditions: an event reaches seven failures. Add reviewed dead-letter retention/redaction/export policy before TTL deletion. |
| ED-06 | **Suppressed** | Y/N/Y/N/Y | Although the schema stores `Mixed` values plus `isPublic`, the controller accepts only fixed typed `SETTING_DEFINITIONS`, forces private definitions non-public, and the public getter checks a fixed `PUBLIC_SETTING_KEYS` set plus `isPublic=true` (`backend/controllers/systemSettingController.js:52-64,72-88,103-124`). Routes protect all non-public operations with admin auth. Static regression coverage passed. No arbitrary setting-to-public sink remains. |

## Background jobs and outbox (`BG`)

| ID | Disposition | R/T/C/I/P | Current closure |
|---|---|---|---|
| BG-01 | **Reportable** | Y/Y/Y/Y/Y | Lock acquisition allows an unexpired record whenever `{ owner }` matches (`backend/services/jobLockService.js:7-15`). Two overlapping invocations in the same process can both enter; unique name and cross-process owner checks do not prevent same-owner re-entry. Preconditions: manual/duplicate scheduler invocation or a long-running invocation overlapping another call in one process. |
| BG-02 | **Reportable** | Y/Y/Y/Y/Y | Cleanup and reminder use fixed 55-minute leases with no heartbeat or fencing token (`backend/jobs/cleanupJob.js:37`; `backend/jobs/reminderJob.js:68`; `backend/services/jobLockService.js:5-25`). If work exceeds the lease, another worker can acquire while the first continues, producing concurrent cleanup/reminder side effects. Batch limits and daily scheduling reduce likelihood but do not enforce duration. |
| BG-03 | **Reportable** | Y/Y/Y/Y/Y | Cleanup archives the report before deleting `ImageAnalysis`; if metadata deletion fails, the catch retains the failure but the next query excludes the now-archived row (`backend/jobs/cleanupJob.js:11-31`). `ImageAnalysis` has no TTL. Result: AI-derived image URL/labels/privacy metadata can remain orphaned indefinitely after the job reports a retryable failure. |
| BG-04 | **Reportable** | Y/Y/Y/Y/Y | Retention cleanup deletes media and replaces only `description`; it marks the report archived but retains owner link, item name, location/date, tags, attributes, custody/storage and other report metadata (`backend/jobs/cleanupJob.js:20-27`). Ordinary reads excluding archives are a visibility control, not erasure. The impact is indefinite retained personal/location metadata unless an approved schedule explicitly requires it. |
| BG-05 | **Reportable** | Y/Y/Y/Y/Y | Reminder execution performs an unbounded `Model.find(...).populate(...)` and then sequential per-item processing (`backend/jobs/reminderJob.js:11-49`). A large backlog materializes all due reports and participant data in memory and can exceed lease/runtime limits. Status/date indexes and a daily schedule do not bound result cardinality. |
| BG-06 | **Reportable** | Y/Y/Y/Y/Y | Any `processing` outbox row older than five minutes is reclaimable, with no heartbeat (`backend/services/outboxService.js:20-35`). A legitimate `processItem` can exceed five minutes: up to three 30-second provider attempts for image analysis, another three for keywords, up to five visual comparisons, up to 1,000 candidates, serial DB writes, notifications, and SMTP without an application timeout. A second worker can therefore process the same event concurrently. |
| BG-07 | **Reportable** | Y/Y/Y/Y/Y | After processing, a worker mutates and saves the originally claimed document without checking `lockedBy`, lease generation, or current status (`backend/services/outboxService.js:38-59`). Once BG-06 permits reclaim, the stale worker can overwrite the new owner's retry/dead/completed decision, clear its lock, or duplicate side effects. Unique `dedupeKey` prevents duplicate rows, not concurrent execution/finalization. |
| BG-08 | **Suppressed in current runtime callers** | N/N/Y/N/Y | `enqueueItemProcessing` has a random UUID default, but all four production callers pass a stable version explicitly: create uses `createdAt.getTime()` and update uses `Date.now()` (`backend/controllers/lostItemController.js:65,145`; `backend/controllers/foundItemController.js:66,147`). Repository-wide caller enumeration found no omitted-version runtime call. The unsafe default is unreachable in current application paths; remove it or require the parameter to prevent future regression. |

## Bootstrap, migration, errors, and uploads (`BM`)

| ID | Disposition | R/T/C/I/P | Current closure |
|---|---|---|---|
| BM-01 | **Reportable (privileged race)** | Y/Y/Y/Y/Y | Two authorized concurrent bootstrap processes can both count zero active admins and then create different admin identities (`backend/scripts/bootstrapAdmin.js:22-37`). Confirmation, strong passwords, existing-user checks, and per-email/student unique indexes are strong controls but do not serialize the global first-admin invariant. Preconditions: concurrent privileged environment/process access. Use an atomic bootstrap marker/transactional singleton or an operational single-run lock. |
| BM-02 | **Reportable (privileged migration integrity)** | Y/Y/Y/Y/Y | The migration transaction commits category merges, claim-state changes, contact changes, token-field removal, and settings changes before `createIndexes()` runs concurrently outside the transaction (`backend/scripts/migrateProduction.js:54-106`). A later index failure leaves destructive migration changes committed without required indexes. Explicit confirmation, replica-set assertion, and backup instruction reduce operator error but do not make the two phases atomic. Run preflight uniqueness/index validation and record a reversible, maintenance-locked migration plan. |
| BM-03 | **Reportable** | Y/Y/Y/Y/Y | Unknown production exceptions use `err.message` verbatim in a 500 response (`backend/middlewares/errorMiddleware.js:21-24,90-99`). A bounded invocation under `NODE_ENV=production` returned `{"success":false,"message":"VALIDATION_MARKER_INTERNAL_DETAIL"}` with status 500. Reachable ORM/provider errors can disclose collection, validation, network, or implementation details. Return a generic production 500 plus a correlation id; keep detail only in protected logs. |
| BM-04 | **Reportable (authenticated availability)** | Y/Y/Y/Y/Y | Multipart uploads use memory storage and cap only individual file size/count (`backend/middlewares/uploadMiddleware.js:10,35-43`); there are no explicit `fields`, `fieldSize`, `parts`, or `headerPairs` limits. Authentication runs before upload parsing and Nginx limits proxied bodies to 30 MB, which narrows abuse. Direct backend/provider body caps are external, and concurrent authenticated 5x5 MB uploads plus unbounded fields can still pressure heap. |
| BM-05 | **Deferred — provider/parser impact** | Y/Y/Y/?/E | Magic-byte checks validate only short signatures (`backend/middlewares/uploadMiddleware.js:45-87`); no server-side decode, dimension/frame limit, or polyglot rejection exists before Cloudinary upload. Byte/file count caps and Cloudinary `image` handling are countercontrols, while browser rendering uses image contexts. A concrete decompression/polyglot impact depends on Cloudinary transformation/decoding and client decoder behavior, neither proven here. Validate with safe malformed/high-dimension fixtures against staging and record provider rejection/transformation behavior. |

## Shared pagination (`PG`)

| ID | Disposition | R/T/C/I/P | Current closure |
|---|---|---|---|
| PG-01 | **Reportable (admin-only current entrypoint)** | Y/Y/Y/Y/Y | `paginate` accepts arbitrarily long digit strings; numeric overflow yields `page=Infinity` and `skip=Infinity` (`backend/utils/pagination.js:22-33`). Most consumers have `paginationQuery`, but `GET /api/ai-feedback` is admin-protected and has no query validator (`backend/routes/aiFeedbackRoutes.js:8-10`; `backend/controllers/aiFeedbackController.js:35-47`). Runtime construction preserved `skip: Infinity` in the Mongoose query. Impact is authenticated-admin-triggered query failure/log noise, not public DoS. Add the shared validator and finite/safe-integer clamping inside the helper. |

## Additional routed candidates (`RP`, `PS`, `NP`)

| ID | Disposition | R/T/C/I/P | Current closure |
|---|---|---|---|
| RP-01 | **Deferred — external topology evidence** | ?/Y/Y/Y/E | `app.set('trust proxy', 1)` feeds IP-based global and endpoint limiters (`backend/server.js:55,81-85`; `backend/middlewares/rateLimitMiddleware.js:13-65`). Endpoint limiters are also per-process memory stores. Whether a client can spoof the selected hop, all Vercel-proxied users collapse to one Railway-facing IP, or the origin is directly reachable depends on the exact Vercel -> Railway header chain and origin firewall. Capture redacted `req.ip/req.ips/socket.remoteAddress` through the real path and a direct-origin test before promotion. |
| PS-01 | **Deferred — concrete SSRF impact unproven** | Y/Y/Y/?/E | Authenticated users may store any syntactically valid HTTPS endpoint (`backend/utils/validators.js:557-573`; `backend/controllers/notificationController.js:103-131`), and a later workflow reaches `webpush.sendNotification` (`backend/services/notificationService.js:89-105`). Installed `web-push` performs a direct `https.request` with no host/IP allowlist and no application timeout, but does not follow redirects (`backend/node_modules/web-push/src/web-push-lib.js:338-410`). It is blind encrypted POST egress; response data is not returned, ordinary metadata is HTTP, and TLS/keys constrain targets. Safe private-range/DNS-rebinding staging evidence and a meaningful internal target are still required. |
| NP-01 | **Suppressed by complete caller inventory** | N/N/Y/N/Y | The helper returns true for an unknown channel, intentionally preserving in-app/audit delivery (`backend/services/notificationPreferenceService.js:35-40`). Repository-wide enumeration found only two production callers: fixed literal `push` in `notificationService` and fixed literal `email` in `workflowEmailService`; every email category caller uses one of the five normalized constants, and push event types map unknown values to fixed `system`. The existing test explicitly records unknown/in-app channel true. No misspelled/new external channel reaches a delivery sink today. |

## Commands and observed results

All commands were run in the exact `7499a19c41f8` checkout. No live credentials or secret values were read or printed.

```text
git rev-parse --short=12 HEAD
=> 7499a19c41f8

node --test tests/deployment-config.test.js tests/security.test.js tests/static-security.test.js tests/notification-preferences.test.js
=> 27 tests passed; 0 failed; duration about 554 ms

NODE_ENV=production + dummy REQUIRE_EMAIL_PROVIDER=tru + dummy REQUIRE_REDIS=' true '
import backend/config/security.js and print only derived booleans
=> {"requireEmail":false,"requireRedis":false,"cookieSecure":true}

NODE_ENV=production
invoke errorHandler(new Error('VALIDATION_MARKER_INTERNAL_DETAIL')) with a mock response
=> status 500; body {"success":false,"message":"VALIDATION_MARKER_INTERNAL_DETAIL"}

start an ephemeral local Socket.IO server with CLIENT_URLS=https://good.example,
stub only the user lookup, and connect direct-WebSocket with Origin=https://evil.example plus a valid test cookie
=> CONNECTED_CROSS_ORIGIN_WEBSOCKET

connect to the same ephemeral server with a one-second JWT, wait 1.6 seconds,
then emit to the authenticated user room
=> {"connected":true,"marker":"AFTER_EXPIRY"}

paginate({ page: '9'.repeat(400), limit: '50' }, 100), then construct AIDecisionFeedback.find().skip(...)
=> page finite=false; skip finite=false; Mongoose query option skip="Infinity"

git ls-tree -r --name-only 7499a19 -- frontend/public
=> logo.png, manifest.json, robots.txt, sw.js only

Get-ChildItem frontend/public -Force -Recurse -File and inspect frontend/dist dotfiles
=> no dot-prefixed public/dist file

rg -n "enqueueItemProcessing\\(" backend --glob "*.js"
=> four runtime callers; all pass an explicit stable version

rg -n "isNotificationChannelEnabled\\(" backend --glob "*.js"
=> only fixed production channels `push` and `email`; remaining hits are tests/helper definition

rg -n "paginate\\(" backend --glob "*.js" plus route-validator inventory
=> every current consumer is validated except admin-only ai-feedback listing
```

## External evidence still required

The deferred deployment/provider candidates cannot be converted into findings or assurances from repository source alone. Required evidence is: exact Vercel/Railway source-connection and approval settings (`DEP-02`); redacted production Mongo/Redis TLS and private-network configuration (`CF-03/04`); Compose host binding/firewall if it is used outside a workstation (`DEP-03`); real proxy-hop/IP behavior and direct-origin reachability (`RP-01`); safe staging Web Push egress tests (`PS-01`); and Cloudinary/browser rejection behavior for adversarial image fixtures (`BM-05`). Institutional approval and production sign-off remain outside this validation shard.
