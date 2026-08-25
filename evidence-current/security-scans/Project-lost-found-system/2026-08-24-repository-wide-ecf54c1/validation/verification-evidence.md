# Phase 3 verification evidence

- Exact revision: `7499a19c41f8a333cf9580e619a76d3af4a8f009`
- Date: 2026-08-24
- Mutation boundary: repository source, lockfiles, providers, and production data were not changed.

## Passing local checks

| Check | Result |
|---|---|
| Exhaustive discovery checklist | 242/242 complete; 0 missing |
| Backend syntax | 124 JavaScript files passed |
| Backend ESLint | passed, zero warnings |
| Frontend ESLint | passed, zero warnings |
| Backend tests | 63 passed, 1 skipped, 0 failed |
| Frontend tests | 103 passed, 0 failed |
| Frontend Vite production build | passed; 2,782 modules; 2.69 s |
| `git diff --check` | passed |

The skipped test is the Mongo replica-set concurrency case for refresh-family reuse. Its skip is a validation gap, not a passing security control.

## Dependency audit

| Tree | Production/full audit |
|---|---|
| Backend | 0 vulnerabilities |
| Frontend | 2 moderate vulnerable package entries (`react-router-dom@6.30.4`, `react-router@6.30.4`) |

Applicability and upstream-range analysis are in `dependencies.md`.

## Secret-pattern scan

- `gitleaks` binary is not installed locally; repository CI uses a gitleaks action, whose mutable-action/token configuration is assessed separately as `DEP-04`.
- Tracked environment files: examples only (`backend/.env.example`, `frontend/.env.example`). Real backend/frontend `.env` paths are ignored by `.gitignore`.
- Bounded tracked-file regex scan found no AWS, GitHub, Stripe, Google API, private-key, JWT-shaped, or comparable credential candidates.
- One generic `password=` candidate exists in `backend/tests/database.integration.test.js:23`; manual redacted review identified it as a deterministic local test fixture, not a deployed/third-party secret.

## Runtime validation probes

- Cross-origin direct WebSocket connected despite a nonmatching allowlist Origin (`CF-05`).
- A one-second JWT Socket.IO connection received a notification after expiry (`CF-06`).
- Invalid/whitespace required-provider boolean values evaluated false (`CF-02`).
- Unknown production error text was returned verbatim (`BM-03`).
- Oversized pagination input produced `page=Infinity`, `skip=Infinity` (`PG-01`).
- Claim evidence accepted claimant-authored questions and scored a synthetic payload 95/100 “strong” (`CR-01`).
- Profile password validator returned boolean `true` while the consumer expected `{isValid,message}`, deterministically blocking the API call (`PW-01`).

All probes used local ephemeral/test objects and printed no secrets.

## Explicitly unavailable evidence

- Chrome DevTools performance MCP is not configured; Core Web Vitals, network-chain, and accessibility-tree trace values were not measured.
- No isolated Mongo replica-set URI was provided for concurrency/fault-injection validation.
- No load/soak run or production database query profiler evidence exists for performance candidates.
- Provider configuration/topology evidence remains required for the candidates marked deferred/external.

Passing tests/build demonstrate baseline integrity; they do not suppress independently proven control-flow/runtime findings.
