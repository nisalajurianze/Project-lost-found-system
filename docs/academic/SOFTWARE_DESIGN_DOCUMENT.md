# Software Design Document

## Architecture
React/Vite PWA communicates with an Express/Socket.IO API. MongoDB is authoritative; Redis provides cache, locks and scalable socket/queue support. Cloud/object storage holds images, email/push providers deliver notifications, and AI providers are accessed through a backend-only adapter with circuit breaker and deterministic fallback.

## Backend layers
Routes → validation/auth/rate limiting → controllers → domain services/state machines → models/repositories. Serializers provide public/participant/approved-contact views. Transactional operations update claims, matches and items; an outbox handles external side effects.

## Key services
- Session service: hashed refresh sessions, rotation/reuse rejection and revocation.
- Item workflow: legal status transitions only.
- Matching: indexed candidate prefilter plus explainable dimensions.
- Chat search: multilingual expansion, bounded fuzzy retrieval and pagination.
- Image privacy/analysis: schema-validated metadata and masked OCR/redaction regions.
- Report intelligence: completeness and own-account duplicate advice.
- Claim verification/risk: context questions, evidence quality and advisory flags.
- Location intelligence: static verified data + approved versioned community records.
- AI governance: pending correction records and admin approval.

## Data consistency
MongoDB transactions are required for claim approval/rejection, match decision and connection/handover state. External notifications must be idempotent and replayable through outbox keys. Category/report derived counts should be aggregated or reconciled.

## Security boundaries
Browser never receives provider keys or refresh tokens. Public APIs use privacy serializers. Private evidence is accessed only by participants/admins and should use signed URLs. Uploaded files are size/MIME/magic-byte checked. Logs redact tokens/links and sensitive payloads.

## Availability
Core reporting/search remains usable without AI. Redis failure degrades cache/realtime while database operations continue. Provider retry budgets and circuit breakers prevent long request chains. Readiness checks distinguish process health from dependency readiness.

## Deployment
Node 22 images, non-root runtime, HTTPS reverse proxy, authenticated MongoDB replica set/Redis, restricted network access, secret manager, migration job, lifecycle worker and monitored backups. See architecture diagrams and deployment runbook.
