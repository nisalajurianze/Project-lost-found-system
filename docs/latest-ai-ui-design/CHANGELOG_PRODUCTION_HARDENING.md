# Production Hardening Changelog

## Security and identity

- Replaced browser-persisted JWTs with HttpOnly cookie sessions.
- Added opaque hashed refresh sessions, rotation, reuse detection, family revocation, and session invalidation events.
- Added double-submit CSRF enforcement and exact CORS origins.
- Hashed verification/reset tokens and moved frontend links to URL fragments.
- Enforced strong passwords and verified Google email identities.
- Added last-active-admin transaction guards and safe account anonymization.

## Privacy and workflows

- Added public/private serializers for users, reports, matches, and claims.
- Made claim evidence private authenticated media with temporary signed access.
- Rebuilt claim and handover updates around MongoDB transactions and exact match ownership.
- Added bounded matching candidates, decision preservation, durable outbox processing, idempotent notifications, and distributed job locks.
- Added typed settings and category normalization/migration safeguards.

## Reliability and operations

- Added production readiness checks for MongoDB replica-set support, Redis, Cloudinary, and email.
- Added graceful shutdown of HTTP, Socket.IO, MongoDB, Redis, and workers.
- Replaced destructive seeds with idempotent defaults, explicit admin bootstrap, and guarded migration.
- Added Node 22 non-root containers, same-origin Nginx proxy, authenticated Redis, and replica-set Compose.
- Added security/static/integration tests, release hygiene verification, CodeQL, secret scanning, Linux build, and Compose smoke CI gates.

## Frontend correctness

- Removed local-storage authentication and query-token handling.
- Removed invented metrics, hardcoded deployment URLs, false contact submissions, external avatar fallbacks, and unsafe service-worker caching.
- Aligned password validation and provider feature flags.
- Corrected native button behavior, keyboard interactions, custom select semantics, image-upload controls, and profile-image labeling.
