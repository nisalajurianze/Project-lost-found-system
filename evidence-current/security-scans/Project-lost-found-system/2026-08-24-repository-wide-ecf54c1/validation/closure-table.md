# Phase 3 authoritative closure table

Target: `7499a19c41f8a333cf9580e619a76d3af4a8f009`

This table is the authoritative closure for every discovery candidate and every later candidate created during validation. Repeated IDs in separate validation shards describe the same instance and are intentionally deduplicated here. `Reportable` means the current-source condition survived validation; final security severity is assigned only in Phase 4. Performance opportunities are not automatically security vulnerabilities.

## Authentication, session, and browser state

| Candidate | Final disposition | Evidence |
|---|---|---|
| `SD-01`, `SD-02`, `SD-03` | Suppressed | Selected authentication/session fields are removed by the current `User.toJSON` boundary. |
| `SR-01` | Reportable | Access JWT validation is not bound to a live server session or credential/session version. |
| `RR-01`, `RR-02`, `RR-03` | Reportable | Reuse revocation can roll back, fallback rotation races, and refresh-family expiry slides. |
| `ST-01`, `RS-01`, `RR-UI-01` | Reportable | Logout failure is hidden; account-private Redux state and late reads are not principal/context fenced. |
| `AC-01`, `LA-STATUS-01`, `LA-ROLE-01`, `LA-DELETE-01` | Reportable, merged | One cross-target last-administrator write-skew instance. |
| `AC-02` | Reportable | Password mutation can commit before refresh-session revocation succeeds. |
| `AC-03` | Not applicable | Current claim schema/status paths do not make the proposed cleanup gap reachable. |
| `AC-04` | Reportable | Deleted-account authored report metadata/location linkage remains retained. |
| `PW-01` | Reportable | Profile destructures a boolean password-validator result and blocks valid password changes. |
| `RP-01` | Deferred | Correct client-IP/rate-limit behavior depends on the unverified production proxy-hop topology. |
| `OR-01` | Suppressed | Reviewed navigation helpers constrain/fix internal targets. |
| `SS-01`, `CH-01`, `DR-01` | Reportable | Saved searches, assistant history, and report-draft handoff are not principal/freshness bound. |

## Authorization, workflows, privacy, and administration

| Candidate | Final disposition | Evidence |
|---|---|---|
| `MA-LI-01`, `MA-LI-02`, `MA-FI-01`, `MA-FI-02` | Suppressed | Create/update assignments do not mass-assign the proposed privileged report fields. |
| `MM-01` | Suppressed | Match principals are derived from canonical item owners. |
| `CR-01`, `CR-02`, `CR-03` | Reportable | Claim evidence scoring trusts claimant-authored questions, byte-equivalent reuploads evade reuse detection, and quotas race. |
| `PC-01`, `CP-01` | Reportable | Contact can be shared while pending and is not revoked on rejection. |
| `RW-01`, `RW-02` | Reportable | Claim and match rejection reasons are not consistently required/persisted by the API/model. |
| `HW-01` | Reportable | Handover selects an arbitrary confirmed match for the item instead of the approved claimant/match tuple. |
| `AF-01` | Reportable | AI-feedback target and algorithm identity are caller-asserted and not ownership/existence bound. |
| `CAT-AUTH-01`, `CAT-DOS-01` | Reportable | Ordinary users mutate global taxonomy and blur-triggered creation amplifies DB/cache/optional-AI work. |
| `AI-COST-01` | Reportable, provider-dependent | Authenticated vision analysis lacks a provider-cost-specific quota/concurrency control. |
| `AL-SETTING-01`, `AL-REPORT-01`, `EV-AUDIT-01` | Reportable, merged family | Security-setting/report-delete audit events are absent while UI implies broader audit coverage. |
| `SET-ATOMIC-01` | Reportable | Three abuse/security setting updates can partially commit. |
| `PG-01` | Reportable | Non-finite pagination reaches Mongoose skip on the current admin AI-feedback entrypoint. |
| `MI-01`, `MI-02` | Reportable | Public unredacted report originals can be stored; provider deletion failure is treated as success. |
| `LP-01`, `LP-02`, `LP-03`, `FI-01` | Reportable, `FI-01` merged into `LP-02` | Anonymous responses expose raw location/custody text; restricted governed locations retain exact identity. |
| `EI-01` | Deferred | The public/private classification of unique item characteristics requires institutional policy and real-field evidence. |
| `TC-01`, `TC-02`, `EV-PRIV-01` | Reportable | Privacy/erasure copy and hotspot exclusions exceed current enforcement. |

## Configuration, deployment, providers, and workers

| Candidate | Final disposition | Evidence |
|---|---|---|
| `CF-01`, `CF-02`, `CF-05`, `CF-06` | Reportable | Redis can be optional, invalid booleans silently disable requirements, cross-origin Socket.IO connects, and established sockets outlive JWT/account changes. |
| `CF-03`, `CF-04` | Deferred | MongoDB and Redis transport/auth posture requires target provider configuration. |
| `DEP-01`, `DEP-02`, `DEP-03` | Deferred | Lateral network, auto-deploy gating, and host/firewall exposure require deployment/topology evidence. |
| `DEP-04` | Reportable | Gitleaks workflow action is mutable and runs with broad token/permissions. |
| `DEP-05` | Suppressed | Exact release artifact contains no hidden static file proposed by the candidate. |
| `ED-01`, `ED-02`, `ED-03`, `ED-05` | Reportable | SMTP permits STARTTLS downgrade, delivery ignores app idempotency, missing provider can look successful, and dead records retain errors indefinitely. |
| `ED-04`, `ED-06` | Suppressed | Nodemailer normalizes proposed header input and settings controller uses a strict allowlist. |
| `BG-01`, `BG-02`, `BG-03`, `BG-04`, `BG-05`, `BG-06`, `BG-07` | Reportable | Job/outbox locks lack fencing/heartbeat/bounds and cleanup/retention paths can orphan or over-retain data. |
| `BG-08`, `NP-01` | Suppressed | All current versioned-job callers pass a version; notification channel callers are fixed. |
| `BM-01`, `BM-02`, `BM-03`, `BM-04` | Reportable | Bootstrap/migration races, raw production error messages, and upload aggregate/dimension/concurrency gaps survive. |
| `BM-05` | Deferred | Malformed-image provider/parser behavior needs controlled provider/browser validation. |
| `PS-01` | Deferred | Arbitrary HTTPS Web Push endpoint is accepted, but a meaningful blind encrypted-POST SSRF target/impact is unproven. |

## Dependencies and performance

| Candidate | Final disposition | Evidence |
|---|---|---|
| `DEP-NPM-01` | Reportable dependency exposure | Locked React Router packages are in published affected ranges; no application exploit was reproduced. |
| `PERF-BUNDLE-01` | Reportable performance opportunity | Initial application chunk is about 881 kB raw / 221 kB gzip and eagerly includes translations/chat shell. |
| `PERF-CHAT-01` | Reportable performance/security hardening | Public chatbot can build 168 unanchored regex clauses per model. |
| `PERF-MATCH-01` | Reportable performance opportunity | Matching can serially read/write/notify across hundreds of candidates. |
| `PERF-CANVAS-01` | Reportable performance opportunity; suppressed as security | Resize rebuilds 120–900 decorative particles without throttling. |
| `PERF-ADMIN-01` | Reportable performance opportunity | Admin dashboard cache misses fan out into 30+ database operations. |
| `PERF-CLAIMS-01` | Reportable performance opportunity | Claim list materializes every owned report ID before claim pagination. |
| `PERF-IMAGE-01` | Suppressed as standalone security; retain robustness | Large decoded dimensions are a local-browser resource risk; no remote-victim path was established. |

## Boundary-family closure

Every row in `repository_coverage_ledger.md` is closed. Clean/suppressed families include Google identity binding, reset/verification hashing and neutral responses, global middleware/Markdown/service-worker controls, explicit report assignments, canonical match principals, fixed notification channels, and request-controlled SSRF review. Deferred items are limited to the explicitly named provider, topology, parser, policy, and external acceptance evidence above.
