# Privacy, UI, location, and client validation

Validated target: `7499a19c41f8a333cf9580e619a76d3af4a8f009`  
Validation date: 2026-08-24  
Method: current-source trust-boundary trace, current tests, and bounded deterministic Node probes. No live Cloudinary account, browser account-switch session, production data, or Mongo replica-set fixture was used. The installed validation skill references `C:\Users\nisal\.codex\references\scan-artifacts.md`, but that file is absent; the parent scan's explicit artifact contract and existing evidence layout were used instead.

The five-part rubric applied to every candidate was: (1) realistic source/entrypoint and preconditions; (2) closest control and whether it closes the path; (3) actual sink; (4) concrete privacy/security/integrity impact; (5) current proof plus material counterevidence or remaining gap.

## Closure matrix

| ID | Instance | Root line | Confidence | Method | Rubric | Disposition | Survives |
|---|---|---|---|---|---:|---|---|
| MI-01 | `public-report-original-media` | `backend/services/cloudinaryService.js:10` | high | static end-to-end trace + serializer probe | 5/5 | reportable | yes |
| MI-02 | `best-effort-media-erasure` | `backend/services/cloudinaryService.js:38` | high | static failure-order trace | 5/5 | reportable | yes |
| LP-01 | `public-raw-lost-location` | `backend/controllers/lostItemController.js:96` | high | public-route trace + serializer probe | 5/5 | reportable | yes |
| LP-02 | `public-found-location-and-custody` | `backend/controllers/foundItemController.js:97` | high | public-route trace + serializer probe | 5/5 | reportable | yes |
| LP-03 | `restricted-location-exact-projection` | `backend/services/locationIntelligenceService.js:82` | high | source trace + deterministic restricted-record probe | 5/5 | reportable | yes |
| PC-01 | `pending-claim-contact-sharing` | `backend/controllers/claimController.js:269` | high | controller/serializer trace + deterministic probe | 5/5 | reportable policy mismatch | yes |
| CP-01 | `rejected-claim-contact-retention` | `backend/controllers/claimController.js:207` | high | state-transition trace + deterministic probe | 5/5 | reportable | yes |
| EI-01 | `public-unique-feature-evidence` | `backend/utils/serializers.js:12` | high for exposure; medium for policy/impact | source + UI + serializer probe | 4/5 | deferred | no final security finding yet |
| SS-01 | `global-saved-search-storage` | `frontend/src/utils/savedSearches.js:1` | high | source + storage probe + tests | 5/5 | reportable, low severity | yes |
| CH-01 | `global-assistant-history-storage` | `frontend/src/utils/assistantHistory.js:1` | high | source + storage probe + tests | 5/5 | reportable | yes |
| DR-01 | `global-assistant-report-draft` | `frontend/src/components/common/AIChatbot.jsx:255` | high | source/lifecycle trace | 5/5 | reportable | yes |
| TC-01 | `privacy-first-footer-assurance` | `frontend/src/components/layout/Footer.jsx:30` | high | rendered-copy/runtime-control comparison | 5/5 | reportable trust mismatch | yes |
| TC-02 | `absolute-account-erasure-assurance` | `frontend/src/i18n/adminManagementTranslations.js:38` | high | rendered-copy/data-lifecycle comparison | 5/5 | reportable trust mismatch | yes |
| EV-PRIV-01 | `misleading-hotspot-privacy-assurance` | `frontend/src/i18n/adminEvidenceTranslations.js:62` | high | analytics producer-to-render trace | 5/5 | reportable | yes |
| EV-AUDIT-01 | `nonexistent-audit-event-filters` | `frontend/src/pages/admin/AdminLogs.jsx:11` | high | writer inventory + UI/controller trace | 5/5 | reportable | yes |
| RR-UI-01 | `stale-redux-request-overwrite` | `frontend/src/redux/slices/foundItemSlice.js:86` | high for overwrite; medium-high for user impact | reducer/source trace; direct import probe blocked by Vite resolution | 4/5 | reportable integrity defect | yes |
| PERF-IMAGE-01 | `decoded-image-client-memory` | `frontend/src/utils/imageTransform.js:64` | high for behavior | source/control trace | 5/5 | suppressed as security; retain performance hardening | no |
| PERF-CANVAS-01 | `unthrottled-space-resize` | `frontend/src/components/common/SpaceBackground.jsx:332` | high for behavior | source/control trace | 5/5 | suppressed as security; retain UAT item | no |

One candidate remains deliberately deferred: EI-01 has a confirmed public projection but lacks an approved product rule saying report characteristics must be private. The two client-performance notes are real local costs but do not have a realistic remote attacker-controlled exhaustion path.

## MI-01 — newly uploaded report media becomes durable public media

- Instance/root: `public-report-original-media:backend/services/cloudinaryService.js:10`.
- Method: complete trace from both report-create routes through upload, storage metadata, public serializer, public GET routes, and UI/manual fallback.
- Rubric: (1) any authenticated reporter can submit up to five report images through `POST /lost-items` or `POST /found-items`, including a direct API caller that never runs the browser scanner (`backend/routes/lostItemRoutes.js:31-35`; `backend/routes/foundItemRoutes.js:31-35`); (2) the wizard independently scans new files and blocks unresolved review at step one, but provider failure becomes `manual-review` and the user can mark it `manually-reviewed` without transforming the file (`frontend/src/components/common/ReportItemWizard.jsx:238-308,347-375`; `frontend/src/components/common/ImagePrivacyReview.jsx:49-56`); (3) the unchanged `File` is appended at `ReportItemWizard.jsx:466-477`, controllers call `uploadMultipleImages` without `authenticated: true` (`backend/controllers/lostItemController.js:41`; `backend/controllers/foundItemController.js:41`), and Cloudinary selects delivery type `upload`, returns `secure_url`, and persists it (`backend/services/cloudinaryService.js:7-25`); (4) faces, IDs, addresses, QR codes, receipts, and metadata-visible context can become durable publicly retrievable report media; (5) anonymous list/detail routes return `itemView` with `images` untouched (`backend/utils/serializers.js:12-30`; public controllers at `lostItemController.js:96-105` and `foundItemController.js:97-106`).
- Counterevidence/uncertainty: detected redaction regions are locally pixelated and canvas re-encoding removes original metadata; tests confirm every newly selected photo receives a review and unresolved states block step advance. These are meaningful UI controls, but the server does not require a privacy attestation/derivative and does not keep a secure original separate from a public derivative. Existing images in edit mode are also not rescanned (`ReportItemWizard.jsx:171-174`).
- Disposition: **reportable** (CWE-359/CWE-200). Store originals as authenticated/private assets, generate an approved public derivative server-side, persist a media privacy state/version, and reject direct publication until that state is satisfied.

## MI-02 — report/account deletion reports success after provider erasure failure

- Instance/root: `best-effort-media-erasure:backend/services/cloudinaryService.js:38`.
- Method: static failure propagation and caller inventory.
- Rubric: (1) reachable whenever Cloudinary deletion rejects or returns a non-success result during report edit/delete or account anonymisation; (2) `deleteMultipleImages` records failures but throws only with `{ strict: true }` (`cloudinaryService.js:38-43`); (3) report edit/delete callers and account anonymisation call it in default non-strict mode and ignore its returned `failures` count (`backend/controllers/lostItemController.js:149-172`; `backend/controllers/foundItemController.js:151-174`; `backend/services/accountService.js:145-146`); (4) the database/API can say media was removed while public or private provider objects remain retrievable, creating retention and erasure noncompliance; (5) the cleanup job is the only reviewed caller using strict deletion (`backend/jobs/cleanupJob.js:20`).
- Counterevidence/uncertainty: provider deletion requests use `publicId`, delivery type, and CDN invalidation; successful and `not found` responses are accepted. No live provider fault was induced, so residual delivery duration was not measured. The failure semantics are nevertheless explicit and deterministic.
- Disposition: **reportable** (CWE-459). Persist erasure jobs/status, retry idempotently, alert on terminal failure, and make user/admin copy distinguish database removal from verified provider deletion.

## LP-01 — anonymous lost-report reads expose the reporter's raw location text

- Instance/root: `public-raw-lost-location:backend/controllers/lostItemController.js:96`.
- Method: public-route/controller/serializer trace plus direct serializer probe.
- Rubric: (1) anonymous clients can call list/detail routes guarded only by `optionalAuth` (`backend/routes/lostItemRoutes.js:31-32`); (2) `itemView` redacts contacts and connection metadata but has no location projection (`backend/utils/serializers.js:12-30`); (3) controller results include `lostLocation` unchanged (`lostItemController.js:93-105`); (4) free-form dorm room, residence, route, or other exact movement/location text becomes public and searchable; (5) the deterministic probe returned `lostLocation: "Dorm Room 204"` unchanged for an anonymous viewer.
- Counterevidence/uncertainty: a parallel `locationIntelligence` structure records canonical area/sensitivity, and the form warns against private addresses in public text. Neither replaces or removes the raw field. Exact sensitivity depends on user input, but public reachability does not.
- Disposition: **reportable** (CWE-359). Keep exact raw text private to participants/admins and expose only a policy-derived public zone/label.

## LP-02 — anonymous found-report reads expose raw find and custody locations

- Instance/root: `public-found-location-and-custody:backend/controllers/foundItemController.js:97`.
- Method: public route/controller/serializer/UI trace plus direct serializer probe.
- Rubric: (1) anonymous clients can call `GET /found-items` and `GET /found-items/:id` (`backend/routes/foundItemRoutes.js:31-32`); (2) contact redaction does not cover `foundLocation` or `storedAt`; (3) controllers return both through `itemView`, and the public detail page renders `storedAt` (`backend/controllers/foundItemController.js:94-106`; `frontend/src/pages/public/FoundItemDetail.jsx:292-295`); (4) an exact custody description such as a drawer, office, desk, or cabinet can facilitate theft, social engineering, or an unverified pickup; (5) the serializer probe returned both `foundLocation` and `storedAt` unchanged for an anonymous viewer.
- Counterevidence/uncertainty: the report form labels `storedAt` as a current safe storage location and contacts remain protected. That label does not make the custody location safe for anonymous publication.
- Disposition: **reportable** (CWE-359). Publicly expose only an approximate find zone and a generic approved handover point; keep exact find/custody text participant/admin-only until the workflow permits disclosure.

## LP-03 — restricted governed locations are returned with exact canonical precision

- Instance/root: `restricted-location-exact-projection:backend/services/locationIntelligenceService.js:82`.
- Method: approved-record lifecycle trace plus deterministic in-process resolver probe.
- Rubric: (1) an authenticated user can suggest a location as `restricted`, and an administrator can activate it with a verified status (`backend/controllers/locationKnowledgeController.js:27-48,60-79`); (2) only human-reviewed active statuses enter the resolver and non-public coordinates are omitted (`backend/services/locationKnowledgeBootstrapService.js:4-20`), but `approximateZone` is not loaded and sensitivity does not alter the public projection; (3) `publicLocationView` always returns exact `id`, `canonicalName`, and `area` (`locationIntelligenceService.js:82-89`), and both public resolver responses and report `locationIntelligence` use it; (4) a restricted/private place is disclosed at exact canonical precision despite UI/API assurances of approximate zones; (5) a deterministic approved restricted record resolved at 100% and returned `{"canonicalName":"Restricted Room 7","area":"Private Wing","sensitivity":"restricted"}`.
- Counterevidence/uncertainty: current static SEUSL seed data contains public/zone-only records, not a restricted one. Existing tests cover alias matching and assert a public record, despite a test title claiming private precision protection (`backend/tests/ai-matching.test.js:72-78`). The model and admin path make the restricted case currently reachable once such a record is approved.
- Disposition: **reportable** (CWE-359). Centralize sensitivity-aware projection: public for `public`, approved approximate zone for `zone-only`, and a generic safe area or no match identity for `restricted`; add restricted-record tests to every resolver/report surface.

## PC-01 — a pending claim can unlock both parties' contact details

- Instance/root: `pending-claim-contact-sharing:backend/controllers/claimController.js:269`.
- Method: controller authorization/state trace, serializer trace, and deterministic pending-claim probe.
- Rubric: (1) while a claim is still `pending`, the reporter or any administrator can call `PATCH /claims/:id/share-contact` (`backend/routes/claimRoutes.js:43`; `claimController.js:269-275`); (2) authentication and reporter/admin authorization are enforced and the action is human initiated, but there is no evidence-review completion or approved-claim prerequisite; (3) setting `isContactShared=true` makes `claimView` include both parties' email/phone regardless of pending status (`backend/utils/serializers.js:42-44`) and the card renders them (`frontend/src/components/cards/ClaimCard.jsx:59-79`); (4) a weak/unverified claimant receives contact access before ownership approval, contrary to the stated release requirement that contact not be exposed before the approved workflow; (5) the deterministic pending probe returned `reporterContactVisible:true`.
- Counterevidence/uncertainty: this is not automatic disclosure; it requires an authorized reporter/admin click, and the reporter is the owner of their own contact details. If institutional policy explicitly defines this click itself as the approved contact-sharing workflow, severity falls. Current copy separately describes claim approval as “Connect and share contacts,” so the two paths are materially ambiguous (`frontend/src/i18n/translations.js:769-771`).
- Disposition: **reportable policy mismatch** (CWE-359). Either require approved claim/evidence review before contact unlock, or document and record a distinct explicit two-party consent state with revocation and clear copy.

## CP-01 — rejection does not revoke previously shared contact access

- Instance/root: `rejected-claim-contact-retention:backend/controllers/claimController.js:207`.
- Method: state transition plus serializer/runtime probe.
- Rubric: (1) share contact on a pending claim, then reject that claim directly or reject it as a competing claim after another approval; (2) review changes `status`, remark, reviewer, and time but never resets `isContactShared` (`claimController.js:190-240`); (3) `claimView` uses `status === approved || isContactShared`, so a rejected claimant continues receiving the reporter's contact (`backend/utils/serializers.js:42-44`); (4) a party explicitly found not to own the item retains phone/email access indefinitely, enabling unwanted contact and defeating rejection as a privacy boundary; (5) the deterministic rejected-claim probe returned `isContactShared:true`, `reporterEmailVisible:true`, and `reporterPhoneVisible:true`.
- Counterevidence/uncertainty: account deletion resets contact sharing for affected claims, but ordinary claim rejection does not. Client pages may hide some rejected-state controls, yet the authenticated API serializer still supplies the fields.
- Disposition: **reportable** (CWE-359). Revoke `isContactShared` atomically on every rejection/cancellation/competing-claim transition, record the revocation, and test the API response after rejection.

## EI-01 — unique item characteristics are public, but their intended classification is unresolved

- Instance/root: `public-unique-feature-evidence:backend/utils/serializers.js:12`.
- Method: model/form/public serializer/UI trace plus deterministic projection probe.
- Rubric: (1) reporters enter `uniqueFeatures` during report creation; (2) values are count/length bounded and the UI example is an ordinary visible characteristic, not a serial or secret (`frontend/src/i18n/translations.js:900-902`); (3) `itemView` leaves the array public, text search indexes it, and both public detail pages render it in `ItemEvidenceSummary` (`backend/models/LostItem.js:43-46,168-174`; `backend/models/FoundItem.js:43-46,173-179`; `frontend/src/components/common/ItemEvidenceSummary.jsx:7-14`); (4) if users put a serial-like or privately held clue there, it can help fabricate a claim; (5) the serializer probe returned `uniqueFeatures:["serial-like clue"]` unchanged.
- Counterevidence/uncertainty: the public component labels these fields advisory and “not proof of ownership” (`frontend/src/i18n/translations.js:500`), while true claim evidence is separately private and signed. No current copy asks users to enter a full serial or secret clue. Public matching utility may intentionally depend on visible characteristics.
- Disposition: **deferred**, not promoted as a final security finding. Obtain the institutional field-classification rule and sample real field data. A safe design is to split public descriptors from private ownership-only clues, with clear examples and server projection tests.

## SS-01 — saved searches cross account and guest boundaries in a shared browser

- Instance/root: `global-saved-search-storage:frontend/src/utils/savedSearches.js:1`.
- Method: complete helper/page/logout trace, existing tests, and in-memory storage probe.
- Rubric: (1) any guest or signed-in user saves a query in a browser later used by another person/account; (2) filters are allowlisted, text bounded, capped to five, and expire after 30 days, but the key has no user/account namespace and logout never clears it (`savedSearches.js:1-18,38-78`; `frontend/src/redux/slices/authSlice.js:44`); (3) `SearchItems` loads the same entries at mount and exposes rerun controls (`frontend/src/pages/public/SearchItems.jsx:120,181-190`); (4) queries/categories/date ranges can reveal another user's search activity or locations of interest; (5) the storage probe wrote one principal's query and the next load returned the same `sensitive-location` value under key `lf-saved-searches-v1`.
- Counterevidence/uncertainty: searches target public report data and contain no tokens; bounds/TTL materially reduce exposure. This is a shared-device privacy issue, not server data exfiltration.
- Disposition: **reportable, low severity** (CWE-359/CWE-922). Namespace by immutable account id or explicit guest profile, clear/migrate on principal change, and offer a visible “clear searches on this device” control.

## CH-01 — assistant conversation text crosses accounts in the same browser

- Instance/root: `global-assistant-history-storage:frontend/src/utils/assistantHistory.js:1`.
- Method: helper/UI/logout trace, existing tests, and in-memory storage probe.
- Rubric: (1) account A chats about personal reports/claims/locations, logs out, and account B or a guest opens the assistant in the same browser; (2) storage is bounded to five sessions, 20 messages, 1,000 characters, and seven days, and structured cards/private payloads are excluded; the key still has no account identity and no logout cleanup (`assistantHistory.js:1-80`; `authSlice.js:44`); (3) `AIChatbot` loads the newest conversation globally and renders it (`frontend/src/components/common/AIChatbot.jsx:193-202`); (4) prior user/assistant text can expose report, claim, or location context to the next browser user; (5) the probe showed `nextPrincipalChat:"private query"` under `lf-assistant-conversations-v1`.
- Counterevidence/uncertainty: explicit delete/clear controls exist and TTL/size limits work; tests pass for those controls. They do not test account switching.
- Disposition: **reportable** (CWE-359/CWE-922). Namespace history by principal/guest session, clear or require opt-in on logout/account change, and test A-to-B-to-guest transitions.

## DR-01 — assistant report drafts have neither principal binding nor freshness

- Instance/root: `global-assistant-report-draft:frontend/src/components/common/AIChatbot.jsx:255`.
- Method: exact write/restore/logout route trace.
- Rubric: (1) account A creates an assistant draft, then the same tab changes principal before the destination wizard consumes it; (2) the stored JSON contains only draft fields plus `createdAt`, under fixed session key `lf-assistant-report-draft`; it has no user id/session generation and logout does not clear it (`AIChatbot.jsx:255-262`; `authSlice.js:44`); (3) either create wizard restores matching report type and merges the fields without checking creator or age (`frontend/src/components/common/ReportItemWizard.jsx:141-152`); (4) A's exact location/description/identifiers can appear in B's form and may be submitted under B after review; (5) all create entrypoints use this same wizard and are protected routes (`frontend/src/App.jsx:163-177`).
- Counterevidence/uncertainty: `sessionStorage` is tab-scoped, the normal navigate usually consumes/removes the draft immediately, and normal autosave drafts are user-id namespaced. The exploit window therefore needs a same-tab principal transition or interrupted navigation, not a separate browser.
- Disposition: **reportable** (CWE-359/CWE-488). Store creator principal/session generation and expiry, refuse mismatch/stale restore, and clear the handoff on every auth transition.

## TC-01 — public footer overstates the effective image/privacy boundary

- Instance/root: `privacy-first-footer-assurance:frontend/src/components/layout/Footer.jsx:30`.
- Method: rendered-copy comparison against MI-01/LP controls.
- Rubric: (1) every public visitor sees “Privacy-first AI verification”; (2) advisory AI, redaction UI, contact serializers, and private claim media are genuine controls; (3) the same product accepts direct report images into public delivery and exposes raw locations/custody fields; (4) users may reasonably infer stronger authoritative privacy handling than the system actually enforces; (5) MI-01 and LP-01/02 survive current-source validation and contradict an unqualified assurance.
- Counterevidence/uncertainty: “privacy-first” is broad marketing language, not a technical guarantee, so direct exploit severity is low. It still appears beside a shield icon and is not localized or qualified as manual/advisory.
- Disposition: **reportable trust/copy mismatch** (CWE-451). Replace with precise claims that match current enforcement, or retain it only after the authoritative media/location fixes ship.

## TC-02 — account anonymisation copy promises more erasure than the workflow verifies

- Instance/root: `absolute-account-erasure-assurance:frontend/src/i18n/adminManagementTranslations.js:38`.
- Method: confirmation-copy comparison with current account/media lifecycle.
- Rubric: (1) an administrator sees a destructive confirmation saying personal data, sessions, and private media “are removed”; (2) the service does anonymize the User, revoke refresh sessions, remove notifications, clear claim proof fields, archive reports, and collect associated media (`backend/services/accountService.js:31-127`); (3) owned report descriptions, raw locations, unique features, `storedAt`, and the `userId` link remain in Mongo, while provider media deletion is best-effort and unverified (`accountService.js:45-54,145`; MI-02); (4) operators can approve closure believing complete erasure occurred when account-linked authored data/provider objects may remain; (5) no field-level erasure verification or provider-deletion receipt is returned.
- Counterevidence/uncertainty: retained records are excluded from ordinary public reads and can be justified for workflow/audit safety. That is a retention policy, not literal removal, and current copy does not disclose it.
- Disposition: **reportable trust mismatch** (CWE-459/CWE-451). Use accurate staged-anonymisation copy, expose retained categories/schedule, and show verified/pending/failed external-media erasure state.

## EV-PRIV-01 — hotspot evidence can contain the private labels it says are excluded

- Instance/root: `misleading-hotspot-privacy-assurance:frontend/src/i18n/adminEvidenceTranslations.js:62`.
- Method: backend aggregation-to-UI trace.
- Rubric: (1) any recent report contains an unmatched raw private address or an exact canonical restricted label; (2) a separate prediction cohort correctly filters `needsReview`, sensitivity, and verified status (`backend/controllers/adminController.js:114-140`), but the “recent hotspots” aggregation does not; (3) hotspot groups use `$ifNull(canonicalName, raw lostLocation/foundLocation)` with no sensitivity/review filter (`adminController.js:75-84`), pass labels into operational intelligence, and render them beside “Private addresses are excluded” (`frontend/src/pages/admin/Analytics.jsx:121-125`); (4) administrators receive sensitive exact labels and misleading privacy evidence, which can taint institutional reporting/decisions; (5) the code paths are direct and require no AI/provider behavior.
- Counterevidence/uncertainty: analytics is admin-only and aggregate counts do not include contact or ownership proof. Small counts/exact labels can still reveal a location; access restriction does not make the assurance true.
- Disposition: **reportable** (CWE-359/CWE-451). Reuse the governed/sensitivity-aware cohort source, suppress small cells, project zones, and make the notice derive from enforced query invariants covered by tests.

## EV-AUDIT-01 — the audit UI offers event families that have no producer

- Instance/root: `nonexistent-audit-event-filters:frontend/src/pages/admin/AdminLogs.jsx:11`.
- Method: full `AdminLog` writer inventory plus controller/filter/UI trace.
- Rubric: (1) an administrator performs claim approval/rejection or category create/update/delete and later filters the system audit trail; (2) the UI offers `CLAIM_*` and `CATEGORY_*` values and translations (`AdminLogs.jsx:11-14`; `frontend/src/i18n/adminEvidenceTranslations.js:19-27`); (3) repository writer inventory finds only user activation/deactivation, role changes, and account anonymisation (`backend/controllers/adminController.js:226-267`; `backend/services/accountService.js:130-138`); literal `CLAIM_*`/`CATEGORY_*` actions occur only in frontend labels, not backend writes; (4) an empty filter can be misread as proof that no privileged action occurred, undermining incident reconstruction and institutional evidence; (5) the log query simply filters stored `action` strings and cannot detect missing expected events (`backend/controllers/adminController.js:278-285`).
- Counterevidence/uncertainty: recorded actions are genuine and unknown action strings render through a fallback. The UI subtitle carefully says it reviews “recorded” actions, but the presence of named empty filters still implies coverage and no coverage manifest/warning exists.
- Disposition: **reportable** (CWE-778/CWE-451). Add transactional audit writes and coverage tests for each privileged mutation, or remove/label unsupported filters and declare the trail partial.

## RR-UI-01 — older Redux responses deterministically overwrite newer route/filter state

- Instance/root: `stale-redux-request-overwrite:frontend/src/redux/slices/foundItemSlice.js:86`.
- Method: current thunk/reducer trace across admin, claim, lost, found, match, and notification state. A direct reducer probe was attempted but Node could not resolve Vite's extensionless service imports; source behavior is explicit and existing tests do not cover ordering.
- Rubric: (1) trigger request A, then change route/filter/page to request B, and let B finish before A; (2) reducers keep one shared `isLoading` flag and never retain/compare `action.meta.requestId`, captured entity id, route id, filter signature, or principal generation (`frontend/src/redux/slices/adminSlice.js:91-141`; `claimSlice.js:81-105`; `foundItemSlice.js:86-110`; `lostItemSlice.js:86-110`; `matchSlice.js:59-83`; `notificationSlice.js:78-95`); (3) every fulfilled action assigns list/current/pagination data unconditionally; (4) stale claim/report/contact/admin data can render under the wrong selected entity/filter and can lead the user to act on the wrong record, while a stale completion can falsely end loading; (5) the overwrite follows normal Redux action order deterministically even though a browser timing test was unavailable.
- Counterevidence/uncertainty: the unified public `SearchItems` page independently aborts/suppresses superseded requests, and server authorization still limits what each response may contain. This is not a backend IDOR by itself. Cross-account severity additionally depends on the separately validated RS-01/auth lifecycle.
- Disposition: **reportable integrity defect** (CWE-367/CWE-451). Track latest request id/context per operation, abort superseded reads, use operation-specific pending state, and add delayed A-after-B reducer/component tests.

## Suppressed client-performance notes

### PERF-IMAGE-01 — decoded image dimensions can consume local browser memory

- Rubric: (1) the user selects an image; (2) upload bytes are capped and MIME/magic bytes checked, but decoded pixel dimensions/frame count are not bounded; (3) crop/rotation and redaction allocate canvases at decoded dimensions (`frontend/src/utils/imageTransform.js:37-92`; `frontend/src/utils/imageRedaction.js:44-75,86-142`); (4) a large-dimension compressed image can stall or exhaust that user's tab; (5) no reviewed remote URL auto-fetch or unauthenticated server parser makes another principal pay this browser cost.
- Disposition: **suppressed as a standalone security finding**. Retain as performance/robustness hardening: inspect dimensions before full-size canvas allocation, set a decoded-pixel ceiling, downscale early, and test extreme-dimension/multi-frame samples on low-memory mobile devices. This does not close the separately deferred server/provider BM-05 image-validation candidate.

### PERF-CANVAS-01 — resize events recreate the decorative star field without throttling

- Rubric: (1) local resize/device rotation fires repeatedly; (2) mobile/low-effects/reduced-motion/hidden-tab controls reduce animation work; (3) each resize immediately recalculates canvas and recreates up to 900 star objects (`frontend/src/components/common/SpaceBackground.jsx:35-98,302-345`); (4) sustained local resize can cause jank/battery/CPU cost; (5) there is no unauthenticated remote source that can drive another user's window resize loop.
- Disposition: **suppressed as security; retain performance UAT item**. Throttle/debounce resize, reuse star buffers where practical, and cover orientation changes and low-power devices.

## Commands and observed evidence

```text
git rev-parse HEAD
=> 7499a19c41f8a333cf9580e619a76d3af4a8f009

cd backend
node --test tests/security.test.js tests/ai-matching.test.js tests/location-governance.test.js tests/operational-intelligence.test.js
=> 19 passed, 0 failed, 0 skipped

cd ../frontend
node --test tests/assistant-history.test.mjs tests/saved-searches.test.mjs tests/full-plan-acceptance.test.mjs tests/report-wizard.test.mjs tests/image-redaction.test.mjs tests/image-transform.test.mjs
=> 16 passed, 0 failed, 0 skipped

restricted-location deterministic probe
=> {"id":"restricted-test","canonicalName":"Restricted Room 7","area":"Private Wing","verificationStatus":"university-approved","sensitivity":"restricted","confidence":100}

pending contact serializer probe
=> {"status":"pending","reporterContactVisible":true}

rejected contact serializer probe
=> {"status":"rejected","isContactShared":true,"reporterEmailVisible":true,"reporterPhoneVisible":true}

anonymous item serializer probe
=> {"lostLocation":"Dorm Room 204","foundLocation":"Lab Drawer 9","storedAt":"Security cabinet behind desk","uniqueFeatures":["serial-like clue"],"publicImageUrl":"https://public.invalid/original.jpg"}

browser-storage identity-boundary probe
=> {"nextPrincipalChat":"private query","nextPrincipalSearch":"sensitive-location","keys":["lf-assistant-conversations-v1","lf-saved-searches-v1"]}

Redux direct-import probe
=> not executed: Node ESM could not resolve Vite extensionless import `src/services/foundItemService`; no source was modified to work around the application bundler contract.
```

The passing suites are counterevidence only for the controls they actually exercise: contact redaction from outsiders before sharing, bounded histories/searches, advisory/manual image review, public-location alias matching, and governed prediction cohorts. They do not cover account namespacing, rejected-contact revocation, exact restricted-location projection, provider-deletion failure, raw hotspot fallback, absent audit producers, or stale request ordering.
