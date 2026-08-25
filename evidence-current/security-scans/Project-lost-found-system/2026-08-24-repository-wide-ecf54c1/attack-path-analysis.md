# Phase 4 attack-path and severity analysis

Target: `7499a19c41f8a333cf9580e619a76d3af4a8f009`

Method: only Phase-3 validated instances were chained. Impact and likelihood were set from the repository threat model, then the skill severity matrix was applied mechanically. Passing tests/builds are counterevidence for broad regressions, not proof that a traced security path is absent.

## Final policy summary

| Path | Final severity | Priority | Decision |
|---|---:|---:|---|
| AP-01 Public media and exact-location disclosure | High | P1 | Report |
| AP-02 Refresh/session revocation can leave attacker sessions usable | Medium | P2 | Report |
| AP-03 Mutable security workflow action can execute changed upstream code | Medium | P2 | Report |
| AP-04 SMTP STARTTLS downgrade can expose account/workflow mail in transit | Medium | P2 | Report, configuration-dependent |
| AP-05 Public/authenticated expensive paths and global taxonomy mutation enable abuse | Medium | P2 | Report |
| AP-06 Cross-origin and stale Socket.IO authorization can leak later notifications | Low | P3 | Report, conditional |
| AP-07 Claim/contact/handover integrity gaps mislead or over-share within one workflow | Low | P3 | Report |

No critical finding was established. Several validated bugs are release-relevant correctness, privacy, or operability work but fail the security reportability threshold after attacker/precondition analysis; they are listed after the attack paths.

## AP-01 — Public media and exact-location disclosure

### Factual attacker path

1. An unauthenticated remote user enumerates active lost/found report list/detail endpoints.
2. Report creation uploads images through `uploadMultipleImages(..., 'lost-items'/'found-items')` (`backend/controllers/lostItemController.js:41`, `backend/controllers/foundItemController.js:41`).
3. Default Cloudinary delivery is public `upload`, with a returned `secure_url`; the transformation limits output dimensions but does not establish a privacy-safe redacted derivative (`backend/services/cloudinaryService.js:7-25`).
4. Public report objects retain raw `lostLocation`, `foundLocation`, and `storedAt` fields (`backend/controllers/lostItemController.js:51`, `backend/controllers/foundItemController.js:51,59`).
5. Location intelligence returns exact `canonicalName` and `area` even for records marked restricted (`backend/services/locationIntelligenceService.js:82-89`).
6. The attacker receives direct public media plus precise raw/canonical location/custody information without authentication.

### Attack Path Facts

- **Assumptions:** production uses these current public report routes and Cloudinary public delivery; reports contain real user images/location text.
- **Context:** crosses guest-to-user and public-media/private-context boundaries. Repository evidence shows anonymous serializers/controllers emit reporter-supplied location and public image URL fields.
- **In-scope:** yes; public reports, serializers, Cloudinary and location privacy are explicit threat-model assets/boundaries.
- **Exposure:** public HTTP API behind the deployed frontend/API ingress. Exact provider topology is not needed for the application disclosure.
- **Identity/effective privilege:** none; guest.
- **Cross-boundary behavior:** verified by deterministic local projection probes in `validation/privacy-ui.md`; exact restricted data and anonymous raw location/custody survived.
- **Vector:** `remote`.
- **Preconditions:** at least one report with a sensitive original or precise location; plausible and inherent to the product.
- **Attacker input control:** yes for enumeration/search identifiers; victim report content supplies the disclosed data.
- **Category:** CWE-359/CWE-200, public/private media confusion.
- **Mitigations present:** active-status filters, contact hiding, image dimension transformation, authenticated delivery for claim proof images, and some location sensitivity metadata.
- **Auth scope:** public.
- **Impact surface/reach:** user data and physical-location privacy across any publicly listed report; not signing secrets or account takeover.
- **Secrets:** none.
- **Counterevidence:** contact fields and claim proof images are protected; not every report image/location is sensitive. This narrows data class but does not stop the broad unauthenticated disclosure path.
- **Blindspots:** real production record sensitivity/volume and institutional location policy were not sampled.
- **Controls required:** privacy-safe public derivative, secure original, sensitivity-aware location projection, public serializer tests, and provider deletion reconciliation.
- **Confidence:** high on code/reachability; medium-high on real-data impact.

**Impact:** high. **Likelihood:** high. **Matrix result:** **High / P1**. It is unauthenticated, broad across public reports, and can expose image and physical-location/custody information. It does not meet critical because account/secret compromise is absent and record sensitivity is data-dependent.

## AP-02 — Refresh/session revocation can leave attacker sessions usable

### Factual attacker path

1. An attacker first obtains a victim refresh token or already-issued access token; token theft is a required precondition, not claimed as supplied by this repository.
2. Access JWT middleware validates signature/issuer but does not check a live refresh session, credential version, or revocation version (`backend/middlewares/authMiddleware.js:14`).
3. On refresh-token reuse, family revocation occurs inside a transaction whose error path aborts/rolls back the revocation (`backend/services/sessionService.js:55-63`; full trace in `validation/auth-session.md`).
4. If transactions are unavailable, the fallback rotate/revoke sequence can race a successor creation/revocation (`backend/services/sessionService.js:49-79`).
5. Password change saves the new password before `revokeAllUserSessions`; a revocation failure leaves the credential changed but old refresh sessions active (`backend/controllers/userController.js:44-53`).
6. Existing access JWTs continue until expiry even after logout/password actions; frontend logout also hides server failure (`frontend/src/services/authService.js:44-45`).

### Attack Path Facts

- **Assumptions:** attacker possesses a valid victim token; production accepts the current access/refresh cookie flow.
- **Context:** crosses victim identity/session boundary and can preserve authenticated access after a security action.
- **In-scope:** yes; refresh replay and revocation are explicit threat-model invariants.
- **Exposure:** public authentication/refresh API.
- **Identity/effective privilege:** victim user; admin impact only if an admin token is stolen.
- **Cross-boundary behavior:** code-complete for access-token survival and transaction rollback; fallback concurrency was statically traced but not replica-set race-tested.
- **Vector:** `remote` after token theft.
- **Preconditions:** stolen token plus replay/timing or a revocation/provider failure; plausible but not supplied by the application.
- **Attacker input control:** yes over the stolen refresh/access cookie and request timing.
- **Category:** CWE-613/CWE-362.
- **Mitigations present:** strong random hashed refresh tokens, HttpOnly cookies, CSRF, short access-token default, atomic consume attempt, family IDs, replay detection, and production transaction validation.
- **Auth scope:** authenticated/stolen-session.
- **Impact surface/reach:** targeted identity/data access for one victim/session family.
- **Secrets:** refresh/access token only; no signing key exposure.
- **Counterevidence:** the application does detect reuse and normally requires replica-set transactions; access tokens are time-bounded. These reduce likelihood/duration but do not bind authorization to current session state.
- **Blindspots:** controlled replica-set concurrency and production failure-injection evidence are absent.
- **Controls required:** immutable family expiry, commit compromise state before error response, eliminate unsafe fallback or add atomic family compromise, credential/session version checks on access and Socket.IO, and failure-injection tests.
- **Confidence:** high for SR-01/RR-01/AC-02; medium-high for RR-02 exploit timing.

**Impact:** high. **Likelihood:** medium. **Matrix result:** **Medium / P2**. Targeted account/session persistence is material, but prior token possession and specific replay/failure conditions prevent High.

## AP-03 — Mutable security workflow action can execute changed upstream code

### Factual attacker path

1. The repository runs the secret-scanning workflow with repository token/declared permissions.
2. `.github/workflows/security.yml:33` references `gitleaks/gitleaks-action@v2`, a mutable tag rather than an immutable commit digest.
3. If that upstream tag/release channel is compromised or retargeted, changed action code executes inside this repository's CI context.
4. The changed code can access whatever checkout/token/event context the workflow grants and can corrupt security evidence or attempt repository-side effects within those permissions.

### Attack Path Facts

- **Assumptions:** GitHub resolves the mutable tag at run time and the action publisher/tag is compromised; no present compromise is asserted.
- **Context:** crosses external supply-chain to repository CI trust boundary.
- **In-scope:** yes; source/CI-to-production is an explicit threat boundary.
- **Exposure:** GitHub-hosted CI event surface, not the application HTTP ingress.
- **Identity/effective privilege:** workflow token and runner process; exact effective permissions depend on event/repository settings.
- **Cross-boundary behavior:** the mutable reference and workflow execution are verified; upstream compromise is hypothetical.
- **Vector:** `remote` supply chain.
- **Preconditions:** compromise/retargeting of the referenced action tag; uncommon but credible.
- **Attacker input control:** unknown until upstream compromise; then yes over executed action code.
- **Category:** CWE-829, CI supply-chain integrity.
- **Mitigations present:** isolated GitHub runner, separate tests, dependency review, and repository branch controls outside the source snapshot.
- **Auth scope:** developer/CI.
- **Impact surface/reach:** build/security evidence and potentially repository workflow token scope; not proven production deploy credentials.
- **Secrets:** workflow token; no secret value was read or printed.
- **Counterevidence:** no malicious action code or current compromise was found, and the exact token permissions may limit writes.
- **Blindspots:** repository Actions settings, environment protection, token policy, and branch protection are external.
- **Controls required:** pin the action to a reviewed full commit SHA, minimize job/workflow permissions, restrict secrets by event/environment, and enable dependency-update review for action SHAs.
- **Confidence:** high on condition, medium on impact.

**Impact:** high. **Likelihood:** unknown. **Matrix result:** **Medium / P2**.

## AP-04 — SMTP STARTTLS downgrade can expose account/workflow mail in transit

### Factual attacker path

1. The application connects to an SMTP provider with STARTTLS capability but without enforcing `requireTLS` (`ED-01`, `validation/deploy-config.md`).
2. An on-path/network attacker interferes with TLS negotiation or the SMTP server path.
3. The transport can continue without the application requiring upgraded encryption.
4. Password reset/verification and workflow email content/links can be observed or altered in transit, subject to the provider/network behavior.

### Attack Path Facts

- **Assumptions:** production uses SMTP rather than another provider and starts on a plaintext-upgradable port; an attacker is on path.
- **Context:** crosses API-to-email-provider boundary and may expose identity/workflow messages.
- **In-scope:** yes; transactional email and reset/verification tokens are explicit assets.
- **Exposure:** outbound SMTP, not public HTTP.
- **Identity/effective privilege:** application SMTP account.
- **Cross-boundary behavior:** missing enforcement is source-verified; downgrade was not performed against production.
- **Vector:** `local_network`/on-path.
- **Preconditions:** SMTP mode plus capable on-path attacker; plausible but environment-dependent.
- **Attacker input control:** network negotiation/traffic, not application request body.
- **Category:** CWE-319/CWE-295 transport downgrade.
- **Mitigations present:** provider authentication, token expiry/hash-at-rest, fragment-delivered reset links, and sender validation.
- **Auth scope:** provider transport.
- **Impact surface/reach:** email confidentiality/integrity for messages sent during the attack window.
- **Secrets:** one-time verification/reset link tokens may transit in messages.
- **Counterevidence:** deployment may use Resend/implicit TLS or trusted provider networking; no live downgrade evidence exists.
- **Blindspots:** exact production email transport and network path.
- **Controls required:** enforce TLS/`requireTLS`, prefer implicit TLS or a verified HTTPS email API, verify certificate policy, and add a transport configuration test.
- **Confidence:** high on source condition, medium on production reachability.

**Impact:** high. **Likelihood:** medium when SMTP/STARTTLS is used; otherwise ignore. **Matrix result:** **Medium / P2, configuration-dependent**.

## AP-05 — Expensive public/authenticated paths and global taxonomy mutation enable abuse

### Factual attacker path

1. A remote guest repeatedly invokes chatbot search; one request can create up to 168 unanchored regex clauses per model and inspect bounded result sets (`PERF-CHAT-01`, `validation/performance.md`).
2. An ordinary account can trigger category auto-creation from UI field blur and directly mutate the globally active taxonomy (`CAT-AUTH-01`, `CAT-DOS-01`).
3. If optional vision AI is enabled, authenticated callers have no provider-cost-specific quota/concurrency gate (`AI-COST-01`).
4. Global API limiting is broad (1,000/15 minutes) and falls back to per-process memory when Redis is optional/unavailable (`backend/server.js:81-85`, `backend/config/security.js:50`).
5. In a scaled/no-Redis deployment, attackers distribute calls across instances, amplifying regex/database/cache/provider work and global taxonomy pollution.

### Attack Path Facts

- **Assumptions:** reachable public chat; account creation/auth for taxonomy/vision; optional AI/provider may be enabled; horizontal scaling strengthens but is not required for the base path.
- **Context:** crosses guest/user to shared runtime, cost, and global taxonomy integrity boundaries.
- **In-scope:** yes; public search, AI, Redis/rate limits, and global privileged state are explicit surfaces.
- **Exposure:** public HTTP plus authenticated endpoints.
- **Identity/effective privilege:** guest for regex work; ordinary user for taxonomy/vision.
- **Cross-boundary behavior:** route/controller/source limits and ordinary-user taxonomy mutation are verified; material production saturation/cost was not load-tested.
- **Vector:** `remote`.
- **Preconditions:** repeated requests and, for two branches, a normal account/provider enabled; plausible.
- **Attacker input control:** yes over query terms, category suggestions, images, and timing.
- **Category:** CWE-400/CWE-770 and authorization/integrity design gap.
- **Mitigations present:** 120-result cap, per-route public-chat limiter (20/5 min/IP), upload byte/file limits, provider timeouts, optional AI disabled by default, and global limiter.
- **Auth scope:** mixed public/authenticated.
- **Impact surface/reach:** API/database/provider cost and shared taxonomy; single service or scaled fleet depending Redis/deployment.
- **Secrets:** none.
- **Counterevidence:** bounds and optional-AI default constrain the path; no load/soak evidence proves outage or material cost.
- **Blindspots:** production dataset cardinality, indexes/query plans, instance count, Redis requirement, provider pricing, and WAF controls.
- **Controls required:** admin-approved taxonomy or isolated suggestions, endpoint quotas/concurrency budgets, regex/token reduction with indexed search, Redis fail-closed for production rate limits, and load/cost tests.
- **Confidence:** high on source conditions, medium on production impact.

**Impact:** medium. **Likelihood:** high. **Matrix result:** **Medium / P2**.

## AP-06 — Cross-origin and stale Socket.IO authorization can leak later notifications

### Factual attacker path

1. A site outside `clientOrigins` initiates a direct WebSocket connection while a victim session cookie is eligible to be sent (for example same-site sibling origin or `SameSite=None`).
2. Socket.IO CORS configuration exists, but no handshake `allowRequest` origin rejection is enforced; a runtime probe completed a cross-origin direct WebSocket connection (`backend/config/socket.js:12-13`, `validation/deploy-config.md`).
3. The handshake validates the JWT/user once and joins `user:<id>`/`admins` (`backend/config/socket.js:22-35`).
4. The established socket is not revalidated on token expiry, logout, demotion, deactivation, or session revocation.
5. Later user-room/admin-room notifications remain deliverable to that connection until it disconnects/server closes it.

### Attack Path Facts

- **Assumptions:** browser sends the cookie cross-origin or attacker has direct cookie-bearing client capability; useful notification events occur after connection.
- **Context:** can cross origin/session-lifecycle boundary and expose later notification payloads.
- **In-scope:** yes; Socket.IO rooms and session revocation are explicit boundaries.
- **Exposure:** public WebSocket ingress.
- **Identity/effective privilege:** victim user/admin captured at handshake.
- **Cross-boundary behavior:** cross-origin handshake and post-expiry persistence were runtime-proven; browser cookie-policy exploit was not.
- **Vector:** `remote`.
- **Preconditions:** eligible cookie plus victim/session context or a previously established legitimate socket; plausible but configuration/browser dependent.
- **Attacker input control:** plausible over Origin/handshake; no arbitrary room selection because rooms are server-derived.
- **Category:** CWE-346/CWE-613.
- **Mitigations present:** signed access JWT, user DB active/deleted check at handshake, server-derived rooms, normal React logout hook disconnect, and optional Redis adapter.
- **Auth scope:** authenticated.
- **Impact surface/reach:** later notifications for one captured user connection; room join is not arbitrary.
- **Secrets:** access cookie is used but not exposed by the server path.
- **Counterevidence:** normal app logout disconnects its socket, room identity is canonical, and SameSite may stop hostile cross-site browsers. These materially constrain impact/likelihood.
- **Blindspots:** exact cookie same-site policy and production proxy/browser handshake behavior.
- **Controls required:** `allowRequest` exact-origin enforcement, short socket auth lifetime/session version, disconnect on logout/revocation/status/role events, per-event authorization for privileged events, browser regression tests.
- **Confidence:** high on server condition/runtime probes; medium on hostile-browser exfiltration.

**Impact:** medium. **Likelihood:** medium. **Matrix result:** **Low / P3**.

## AP-07 — Claim/contact/handover integrity gaps mislead or over-share within one workflow

### Factual attacker path

1. An ordinary claimant supplies both verification questions and answers; scoring can classify synthetic self-authored evidence as strong (`CR-01`).
2. Byte-equivalent proof can be reuploaded under a different Cloudinary public ID, bypassing object-ID-based reuse detection (`CR-02`).
3. Reporter/admin can share both parties' contact information while the claim is still pending (`backend/controllers/claimController.js:274-275`).
4. Rejection updates status/remark but does not atomically clear `isContactShared` (`backend/controllers/claimController.js:202-241`; field at `backend/models/ClaimRequest.js:110-113`).
5. Handover resolution searches any confirmed match for the item rather than the exact approved claim/match tuple (`backend/services/itemWorkflowService.js:29,62`).
6. A reviewer may therefore see overstated evidence, persistent contact access, or resolve the wrong confirmed connection; human review still remains mandatory.

### Attack Path Facts

- **Assumptions:** claimant creates a real claim and a reporter/admin reviews/shares; multiple confirmed matches are needed for the handover branch.
- **Context:** crosses claimant-to-reporter and participant-contact boundaries within one item workflow.
- **In-scope:** yes; evidence, contact sharing, matching, and handover are explicit invariants.
- **Exposure:** authenticated claim/workflow API.
- **Identity/effective privilege:** ordinary claimant; reporter/admin still controls approval/contact actions.
- **Cross-boundary behavior:** scoring, contact state, and arbitrary-match selection are source/runtime-probe verified.
- **Vector:** `remote` authenticated.
- **Preconditions:** normal account/claim plus human reviewer action; handover misbinding additionally needs multiple confirmed matches.
- **Attacker input control:** yes over evidence/questions/reupload; no control over final human approval.
- **Category:** workflow integrity/CWE-359/CWE-362.
- **Mitigations present:** evidence is explicitly advisory-only, private proof delivery, participant/reporter/admin checks, match relationship validation at claim approval, and human approval.
- **Auth scope:** authenticated participant/reporter/admin.
- **Impact surface/reach:** one claim/item and participant contact data; no automatic ownership proof or automatic punitive action.
- **Secrets:** contact email/phone after explicit share.
- **Counterevidence:** the server never automatically approves a claim, suspends an account, or treats AI/evidence score as ownership proof. This is decisive against high severity.
- **Blindspots:** institutional policy for pending contact consent and realistic multiple-match frequency.
- **Controls required:** server-authored secret verification prompts, perceptual/content proof fingerprinting, transactional quota and contact revocation, approved-claim/match binding for handover, reason validation, and audit events.
- **Confidence:** high on behavior; medium on policy/real-world impact.

**Impact:** medium. **Likelihood:** medium. **Matrix result:** **Low / P3**.

## Validated issues that do not survive as standalone security vulnerabilities

| Group | Security policy result | Required handling |
|---|---|---|
| `PW-01` password-change UI contract | Ignore as security; deterministic correctness defect | Fix before release because valid password rotation is blocked. |
| `AC-01` last-admin write skew | Ignore as security: admin-only plus precise concurrent precondition | Fix operational invariant and add two-admin concurrency test. |
| `BG-01`–`BG-07`, `ED-02/03/05` worker/idempotency/retention | Ignore as external-attacker security absent a demonstrated input path; significant reliability/privacy operations work | Add fencing/heartbeats/ownership-checked finalize, bounded batches, reconciliation and retention. |
| `SS-01`, `CH-01`, `DR-01`, `RS-01`, `RR-UI-01` shared-browser/stale state | Ignore as standalone security under physical/shared-device precondition; privacy and correctness release work remains | Principal-namespace/reset storage and fence/cancel stale requests. |
| `DEP-NPM-01` React Router advisories | Ignore for current exploit severity because reviewed sinks were constrained and no exploit was reproduced | Move to a tested non-affected router line and rerun audit/navigation tests; do not rely on `npm audit fix` alone. |
| `BM-03`, `PG-01`, `RW-01/02`, audit/copy gaps | Ignore or low hardening when isolated | Fix for robust error handling, accountability and truthful UI; do not market as direct compromise. |
| `PERF-BUNDLE-01`, `PERF-MATCH-01`, `PERF-CANVAS-01`, `PERF-ADMIN-01`, `PERF-CLAIMS-01` | Performance only pending browser/load evidence | Code-split/lazy-load, batch/query/index, throttle resize, profile cache-miss paths, and paginate from joined queries. |

## Release decision from Phase 4

The source is **not ready for security sign-off** while AP-01 remains. AP-02 through AP-05 should also be resolved or explicitly risk-accepted before production. AP-06/AP-07 and the non-security release defects belong in the same remediation program but should not be inflated to high severity. External provider/topology/browser/load evidence remains pending and cannot be inferred from local source.
