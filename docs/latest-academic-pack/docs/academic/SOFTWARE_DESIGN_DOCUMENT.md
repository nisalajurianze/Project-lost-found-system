# Software Design Document

## Architecture

React/Vite PWA -> same-origin Nginx -> Express API/Socket.IO -> MongoDB replica set + Redis + durable outbox/worker. Optional approved services provide media, email, push, Google authentication, AI inference, and place lookup.

## Trust boundaries

1. Public browser to reverse proxy.
2. Browser cookie/CSRF to API.
3. API to database/cache/providers.
4. Public report data versus private claim/evidence/admin data.
5. AI provider input/output versus validated internal schemas.
6. Admin actions versus normal user permissions.

## Core modules

- Authentication/session/security
- Lost/found item workflow
- Matching and report intelligence
- Chatbot/language/location intelligence
- Claims/handover/private media
- Notifications/email/push/outbox
- AI provider/failover/usage/feedback/review
- Administration/settings/audit
- Cleanup/retention/migrations/backups
- Multilingual accessible frontend/design system

## AI architecture

A provider abstraction accepts configured key/model lists and records bounded usage. Vision output must match strict JSON schemas. Deterministic fallbacks preserve manual operation. Retrieval gathers broad candidates, ranks locally, and sends only bounded privacy-safe facts for optional answer wording. Provider output cannot introduce unsupported records.

## Security design

- opaque access/refresh cookie sessions;
- refresh session hashes/families/reuse revocation;
- CSRF token and exact-origin CORS;
- role checks and database reload;
- input/query/file validation and magic-byte checks;
- authenticated claim media and signed views;
- transactional workflows and unique indexes;
- idempotent notifications/email/outbox;
- strict production configuration/readiness;
- no destructive startup seed or hardcoded promotion.

## Data consistency

MongoDB replica-set transactions protect claim approval, report relationships, category migration, role/status changes, account anonymisation, and state transitions. Outbox events are committed with business data and processed idempotently.

## Frontend design

Task-first navigation, preserved adaptive space animation, 16px base typography, native accessible controls, focus-managed dialogs, four-step report/edit wizard, structured chatbot results, explainable match cards, private claim stepper, attention-first dashboards, responsive admin queues, and public policies.

## Failure modes

- AI unavailable -> manual/deterministic fallback.
- Redis unavailable -> production readiness fails where required; documented local fallback only.
- Email/push failure -> durable retry; committed claim/report state remains authoritative.
- media upload failure -> no partial database commit; replacement uploads before old deletion.
- worker restart -> outbox retains events.
- stale frontend chunk -> controlled retry/reload.
