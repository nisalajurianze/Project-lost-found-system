# Deployment Guide

## Required architecture

Use HTTPS at the edge and serve the frontend and API from the same site when possible. MongoDB must run as a replica set. Redis, Cloudinary, and a transactional email provider are required for the production profile. Run background jobs on only the configured worker instances; distributed locks still protect against accidental overlap.

## Pre-deployment

1. Rotate all credentials listed in `SECURITY_ROTATION_REQUIRED.md`.
2. Configure a secret manager; do not upload `.env` files.
3. Provision MongoDB with point-in-time backups and a tested restore target.
4. Provision authenticated Redis with persistence appropriate to the workload.
5. Configure Cloudinary authenticated delivery for private proof evidence.
6. Configure Resend or SMTP, Google OAuth, and VAPID as needed.
7. Set `NODE_ENV=production`, HTTPS `CLIENT_URLS`, `COOKIE_SECURE=true`, and a random `JWT_ACCESS_SECRET` of at least 32 characters.
8. Keep `REQUIRE_MONGO_REPLICA_SET`, `REQUIRE_REDIS`, `REQUIRE_CLOUDINARY`, and `REQUIRE_EMAIL_PROVIDER` enabled.

## Release procedure

```bash
cd backend && npm ci && npm run check && npm test && npm audit --omit=dev
cd ../frontend && npm ci && npm run lint && npm test && npm run build && npm audit --omit=dev
cd ..
docker compose build --no-cache
```

Run the migration against a restored production backup first. Deploy to staging, execute the complete checklist in `VERIFICATION.md`, then promote the exact immutable images and source checksum that passed.

## Health endpoints

- `/api/health` — process liveness
- `/api/health/ready` — MongoDB, replica-set, Redis, media, and email readiness

The load balancer must send traffic only when readiness succeeds.

## Rollback

Keep the previous immutable images and database compatibility notes. Stop workers before schema rollback. Restore data only from a verified backup when a forward fix is not safe. Record timestamps, release hashes, and operator actions.
