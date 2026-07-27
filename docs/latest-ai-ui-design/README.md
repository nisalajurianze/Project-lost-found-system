<p align="center">
  <img src="./docs/animated-logo.svg" width="180" alt="Smart Lost & Found logo" />
</p>

# Smart Lost & Found Management System

A university lost-and-found platform built with React, Node.js, Express, MongoDB, Redis, Socket.IO, Cloudinary, and optional external image analysis. The hardened release uses cookie-based sessions, CSRF protection, private claim evidence, transaction-backed workflows, durable background jobs, and role-aware data serializers.

## Requirements

- Node.js 22.12 or newer
- MongoDB 7 replica set
- Redis 7 or newer
- Cloudinary account for media in production
- Resend or SMTP account for transactional email in production
- Docker Engine with Compose for the recommended local stack

## Quick start with Docker

1. Create a root `.env` containing strong values for `JWT_ACCESS_SECRET` and `REDIS_PASSWORD`.
2. Add optional provider credentials required by your deployment.
3. Start the stack:

```bash
cp backend/.env.example backend/.env
docker compose build --no-cache
docker compose up -d
docker compose ps
```

The frontend is exposed at `http://localhost:3000` by default. The frontend reverse-proxies `/api` and `/socket.io` to the backend, which keeps authentication same-origin.

## Manual development

```bash
cd backend
npm ci
npm run seed:defaults
npm run dev
```

```bash
cd frontend
npm ci
npm run dev
```

Use a local MongoDB replica set. Normal standalone MongoDB mode is intentionally rejected when transaction support is required.

## Safe initialization

```bash
cd backend
npm run seed:defaults
npm run admin:bootstrap
```

`seed:defaults` is idempotent and does not delete user data. `admin:bootstrap` requires an explicitly supplied strong password and confirmation; the application never promotes a hardcoded account during startup.

For an existing installation, follow [`MIGRATION.md`](./MIGRATION.md) before deployment.

## Verification commands

```bash
cd backend
npm run check
npm test
npm audit --omit=dev
```

```bash
cd frontend
npm run lint
npm test
npm run build
npm audit --omit=dev
```

```bash
docker compose build --no-cache
docker compose up -d
curl --fail http://localhost:3000/api/health/ready
```

The CI workflow performs clean dependency installation, source checks, tests, a Linux production build, database integration checks, container builds, and a proxied authentication smoke test.

## Security architecture

- Short-lived access JWT in an HttpOnly cookie
- Opaque refresh tokens stored only as hashes with rotation and reuse detection
- Double-submit CSRF protection on state-changing requests
- Exact CORS origin allowlist and secure production cookie requirements
- Public serializers that redact private contact and relationship data
- Authenticated Cloudinary assets and short-lived signed URLs for claim evidence
- MongoDB transactions for claim approval, match decisions, session rotation, and report lifecycle changes
- Durable outbox events and distributed job locks
- No hardcoded administrator credentials or destructive startup seeds
- Non-root, read-only production containers where supported

See [`SECURITY.md`](./SECURITY.md) and [`OPERATIONS.md`](./OPERATIONS.md).

## Release status

The source-level verification results and environment-dependent gates are recorded in [`VERIFICATION.md`](./VERIFICATION.md) and [`PRODUCTION_CERTIFICATION_STATUS.md`](./PRODUCTION_CERTIFICATION_STATUS.md). A release must not be called production-certified until every required gate has evidence from the target staging or production environment.

## Project documents

- [`DEPLOYMENT.md`](./DEPLOYMENT.md)
- [`MIGRATION.md`](./MIGRATION.md)
- [`OPERATIONS.md`](./OPERATIONS.md)
- [`SECURITY.md`](./SECURITY.md)
- [`VERIFICATION.md`](./VERIFICATION.md)
- [`PROJECT_COMPLETION_MATRIX.md`](./PROJECT_COMPLETION_MATRIX.md)
- [`SECURITY_ROTATION_REQUIRED.md`](./SECURITY_ROTATION_REQUIRED.md)

## License

MIT. See [`LICENSE`](../../LICENSE).
