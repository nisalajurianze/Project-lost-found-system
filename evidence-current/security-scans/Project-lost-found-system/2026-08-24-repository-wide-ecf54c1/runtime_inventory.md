# Runtime Inventory — Smart Lost & Found

- Scan session started at application commit `ecf54c1`; the directory name is retained as the immutable session identifier.
- Current committed discovery target: `7499a19` with `main == origin/main` and a clean worktree at Phase-2 closure.
- The full application delta `ecf54c1..7499a19` was explicitly reconciled. It includes the Redis-readiness default change (`CF-01`), Helmet opener-policy hardening, populated-reference route fixes, Mongo-id UI gating, empty-query cleanup, validator `checkFalsy` handling, and admin layout/CSS refinements. No application delta remains unreviewed at this checkpoint.
- Evidence files and `task.md` are audit artifacts in the same history, not application behavior. Final validation must re-check exact HEAD/tree stability and must not describe discovery alone as a release certificate.
- Threat model: `threat-model.md` in this directory
- Primary deployment: Vite/React SPA on Vercel; Node/Express API on Railway

## Deployed entrypoints

| Boundary | Entrypoint/control | Attacker-controlled inputs | Privileged sinks/assets |
|---|---|---|---|
| HTTP API | `backend/server.js`, `backend/routes/*.js` | path/query/body/headers/cookies/files | MongoDB, Redis, Cloudinary, email, push, AI provider |
| Auth/session | `authRoutes`, `authController`, auth/CSRF/rate-limit middleware, `sessionService` | credentials, OAuth token, refresh cookie, reset tokens | accounts, JWT/refresh families, roles, verified/status fields |
| Public reports/search | lost/found/category/location routes and controllers | filters, pagination, IDs, report data | public/private serializers, report ownership, media |
| Claims/matches/handover | claim/match routes, controllers, workflow services | object IDs, evidence, decisions, transitions | private evidence/contact data, approval/handover state |
| Admin | admin/settings/location/category/feedback/AI-feedback routes | IDs, role/status/settings changes | user state, audit logs, system configuration |
| Upload/media | upload middleware, image/cloudinary/privacy services | bytes, MIME, file names, transformations | parser resources, public/private provider objects |
| AI/chat | AI routes/controllers/provider/search/report services | prompt, image, search/refinement data | external provider, stored feedback, user/report context |
| Realtime | Socket.IO config/service/hooks | cookies/handshake/event metadata | user rooms, notifications, Redis adapter |
| Background work | cron, cleanup/reminder jobs, outbox/job-lock services | persisted records and schedule | email/push delivery, retention, workflow transitions |
| Browser SPA | `frontend/src/main.jsx`, `App.jsx`, routes, services, contexts | URL, storage, server content, Markdown, uploads | authenticated actions, drafts, private state, push/Socket.IO |
| Service worker | `frontend/public/sw.js` | cached/request URLs, push payloads | browser cache and notifications |

## Security-sensitive configuration and privileged surfaces

- MongoDB: `backend/config/db.js`; transaction and availability assumptions.
- Redis: `backend/config/redis.js`; rate limiting, locks, cache, Socket.IO coordination.
- Cookies/CORS/CSP/CSRF: `backend/config/security.js`, server/middleware/util cookie code.
- Cloudinary/media: cloudinary config/service plus upload and privacy/image processing.
- External providers: email, web push, Google OAuth, optional AI provider endpoint/model.
- Deployment/CI: `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `backend/railway.json`, `frontend/vercel.json`, `.github/workflows/*.yml`.
- Operator scripts: admin bootstrap and production migration scripts; not public HTTP entrypoints but privilege-bearing.

## Data and query boundaries

- Mongoose models under `backend/models`; controllers/services build filters, pagination, projections, transitions, and transactions.
- Redis keys/state in cache, rate-limit, session/realtime, job-lock, and provider availability paths.
- Public serializers and signed evidence/media URLs separate public and private data.

## Parsing, execution, filesystem, and network families

- Image bytes are parsed/transformed in upload/image privacy/analysis/comparison services and sent to Cloudinary/AI providers.
- Server-side outbound network calls exist for AI/provider, OAuth, Cloudinary, email, push, and possibly health probes; provider URLs are operator-configured but must remain constrained.
- No intended general shell/eval/template execution boundary. Any reachable `child_process`, `eval`, dynamic code loading, unsafe template execution, archive extraction, or attacker-selected filesystem path is a high-impact candidate.
- React rendering and Markdown/link handling are browser execution boundaries; DOM HTML injection, unsafe URLs, open redirect, client persistence, and privacy leakage require review.

## Initial exclusions

- `node_modules`, build output, coverage, Playwright reports/results, caches, lockfiles, docs, academic/release prose, unit/E2E tests, screenshots, examples, and historical evidence are excluded from the application-code checklist.
- Developer-only seed/check-syntax scripts are excluded unless a runtime/deployment path reaches them.
- CI/deploy/config files are reviewed as privileged surfaces and represented in the coverage ledger, but not counted as application-code checklist rows.

## Scan obligations

- Fully review every application-code checklist file.
- Close every ledger row as `reportable`, `suppressed`, `not_applicable`, or `deferred` with exact evidence.
- Run dependency/secret/config verification after high-impact discovery.
