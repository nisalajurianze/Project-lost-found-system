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

- [x] Commit, push, merge, and pass CI for the release-hardening and same-origin deployment fixes through PRs #4-#6
- [x] Verify the live Vercel frontend serves the final SPA, Railway-backed `/api/*`, CSRF cookies, and the Socket.IO Engine.IO handshake without fallback HTML
- [x] Merge the desktop-navbar 44 px target correction through PR #7 and verify the production desktop/mobile render
- [ ] Verify the live Railway backend with production MongoDB replica set, Redis, Cloudinary, email, readiness, and logs
- [ ] Confirm Railway has deployed the latest backend validation/auth commit rather than only the previously healthy service revision
- [ ] Run authenticated user/admin, email, image, socket, push, AI-provider, backup/restore, and rollback journeys with real provider credentials

Current stance: merged Vercel deployment path and final navbar accessibility increment are live and verified; Railway revision proof and target-environment certification gates remain in progress.
