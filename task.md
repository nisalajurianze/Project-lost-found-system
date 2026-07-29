# Goal: Full lost-and-found release readiness

## Locally completed

- [x] Deep-read the frontend, backend, deployment configuration, and release artifacts
- [x] Fix the confirmed Vercel icon build failure, validation/reminder defects, unsafe internal navigation, retry duplication, and mobile touch-target issues
- [x] Trace and harden login, CSRF, cookies, CORS, redirects, and authenticated-state confirmation
- [x] Add regression coverage and pass backend tests/syntax plus frontend tests/lint/production build
- [x] Verify public desktop/mobile routes and both successful and blocked-cookie login behavior in a browser
- [x] Refresh the deep-audit report, SBOM/license inventory, release manifest, and source hashes
- [x] Reconcile the 2026-07-28 deployment audit with current 2026-07-29 source, test, CI, and provider evidence
- [x] Refresh exact clean-install audits, move upload handling to `multer@2.2.0`, and remove the desktop footer/assistant collision
- [x] Repair Vercel-to-Railway same-origin API and Socket.IO polling rewrites before the SPA fallback

## Required before production sign-off

- [ ] Commit and push the current working-tree fixes so PR #4 and provider deployments contain them
- [ ] Pass CI/build checks on that new commit
- [ ] Verify the live Railway backend with production MongoDB replica set, Redis, Cloudinary, email, readiness, and logs
- [ ] Verify the live Vercel frontend with final API/socket origins and cross-site cookie behavior, preferably on same-site custom domains
- [ ] Run authenticated user/admin, email, image, socket, push, AI-provider, backup/restore, and rollback journeys with real provider credentials

Current stance: locally verified release candidate; not yet production-certified.
