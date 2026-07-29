# Deployment Guide

## Required architecture

Use HTTPS at the edge and serve the frontend and API from the same site when possible. MongoDB must run as a replica set. Redis, Cloudinary, and a transactional email provider are required for the production profile. Run background jobs on only the configured worker instances; distributed locks still protect against accidental overlap.

## Pre-deployment

1. Rotate all credentials listed in `SECURITY_ROTATION_REQUIRED.md`.
2. Configure a secret manager; do not upload `.env` files.
3. Provision MongoDB with point-in-time backups and a tested restore target.
4. Provision authenticated Redis with persistence appropriate to the workload.
5. Configure Cloudinary authenticated delivery for private proof evidence.
6. Configure Resend or SMTP, and set `EMAIL_FROM` to a sender address/domain verified by that provider. Configure Google OAuth and VAPID as needed.
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

## Vercel frontend + Railway backend deployment

The recommended split-host deployment uses two HTTPS subdomains under the same registrable domain:

- Frontend: `https://app.yourdomain.com` on Vercel
- Backend: `https://api.yourdomain.com` on Railway

This keeps cookie requests same-site while retaining separate hosting. Using default `*.vercel.app` and `*.up.railway.app` domains makes authentication cross-site and can be affected by browser third-party-cookie restrictions.

The current Vercel deployment therefore keeps the browser on same-origin `/api` and `/socket.io` paths. Ordered external rewrites in `frontend/vercel.json` proxy those paths to the Railway backend before the SPA fallback. Do not move the catch-all rewrite above the API or Socket.IO rules; doing so returns `index.html` for API requests and breaks authentication.

### Vercel project settings

Set the project root directory to `frontend` and use:

```text
Install Command: npm ci
Build Command: npm run build
Output Directory: dist
Node.js: 22.x
```

Set these production variables and redeploy after every change:

```text
VITE_API_URL=https://api.yourdomain.com/api
VITE_SOCKET_URL=https://api.yourdomain.com
VITE_GOOGLE_CLIENT_ID=<same Google OAuth client configured on the backend, when enabled>
```

Do not omit `VITE_API_URL` or `VITE_SOCKET_URL` in a split deployment. The source defaults are same-origin (`/api` and the current browser origin), which are correct for the included Nginx/Docker deployment but would otherwise point API and Socket.IO traffic back to Vercel.

`frontend/vercel.json` preserves SPA routing and supplies baseline browser headers. Camera and microphone are restricted to the application origin because photo capture and the explicit voice-input action are legitimate product features. Add a domain-specific CSP only after final frontend, API, image, OAuth, and WebSocket origins are known and tested.

### Railway backend settings

Set the Railway service root directory to `backend`. The service must start with `npm start` or the included Dockerfile and listen on Railway's injected `PORT` variable. Configure the healthcheck path as:

```text
/api/health/ready
```

The readiness route returns HTTP 200 only when every required dependency is ready. Production defaults require MongoDB transaction support, Redis, Cloudinary, and email unless an explicit `REQUIRE_*` override is used for a temporary non-public test environment.

Recommended production variables:

```text
NODE_ENV=production
CLIENT_URLS=https://app.yourdomain.com
JWT_ACCESS_SECRET=<at least 32 random characters>
COOKIE_SECURE=true
COOKIE_SAME_SITE=lax

MONGO_URI=<MongoDB replica-set connection string>
REQUIRE_MONGO_REPLICA_SET=true
REDIS_URL=<authenticated Redis URL>
REQUIRE_REDIS=true
CLOUDINARY_CLOUD_NAME=<value>
CLOUDINARY_API_KEY=<value>
CLOUDINARY_API_SECRET=<value>
REQUIRE_CLOUDINARY=true
RESEND_API_KEY=<secret key, or use complete SMTP settings instead>
EMAIL_FROM=Smart Lost & Found <noreply@mail.yourdomain.com>
REQUIRE_EMAIL_PROVIDER=true
```

`EMAIL_FROM` must be a valid, non-placeholder sender without CR/LF characters. For Resend public delivery, use a sender under a verified domain.

### Temporary default-domain setup

For short-lived testing with exact Vercel and Railway URLs:

```text
# Vercel
VITE_API_URL=https://your-api.up.railway.app/api
VITE_SOCKET_URL=https://your-api.up.railway.app

# Railway
CLIENT_URLS=https://your-project.vercel.app
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
```

This is not the preferred public architecture. `SameSite=None` requires `Secure`, and browsers may still restrict third-party cookies because the provider domains are different sites.

### Verification order

1. Deploy the `lucide-react@0.545.0` compatibility fix and redeploy Vercel with a cleared build cache if necessary.
2. Add a valid `EMAIL_FROM` and redeploy Railway.
3. Verify Railway `/health`, `/api/health`, and `/api/health/ready`.
4. Confirm the readiness response reports MongoDB replica-set, Redis, Cloudinary, and email as ready.
5. Verify Vercel has complete API and Socket.IO variables, then redeploy.
6. Test CSRF issuance, registration, verification email, login, report image upload, Socket.IO notifications, password reset, claims, and handover.
7. Run `npm audit --json` and `npm audit --omit=dev --json` in both workspaces. Review exact dependency paths before upgrades; never use `npm audit fix --force` without regression testing.
8. Run browser/mobile and accessibility UAT before promoting the checksum.
