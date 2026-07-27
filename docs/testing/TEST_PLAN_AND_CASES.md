# Test Plan and Cases

## Strategy
Unit/static tests cover pure scoring, provider fallback, multilingual search, security invariants and UI structure. Integration tests require MongoDB replica set and installed dependencies. Target certification adds providers, browsers, accessibility, security scans, backup/restore and load/failure testing.

## Critical test cases
| ID | Scenario | Expected |
|---|---|---|
| AUTH-01 | Login/refresh rotation/reuse | old refresh rejected; sessions hashed; cookie-only |
| PRIV-01 | Public item/claim/match response | no email/phone/studentId/private evidence |
| CLAIM-01 | Attach unrelated matchId | rejected before write |
| CLAIM-02 | Concurrent approvals | one consistent transaction; no half-state |
| CLAIM-03 | Reject lost-item claim | valid lost status restored |
| MATCH-01 | Found date before lost date | score capped with caution explanation |
| AI-01 | provider timeout/failure | circuit opens; fallback/manual path works |
| AI-02 | sensitive OCR | masked value stored/returned; redaction region normalised |
| AI-03 | correction submitted | pending; no automatic model training |
| AI-04 | sensitive region in each selected public photo | every file reviewed; unresolved warnings block advance; generated privacy-safe replacement is submitted instead of original browser file |
| AI-05 | direct visual comparison for match candidates | only top-ranked HTTPS image pairs are compared; one provider attempt per pair; invalid/sensitive output fails closed or is masked; score remains advisory |
| AI-06 | historical recovery cohort guidance | only verified outcomes and governed canonical locations are aggregated; cohorts below minimum sample are ineligible; uncertainty interval and no-individual-prediction notice are shown |
| AI-07 | browser image edit/redaction processing failure | utilities emit stable non-user-facing error codes; transform/redaction screens map codes to complete English, Sinhala and Tamil guidance and never display raw technical `error.message` text |
| UI-ERR-01 | account, assistant, report, contact, notification and recovery request failure | user-facing toasts use selected-language safe fallback keys and never render raw `error.message`, response diagnostics or arbitrary rejected strings |
| REPORT-01 | incomplete report | advisory score/suggestions; valid submission rules unchanged |
| REPORT-02 | own duplicate report | candidates shown without exposing other users |
| REPORT-03 | rotate/crop image or submit offline | edited file replaces original and receives a new privacy review; offline submission is blocked while text draft remains; online upload exposes progress |
| LOC-01 | local alias | canonical approved location resolved |
| LOC-02 | private/unverified location | precision reduced/not stated as verified |
| ACCESS-01 | dialog keyboard | focus enters/traps/restores; Escape closes |
| ACCESS-02 | 200% zoom/mobile keyboard | no obscured action/nav/chat collision |
| ACCESS-03 | accessibility preferences persist/apply/reset | only allowed text scales are accepted; contrast/motion/effects classes apply immediately; invalid local data resets safely |
| PERF-01 | design-system modules and signature space animation | CSS imports retain deterministic cascade order; no persistent card compositor promotion; mobile/low-effects density is reduced; animation pauses in background tabs; reduced-motion gets one decorative static frame |
| OUTBOX-01 | repeated delivery | idempotency key prevents duplicate side effect |
| RET-01 | multi-instance lifecycle | distributed lock permits one execution |
| NOTIFY-01 | user disables optional match push/email | in-app record persists; push/email delivery is suppressed for that category; security emails remain unaffected |
| NOTIFY-02 | realtime socket event and push permission flow | socket connection never prompts for browser permission or logs user identity; exactly one in-app toast is emitted; reducers stay side-effect free; native alerts appear only in hidden tabs after explicit permission; push failures use stable locale-mapped codes |
| CHAT-01 | assistant history saved/opened/deleted | only bounded text messages persist locally; cards, summaries, images and evidence are excluded; sessions expire after seven days |
| SEARCH-01 | URL/saved search reload, rerun and delete | filters are sanitised and URL-backed; local records deduplicate, expire after 30 days and remain capped at five |
| I18N-02 | guided report create/edit, image, location, AI and privacy controls | one translation contract is complete for English, Sinhala and Tamil; principal controls contain no English-only label dependency |
| I18N-03 | five-step claim and notification centre/preferences | English, Sinhala and Tamil dictionaries contain all workflow keys; source consumes translation keys while preserving evidence privacy and delivery enforcement |
| I18N-04 | assistant dialog, result cards, draft review, local history, voice and fallback controls | all interface labels and privacy notices use complete English, Sinhala and Tamil keys while provider-generated content remains language-aware |
| I18N-05 | match evidence/corrections, claim cards/handover and notification-card actions | recovery-critical labels and accessibility names use complete English, Sinhala and Tamil translation contracts without changing user evidence |
| I18N-06 | lost/found details and My Claims review/resolution | protected-contact, claim-review and handover actions use complete English, Sinhala and Tamil keys while permissions and state transitions remain unchanged |
| I18N-07 | My Lost, My Found and AI Match recommendation management | headings, dates, actions, confirmations, feedback subjects and empty states use complete English, Sinhala and Tamil keys while report and match API identifiers remain unchanged |
| I18N-08 | profile, avatar processing and password settings | labels, validation feedback, actions and password visibility names use complete English, Sinhala and Tamil keys without changing authentication or upload contracts |
| I18N-09 | registration, login, forgot/reset password and email verification | signed-out labels, validation/fallback messages and password controls use complete English, Sinhala and Tamil keys while cookie/session and token-link handling remain unchanged |
| I18N-10 | About, Contact, legacy lost/found directories, filters and pagination | public information and configured-support fallbacks use complete English, Sinhala and Tamil keys; signed-out feedback remains blocked and no support detail is fabricated |
| I18N-11 | administrator navigation, urgent queues, provider health, metrics, charts and shortcuts | dashboard labels use complete English, Sinhala and Tamil keys while all values remain database/provider backed and AI flags retain explicit human-review wording |
| I18N-12 | administrator claim, match, location-knowledge and AI-feedback review queues | review labels, statuses, confidence bands, notices, actions and errors use complete English, Sinhala and Tamil keys; match scores remain advisory and location/feedback records require explicit human approval |
| I18N-13 | administrator user and category management | account/role actions and category controls use complete English, Sinhala and Tamil keys; user closure is described as anonymisation, the last active administrator remains server-protected, and linked categories distinguish deactivation from deletion |
| I18N-14 | administrator lost/found report moderation | both report types use one English, Sinhala and Tamil moderation component; archive wording matches transactional soft-delete/close behaviour, active handovers block removal, and linked matches/claims are safely rejected |
| I18N-15 | administrator site/contact/authentication and claim-safeguard settings | English, Sinhala and Tamil keys remain complete; pending/daily request bounds match backend allowlists; rejected-claim threshold adds advisory human-review evidence only and never bans, suspends, approves or rejects automatically |
| I18N-16 | administrator audit trail, aggregate analytics and feedback response workflow | English, Sinhala and Tamil keys remain complete; missing network/target evidence is never fabricated; analytics renders structured aggregate types/parameters and advisory notices; feedback filters match backend enums and official responses use the validated `/feedback/:id/respond` route with the model-aligned 1,000-character limit |
| I18N-17 | handover resolution and post-recovery feedback | completion/cancellation states and feedback controls use complete English, Sinhala and Tamil keys; cancellation requires a useful reason, sends the bounded reason to the validated endpoint and reopens reports for human review; star rating is keyboard/screen-reader operable and feedback warns against private evidence |
| I18N-18 | shared loader/select/navigation, dashboard setup and profile-completion residual audit | all actionable labels, accessibility names, prompts and toasts use complete English, Sinhala and Tamil keys; AI loading uses an honest indeterminate state rather than fabricated percentage progress; profile image selection and modal focus controls are keyboard accessible; AST scan leaves only approved brand proper nouns |

## Current environment evidence
Backend syntax and dependency-free Node tests can run without packaged dependencies. The latest full dependency-free sweep recorded 45 passes, one MongoDB replica-set concurrency skip and one import-blocked test file because `nodemailer` is intentionally absent from the sanitized source archive. An isolated clean `npm ci` attempt reached the configured registry but received repeated HTTP 503 responses while the local npm cache was empty. Frontend static Node tests and the TypeScript JSX parser run. Full backend/integration, ESLint/build and browser tests require a successful dependency installation and/or target infrastructure; results must be attached to the immutable release.
