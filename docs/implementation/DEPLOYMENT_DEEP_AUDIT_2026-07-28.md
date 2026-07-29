# Deployment Deep Audit — 2026-07-28 (current evidence refreshed 2026-07-29)

## Scope

This audit covers the Vercel frontend build failure, Railway backend startup validation, locked frontend dependencies, environment examples, cookie/CORS/CSRF behavior, container health paths, Vercel configuration, CI evidence, and release documentation. The original 2026-07-28 findings below were rechecked against the current working tree on 2026-07-29.

## Corrections present in the current working tree

| Finding | Correction |
|---|---|
| Lucide export mismatch blocked Vercel | Uses canonical `AlertTriangle` and exactly locks `lucide-react@0.545.0`; regression tests verify every named Lucide import exists in the installed package. |
| Railway email startup loop | Production validation requires `EMAIL_FROM` to be a valid, non-placeholder, CR/LF-free sender address when email is required. |
| Container health check | Backend Docker health check uses the runtime `PORT`; Compose checks `/api/health/ready`. |
| Vercel runtime and headers | Frontend requests Node 22, keeps SPA routing, and emits baseline security headers without blocking the app's camera or microphone workflows. |
| Legacy auth artifacts | Removed the unused plaintext refresh-token helper and unused browser token-storage constant. |
| Split Vercel/Railway password login | Production cookies default to `SameSite=None; Secure`; login confirms `/auth/me` before authenticated state is accepted and reports blocked-cookie failure clearly in English, Sinhala, and Tamil. |
| Vercel API/Socket routing | Ordered same-origin `/api/*` and Socket.IO polling rewrites proxy to the verified Railway origin before the SPA fallback; this prevents API requests from receiving `index.html`. |
| Untrusted frontend navigation | Same-origin internal-path validation now rejects absolute, scheme-relative, backslash, encoded-separator, and control-character paths before router navigation. |
| API query and reminder correctness | Added explicit list/admin/location/claim validation and marks resolution reminders sent only after delivery succeeds for every participant. |

## Current local verification

- Backend syntax: passed for 123 JavaScript files.
- Backend tests: 61 passed; 1 replica-set refresh-race integration test skipped.
- Frontend lint: passed.
- Frontend tests: 101/101 passed.
- Frontend Vite 8.1.3 production build: passed with 2,781 modules transformed.
- Installed Lucide named-export verification: passed with `lucide-react@0.545.0`.
- Public desktop/mobile browser sweep: passed on five sampled desktop routes plus mobile home without framework overlays, page errors, horizontal overflow, undersized sampled mobile targets, or footer/assistant collisions.
- Browser login verification: confirmed both a successful cookie session reaching `/dashboard` and a blocked-cookie path remaining safely on `/login` with a clear error.
- Backend production dependency audit: 0 vulnerabilities.
- Frontend production dependency audit: 2 moderate React Router advisories remain. The available automatic fix requires a breaking major upgrade; the current SPA avoids the affected SSR hydration path and applies tested internal-navigation hardening.
- Upload middleware is verified on `multer@2.2.0`; a controlled `react-router-dom@7.18.2` audit probe was rejected because it introduced two high RSC CSRF findings.
- Compose interpolation, document validation, and release hygiene/import/secret/symlink checks: passed.
- Local container-stack execution: not run because Docker Desktop is unavailable.

## GitHub and provider boundary

- PR #4 is open from `fix/vercel-build-and-email-config` to `main` at committed head `fbd39a5`.
- All reported checks on `fbd39a5` pass, including frontend/backend, Mongo integration, container/auth smoke, release hygiene, CodeQL, and secret scan.
- The 2026-07-29 deep-audit and login changes are still uncommitted working-tree changes after `fbd39a5`; they are not yet covered by those CI results and cannot trigger Railway or Vercel.

## Target-environment actions still required

1. Commit and push the current working tree, then require the full CI/security workflow to pass on that exact commit.
2. Railway: set a provider-verified `EMAIL_FROM`, configure `/api/health/ready`, and verify MongoDB replica-set, authenticated Redis, Cloudinary, email, readiness, and logs.
3. Vercel: use `frontend` as root, Node 22.x, `npm ci`, `npm run build`, and `dist`; set full `VITE_API_URL` and `VITE_SOCKET_URL` values for split hosting.
4. Prefer same-site custom domains such as `app.yourdomain.com` and `api.yourdomain.com`. Default Vercel/Railway domains depend on cross-site cookies and can be blocked by browser third-party-cookie policy.
5. Run authenticated user/admin, email, image, socket, push, AI-provider, backup/restore, rollback, browser/mobile, accessibility, and institutional approval checks before production certification.

## Release classification

The current working tree is a locally verified release candidate, not a production-certified release. Production certification belongs only to the exact committed checksum that passes CI, live provider, infrastructure, authenticated-browser, recovery, and institutional gates.
