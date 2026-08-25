# Smart Lost & Found — final security, performance, and readiness audit

## Executive decision

**Target:** `7499a19c41f8a333cf9580e619a76d3af4a8f009` (`main == origin/main` at verification)

**Decision:** **Not ready for security or institutional production sign-off.** The repository builds and its automated suite is healthy, but an unauthenticated public media/location privacy chain is High/P1 and four Medium/P2 attack paths remain. Human institutional approval and external provider/recovery/browser/load evidence remain separate pending gates.

This audit made no application-source change. It produced evidence and recommendations only.

## Security priority

| Priority | Finding/chain | Required outcome |
|---|---|---|
| P1 / High | Public unredacted report media plus raw/exact location/custody disclosure | Store a secure original, publish only a reviewed privacy-safe derivative, and enforce sensitivity-aware public projections centrally. |
| P2 / Medium | Refresh/session revocation gaps | Bind access/Socket.IO authorization to session or credential version; commit family compromise safely; remove unsafe rotation fallback; clamp family expiry. |
| P2 / Medium | Mutable CI security action | Pin `gitleaks/gitleaks-action` to a reviewed full SHA and minimize workflow permissions/secrets. |
| P2 / Medium, conditional | SMTP STARTTLS downgrade | Require TLS or use a verified HTTPS/implicit-TLS provider path; test the exact production transport. |
| P2 / Medium | Search/category/optional-AI abuse | Make global taxonomy admin-approved, add endpoint quotas/concurrency/cost budgets, require Redis for scaled production, and load-test indexed search. |
| P3 / Low, conditional | Cross-origin/stale Socket.IO authorization | Reject handshake origins with `allowRequest`, revalidate session/account state, and disconnect on revocation/status/role events. |
| P3 / Low | Claim/contact/handover integrity | Use server-authored verification, content fingerprints, transactional quota/contact revocation, and bind handover to the approved claim/match tuple. |

Full numbered attack steps, counterevidence, blindspots and mechanical severity reasoning are in `attack-path-analysis.md`.

## Release-blocking correctness and privacy work

These are not all standalone security vulnerabilities, but should not ship unresolved:

1. `Profile.jsx` blocks every valid password-change submit because a boolean validator result is destructured as an object.
2. Account deletion retains report metadata/location/user linkage and external media erasure is not reconciled before reporting success.
3. Shared-browser assistant/search/draft and Redux state is not consistently principal-scoped or stale-request fenced.
4. Last-administrator protection can fail under cross-target concurrent admin actions.
5. Outbox/job locks lack heartbeat/fencing and stale workers can finalize after ownership changes; cleanup/retention can orphan or indefinitely retain data.
6. Pending contact sharing and rejection lifecycle do not match the stated privacy policy; security/privacy UI and audit filters overstate actual enforcement/producers.
7. AI feedback target/version identity and claim evidence inputs are too caller-controlled, although AI remains advisory and human approval is enforced.
8. Settings update as three independent writes and privileged settings/report deletion lack complete audit events.

## Performance and scalability

| Hotspot | Current evidence | Recommendation |
|---|---|---|
| Initial frontend JS | 881.45 kB raw / 220.56 kB gzip main chunk | Lazy-load assistant and language packs; split vendor/i18n boundaries; return Vite warning limit to a meaningful budget. |
| Public chatbot query | Up to 168 unanchored regex clauses per model | Normalize/index searchable terms, cap expansion more tightly, measure query plans, and add abuse/load tests. |
| Matching | Hundreds of candidates with serial per-candidate reads/writes/notifications | Batch reads/writes, cap and queue work, persist immutable analysis snapshots, and add soak tests. |
| Decorative canvas | Recreates 120–900 particles on every resize | Throttle/debounce resize and reuse buffers; test orientation/low-power devices. |
| Admin dashboard | 30+ DB operations on cache miss | Consolidate aggregates/materialize metrics, profile indexes, and make Redis availability explicit. |
| Claims list | Materializes all owned report IDs before claim pagination | Query via indexed joins/denormalized owner key and paginate at the database boundary. |

Browser Core Web Vitals, Lighthouse, mobile memory, production query profiling, and load/soak severity remain unverified because the required browser/performance and production evidence was unavailable. No synthetic metric is presented as a pass.

## Dependency status

- Backend production audit: **0 vulnerabilities**.
- Frontend production audit: **2 moderate vulnerable package entries** (`react-router-dom@6.30.4`, transitive `react-router@6.30.4`).
- Current application navigation sanitizers prevented an exploit reproduction, but the packages remain inside published affected ranges.
- `npm audit` proposes `6.30.6`, while the transitive router advisory range still includes versions below `7.18.0`; use a tested non-affected release line and rerun navigation/security tests instead of assuming the suggested command fully closes all advisories.
- Official advisories: `GHSA-jjmj-jmhj-qwj2`, `GHSA-wrjc-x8rr-h8h6`, and SSR-only `GHSA-337j-9hxr-rhxg` (the current BrowserRouter application does not use the reviewed SSR hydration path).

## Negative controls verified

- No automatic claim approval.
- No automatic account suspension/ban.
- No uncontrolled automatic model training from corrections/feedback.
- No face identification or sensitive-trait inference path.
- AI results remain advisory and are not ownership proof.
- Claim proof assets use authenticated delivery and participant-gated signed access.
- Selected user/session secrets are removed by the current model serialization boundary.
- Google identity audience, verified email and conflicting-subject checks are present.
- Reset/verification tokens are hashed at rest, expire, use neutral responses, and frontend links keep tokens in fragments.
- Reviewed report create/update paths avoid the proposed privileged-field mass assignment.
- Reviewed React/Markdown/navigation/service-worker paths did not establish a current XSS/open-redirect/private-cache exploit.
- Reviewed AI and Cloudinary call paths did not expose request-controlled server-side URL fetch/SSRF.

## Verification evidence

| Check | Final observed result |
|---|---|
| Exact target | `HEAD == origin/main == 7499a19c41f8a333cf9580e619a76d3af4a8f009` |
| Exhaustive source review | 242/242 checklist rows checked; 0 unchecked |
| Coverage closure | 32/32 ledger rows closed; 0 `open` |
| Backend syntax | 124 JavaScript files passed |
| Backend lint | Passed, zero warnings |
| Backend tests | 63 passed, 1 skipped, 0 failed |
| Frontend lint | Passed, zero warnings |
| Frontend tests | 103 passed, 0 failed |
| Frontend production build | Passed; 2,782 modules; 3.29 s in final rerun |
| Git diff whitespace check | Passed; line-ending notices only |
| Secret-pattern review | No production secret identified; gitleaks binary unavailable, so CI tool execution remains a gate |

The skipped backend test is the replica-set concurrency refresh-reuse test; it must run against an isolated replica-set database after remediation.

## Required completion sequence

1. Fix and regression-test P1 public media/location projection first.
2. Fix session/refresh/Socket.IO revocation as one identity-lifecycle change; run transaction, failure-injection and browser logout/account-switch tests.
3. Fix taxonomy/AI/search quotas and require Redis when multi-instance correctness/rate limiting is expected; run load and provider cost-budget tests.
4. Pin CI action SHA and tighten permissions; rerun secret scan, CodeQL/dependency review and release build from the exact commit.
5. Enforce/test the selected production email transport; verify real email and push on approved recipients/devices.
6. Fix workflow/contact/handover, account-erasure, audit, settings atomicity, password UI, and worker fencing/retention issues.
7. Migrate React Router to a tested non-affected line and confirm `npm audit`, navigation and build.
8. Run browser/mobile/a11y UAT, Lighthouse/Core Web Vitals, load/soak, backup/restore and rollback against one exact candidate checksum.
9. Repeat live privacy/auth/readiness/log/Socket.IO/provider checks, remove test data, create a file/hash manifest and ZIP SHA-256.
10. Obtain human institutional privacy, security, operational and university sign-off tied to that exact checksum.

## Evidence map

- `threat-model.md` — scope, assets, trust boundaries and severity basis
- `runtime_inventory.md` — runtime/privileged surface inventory
- `exhaustive-file-checklist.md` — 242-file review state
- `finding-discovery.md` — raw discovery evidence
- `repository_coverage_ledger.md` — 32 boundary-family closures
- `validation/closure-table.md` — authoritative candidate dispositions
- `validation/validation-report.md` — Phase-3 summary and test evidence
- `attack-path-analysis.md` — final attack paths and severity decisions
- `validation/*.md` — detailed authentication, privacy/UI, workflow/admin/AI, deploy/config, dependency, performance and negative-control evidence

## Final stance

This is a deeply reviewed, currently buildable release candidate, **not a 100% complete, security-certified, or institutionally approved production release**. P1/P2 remediation and the explicitly external evidence gates must be completed on a new exact commit before sign-off.
