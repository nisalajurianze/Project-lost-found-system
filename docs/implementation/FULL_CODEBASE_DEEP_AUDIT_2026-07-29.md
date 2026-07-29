# Full Codebase Deep Audit — 2026-07-29

## Release stance

The current working tree is a locally verified release candidate, not a production-certified release. The frontend and backend build/test gates pass, public desktop/mobile routes render cleanly, and the confirmed defects below are remediated. Live Railway/Vercel, authenticated-role, provider, replica-set, and rollback evidence remain required before production sign-off.

## Scope and architecture traced

- Reviewed the React/Vite frontend, Express/Mongoose backend, 15 backend route files and 78 route declarations, shared validation/auth/upload middleware, jobs, provider services, deployment definitions, CI, tests, and release metadata.
- Mapped 383 tracked code/config/documentation files relevant to the release and ran repository-wide security, unsafe-navigation, secret, debugging, input-validation, dependency, and performance scans.
- Traced cookie/CSRF authentication, refresh-token rotation and revocation, item ownership, claims, admin authorization, image upload validation, notification/email delivery, AI advisory boundaries, location governance, and public serializers.
- Rendered public routes at mobile and desktop sizes. Protected and administrator runtime flows were source/test reviewed but were not browser-tested without valid accounts and a running backend.

## Confirmed defects corrected

| Severity | Finding | Correction |
|---|---|---|
| High | Server-shaped AI result/action links and post-login return paths could reach React Router without an application-level internal-path allowlist. | Added canonical same-origin path validation that rejects absolute, scheme-relative, backslash, encoded-separator, and control-character paths; applied it to login redirects, AI Markdown, AI actions/results, and notification links. |
| High | The application-level lazy loader reloaded on every `TypeError` and could enter a permanent refresh loop after a persistent chunk/network failure. | Consolidated both lazy loaders, limited retry to known chunk-load signatures, and persisted a one-retry-per-URL marker before surfacing the error. |
| High | Item/admin filters accepted malformed Mongo IDs and dates, allowing Mongoose cast failures to become 500 responses. Claim `claimantId` and location-governance surfaces also had incomplete route validation. | Added bounded validators for lost/found listing filters and sorting, administrator logs, claim claimant IDs, and all location resolve/suggest/list/review routes. |
| High | Resolution reminders were marked sent when only one participant delivery fulfilled, preventing retry for a failed participant. | The report is now marked reminded only when every eligible participant workflow completes successfully. |
| High | Split Vercel/Railway login could report success locally while production `SameSite=Lax` cookies were omitted from subsequent cross-site API requests. | Production now defaults to `SameSite=None; Secure`; password login confirms `/auth/me` before setting authenticated state and shows a trilingual deployment/session error when the browser blocks the cookie. |
| Medium | Multiple mobile navigation, password, date-filter, footer, and auth links had rendered target dimensions below 44 px. | Normalized shared controls and auth/logo/list links to 44 px minimum interactive targets without changing layout intent. |
| Medium | `react-router-dom` used a caret range while the installed line has unresolved moderate advisories and a forced major upgrade introduced a different high advisory in the tested dependency graph. | Pinned the audited installed pair at `6.30.4` and added the application-level navigation allowlist. No unsafe forced major upgrade was retained. |

## Security and correctness evidence

- Cookie-only browser sessions, CSRF header/cookie enforcement, origin allowlisting, password policy, refresh-family revocation, reset/verification token hashing, and production transaction checks remain in place.
- Uploads remain bounded to five 5 MB images with content-signature validation and Cloudinary transformations.
- Public serializers continue to hide private contact, connection, and claim-evidence data; explicit contact sharing remains workflow-controlled.
- Browser login verification covered both a confirmed cookie session that reached `/dashboard` and a blocked-cookie response that remained safely on `/login` with a clear error.
- Admin, owner, claim, feedback, and location-governance routes were traced for authentication and role/ownership checks.
- Backend production dependency audit: 0 vulnerabilities.
- Frontend production dependency audit: 2 moderate React Router advisories remain; the SPA does not use the SSR hydration mode implicated by one advisory, and untrusted internal navigation is now rejected at the application boundary.
- Upload handling uses the fixed `multer@2.2.0` line. A controlled React Router 7.18.2 probe was rejected because the live audit introduced two high RSC CSRF findings; the pinned 6.30.4 client-only route remains the lower-risk tested boundary.

## Verification results

| Gate | Result |
|---|---|
| Backend syntax | Passed: 123 JavaScript files |
| Backend tests | Passed: 61; skipped: 1 replica-set refresh-race integration test |
| Frontend lint | Passed with zero warnings |
| Frontend tests | Passed: 101/101 |
| Frontend production build | Passed: Vite 8.1.3, 2,781 modules transformed |
| Public browser routes | Passed on five sampled desktop routes plus mobile home: no framework overlay, page error, horizontal overflow, undersized sampled mobile target, or footer/assistant collision after correction |
| Mobile target recheck | Passed: listing date inputs and corrected shared controls render at 44 px minimum |
| Current committed PR checks | PR #4 is open/clean/mergeable; CodeQL, secret scan, frontend, backend, Mongo transaction, container/auth smoke, and release hygiene checks are successful for commit `fbd39a5` |

## Remaining risks and external gates

1. The fixes in this audit are working-tree changes and are not yet committed, pushed, or included in PR #4. Railway will not deploy them until the selected deployment branch receives a commit.
2. Docker Desktop is not running locally, so the updated tree did not receive a local container-stack or Mongo replica-set execution. The skipped refresh-race test needs a replica set; the current PR CI result applies only to its existing committed head.
3. Live Railway readiness still requires real MongoDB, Redis, Cloudinary, email sender, environment, health-check, and log evidence. Live Vercel needs the final frontend build plus correct API/socket origins and cross-site cookie validation if default provider domains are used.
4. Authenticated user/admin browser journeys, email delivery, image-provider behavior, push, sockets, AI providers, backup/restore, and rollback were not exercised without credentials/provider access.
5. The main frontend entry is 866.08 kB (217.52 kB gzip). Route chunks are split, but the shared bundle should be watched on low-end/mobile networks before adding more global dependencies.
6. User statistics and the reminder scan still materialize all matching records for an account/job run. They are correct today but need cursor/batch redesign before high-volume operation; a naive limit could starve failed reminders and was not introduced.
7. `SameSite=None; Secure` enables split-provider cookies where supported, but browser third-party-cookie policy can still block default Vercel/Railway domains. Same-site custom domains or the same-origin container/nginx deployment remain the reliable production topology.

## Deployment decision

Safe to commit and send through CI as the next release-candidate update. Do not describe the system as fully production-ready until the new commit passes CI and the Railway/Vercel/provider/authenticated-browser gates above have current evidence.
