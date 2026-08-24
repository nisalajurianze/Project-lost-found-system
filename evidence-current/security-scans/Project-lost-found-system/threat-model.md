# Smart Lost & Found Repository Threat Model

## Overview

Smart Lost & Found is a privacy-sensitive university lost-and-found platform. The primary runtime is a React/Vite browser application backed by a Node.js/Express API, MongoDB, Redis, Socket.IO, Cloudinary, transactional email, web push, Google OAuth, and an optional external AI provider. Guests can search privacy-reduced reports and use limited advisory chat. Authenticated users create and manage reports, claims, matches, notifications, profiles, evidence, and handover workflows. Reporters and administrators review claims; administrators additionally manage users, locations, settings, categories, feedback, audit logs, and AI feedback.

The deployed product surfaces are `frontend/src`, `backend/server.js`, backend routes/controllers/services/models, Socket.IO, scheduled/outbox workers, provider integrations, Vercel routing, Railway/container configuration, and CI/release workflows. Tests, documentation, release scripts, and academic artifacts are developer or operator surfaces unless they influence builds, deployment, secrets, or release integrity.

## Threat Model, Trust Boundaries, and Assumptions

### Assets and privileges

- User and administrator accounts, password hashes, refresh-session hashes, JWT signing material, reset and verification tokens.
- Personal data: email, phone, student ID, report ownership, location, connected-user relationships, notification preferences, IP address, and user agent.
- Private claim evidence, authenticated Cloudinary identifiers, signed evidence URLs, report images, and handover/contact decisions.
- Administrator actions, audit logs, moderation decisions, location verification, system settings, and role/status management.
- MongoDB integrity across transaction-backed report, claim, match, session, and workflow state.
- Redis-backed rate limiting, realtime fan-out, job coordination, caching, and provider availability signals.
- Cloudinary, email, web-push, OAuth, and AI credentials; build/deployment credentials and release artifacts.
- Availability of public search, authentication, reporting, claim review, matching, notifications, scheduled retention, and outbox processing.

### Trust boundaries

1. **Untrusted browser to frontend/API:** all URLs, query strings, forms, uploads, cookies, headers, Socket.IO handshakes, localization input, and AI-chat prompts can be attacker-controlled.
2. **Guest to authenticated user:** cookie sessions, refresh rotation, CSRF, verification, account state, and optional authentication separate public from user-specific data.
3. **User to resource owner/reporter:** object-level authorization must protect reports, claims, matches, notifications, evidence, contact sharing, and handover state.
4. **User/reporter to administrator:** centralized role authorization must protect user management, logs, settings, categories, location approval, feedback review, and AI health/feedback.
5. **API to MongoDB/Redis:** database queries, transactions, atomic claims, distributed locks, rate-limit state, cache keys, and Socket.IO state must not be controllable through unsafe user syntax.
6. **API to external providers:** Cloudinary, email, OAuth, push, and AI requests cross external trust boundaries. Secrets must remain server-side; timeouts, schema validation, delivery idempotency, and privacy minimization are required.
7. **Public media to private evidence:** public report imagery and authenticated claim evidence have different disclosure requirements and storage/delivery controls.
8. **Web process to background work:** cron and outbox execution can be duplicated across instances. Distributed locks, atomic claiming, dedupe keys, idempotency, retry bounds, and worker-placement configuration preserve correctness.
9. **Source/CI to production:** GitHub Actions, Dockerfiles, Vercel rewrites, Railway settings, environment variables, manifests, hashes, and backups determine whether reviewed code and secure configuration reach production.

### Input ownership

- **Attacker-controlled:** public searches, pagination/filter parameters, report and claim content, filenames and image bytes, AI prompts, push-subscription payloads, OAuth tokens supplied by clients, cookies/CSRF headers, object IDs, workflow decisions, feedback, location suggestions, and Socket.IO connection metadata.
- **Operator-controlled:** production environment variables, provider endpoints and credentials, allowed origins, cookie policy, retention, worker enablement, AI models, email sender, Redis/MongoDB URLs, deployment routing, backups, and migrations.
- **Developer-controlled:** dependencies, CI workflows, Docker build contexts, OpenAPI/docs, seed/bootstrap scripts, test fixtures, migrations, release packaging, and source changes.

### Security invariants

- Public serializers never reveal private contact data, evidence, provider identifiers, relationship IDs, or session/auth material.
- Every user-specific object operation enforces server-side ownership, participant status, reporter authority, or administrator role.
- State-changing cookie-authenticated requests require valid CSRF protection; auth and refresh cookies remain HttpOnly and production cookies remain Secure.
- Refresh tokens are random, stored only as hashes, rotated transactionally, and family-revoked on replay.
- Password/reset/OAuth flows are rate-limited, validated, non-enumerating where required, and never log secrets.
- Uploads are bounded by size/count, checked by allowed MIME type and magic bytes, segregated by privacy class, and cleaned up safely on rollback/replacement.
- MongoDB queries never accept attacker-controlled operators or unsafe aggregation/query syntax; reads are bounded and sensitive projections are explicit.
- Claim approval, contact sharing, matching, handover, role changes, suspension, and AI-assisted decisions remain authorized and auditable; AI output is advisory and never ownership proof.
- External provider failures fail closed for sensitive actions and preserve manual report/search workflows.
- Background processing is atomic or locked, idempotent, bounded, and safe under retries, crashes, and multiple instances.
- Production fails closed when required database, Redis, media, email, cookie, origin, signing-secret, or transaction controls are unsafe.
- Build and release artifacts exclude populated environment files and secrets and correspond to an exact reviewed commit/checksum.

### Assumptions and out-of-scope stories

- Managed MongoDB, Redis, Vercel, Railway, Cloudinary, email, OAuth, and push providers are assumed not fully compromised. Misconfiguration and credential leakage remain in scope.
- A malicious administrator can exercise intended administrative powers; privilege escalation into admin, missing auditability, or unauthorized access outside those powers is in scope.
- Physical device compromise, malicious browser extensions, and university identity-proofing failures outside the application are not fully preventable, but long-lived client storage and unnecessary disclosure must not amplify them.
- AI-model correctness is not a security boundary. Provider prompt injection matters when it can expose private data, bypass authorization, or trigger server actions; ordinary inaccurate suggestions are quality/reliability issues.

## Attack Surface, Mitigations, and Attacker Stories

### Authentication, sessions, and CSRF

Attackers may enumerate users, brute-force credentials, replay refresh tokens, forge OAuth identities, inject redirects, steal/reset credentials, or exploit inconsistent cookie/CSRF settings. Existing controls include route-specific rate limits, bcrypt, lockout, timing-safe dummy comparisons, HttpOnly access/refresh cookies, opaque hashed refresh sessions, family replay revocation, token hashing, safe internal redirects, exact CORS origins, CSRF cookie/header validation, production cookie validation, and transaction requirements.

### Authorization and privacy

The most consequential application attacks are IDOR/BOLA against reports, claims, matches, notifications, evidence, contact sharing, settings, and admin actions. Guest `optionalAuth` routes require special scrutiny because response shape changes by viewer. Existing mitigations include route guards, role middleware, controller ownership/participant checks, public serializers, authenticated evidence delivery, signed URLs, and admin logs. Each sibling endpoint still requires independent verification.

### Uploads and media

Attackers can submit oversized files, misleading extensions/MIME values, malformed images, decompression-heavy content, public/private path confusion, or orphan provider assets. Existing controls include Multer limits, memory storage, MIME allowlists, signature checks, file-count limits, authenticated claim evidence, segregated provider folders, redaction/image processing, and rollback cleanup. Image parsers/providers remain availability and privacy boundaries.

### Injection and external requests

Search, filtering, IDs, settings, AI endpoints, location aliases, push payloads, and provider endpoints can lead to NoSQL injection, SSRF, header injection, prompt injection, unsafe redirects, or stored content issues. Existing controls include express-validator contracts, Mongo sanitization, URL protocol checks for AI providers, CR/LF rejection for email senders, React escaping, safe Markdown rendering, and constrained internal navigation. Dynamic query construction, operator-controlled URLs, Markdown/link behavior, and provider payload minimization require review.

### Realtime, jobs, and race conditions

Socket.IO can expose user rooms or accept unauthenticated connections; rate-limit state and events can be duplicated. Cron/outbox concurrency can send duplicate notifications or process stale work. Existing controls include authenticated Socket.IO initialization, Redis adapter support, atomic outbox claims, dedupe keys, distributed job locks, retries/dead-letter state, MongoDB transactions, and shutdown handlers. Lock TTLs, stale-claim windows, idempotency, and multi-instance behavior are important failure modes.

### Frontend and browser

Threats include XSS through Markdown or URLs, unsafe client persistence, open redirects, stale auth state, CSRF token mishandling, privacy leakage in drafts/images, service-worker/cache mistakes, clickjacking, and third-party-cookie failures. Existing mitigations include React escaping, `react-markdown`, safe internal paths, user-scoped draft keys, image redaction, object-URL cleanup, restrictive headers/CSP, and same-origin proxying. Browser tests and dependency behavior remain important evidence.

### CI, deployment, and operations

Threats include committed secrets, dependency compromise, unreviewed deploys, wrong rewrite order, insecure runtime user/filesystem, missing health gates, unsafe bootstrap/migration, stale release evidence, and untested restore/rollback. Existing controls include secret scanning, CodeQL/dependency review, clean installs, audits, container/auth smoke tests, non-root/read-only containers, readiness gates, explicit admin bootstrap, release verification, and documented backup/rollback requirements. Live provider, restore, rollback, load, and institutional acceptance remain external evidence boundaries.

## Severity Calibration (Critical, High, Medium, Low)

### Critical

- Unauthenticated or ordinary-user access to all private claim evidence, refresh/session material, signing/provider secrets, or unrestricted administrator role assignment.
- Remote code execution through uploads, parsers, dependency/build compromise, or an externally reachable command/evaluation sink.
- A production-wide authentication bypass or mass account takeover requiring little user interaction.

### High

- Cross-user IDOR exposing private evidence/contact data or allowing claim approval, handover, report deletion, role/status changes, or session revocation.
- Refresh-token replay or reset/OAuth flaws enabling targeted account takeover.
- Public/private media confusion exposing authenticated evidence, or provider/SSRF behavior leaking credentials/internal data.
- Stored XSS reachable by users or administrators with meaningful account/action impact.
- Reliable multi-instance worker races causing duplicate irreversible notifications/actions or corruption despite existing coordination controls.

### Medium

- Bounded user enumeration, CSRF on meaningful state changes, missing rate limits that enable practical abuse, privacy leakage of lower-sensitivity metadata, or persistent integrity issues limited to one user/workflow.
- Unbounded or unindexed attacker-triggered queries, image-processing resource exhaustion, cache/rate-limit fail-open behavior, or repeated provider calls causing material availability/cost impact.
- CI/deployment weaknesses that need developer/operator access but can ship unreviewed or stale artifacts.

### Low

- Security-header, logging, documentation, or observability gaps with limited direct exploitability.
- Restart-local circuit-breaker/metrics state, minor information disclosure, developer-only unsafe defaults that production validation blocks, or performance inefficiencies without a realistic attacker-controlled hot path.
- Optional hardening where existing layered controls already prevent meaningful exploitation.
