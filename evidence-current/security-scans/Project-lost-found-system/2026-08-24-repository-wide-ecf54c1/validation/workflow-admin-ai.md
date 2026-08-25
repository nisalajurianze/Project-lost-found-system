# Phase 3 validation shard — workflow, administration, and AI governance

- Target: `7499a19`
- Method: current-source control-flow trace plus bounded Node probes where pure functions were available.
- Shared rubric identifiers:
  - R1: a realistic authenticated/public entrypoint is reachable.
  - R2: attacker/user-controlled data or concurrent state is traced to the sink.
  - R3: the closest intended control is identified and shown missing, incomplete, or effective.
  - R4: concrete impact and required preconditions are stated.
  - R5: counterevidence is checked; a probe is run when a safe isolated probe is possible.

## CR-01 — Claim evidence score accepts claimant-authored questions

Rubric: R1 request accepted; R2 question/answer trace complete; R3 server question binding checked; R4 reviewer-deception impact bounded; R5 pure-function probe executed.

- Instance/ledger: claim creation / ownership-evidence integrity.
- Root control: an authenticated claimant controls `verificationAnswers[].question` and `.answer`.
- Source → sink: `claimRoutes.js:33` → `validators.js:370-379` → `claimController.js:79-90` → `claimVerificationService.js:32-72` → persisted `evidenceAssessment`.
- Closest control: generated questions exist at `claimController.js:58-69`, but claim creation does not issue or verify a server-bound question set. Parsing checks only shape/length. Scoring counts answer length.
- Validation probe: three attacker-authored ten-character answers, a 120-character description, and three file placeholders produced `{"score":95,"level":"strong","warnings":[]}`.
- Impact/preconditions: any authenticated claimant can make low-quality, self-authored evidence appear `strong`; the result remains advisory and human review is still required, so this is workflow-integrity risk rather than automatic ownership approval.
- Checklist: [x] R1 [x] R2 [x] R3 [x] R4 [x] R5.
- Disposition: **reportable**; high confidence.

## CR-02 — Proof reuse compares provider object ids rather than image identity

Rubric: R1 upload reachable; R2 identifier trace complete; R3 content-identity control checked; R4 evasion impact bounded; R5 negative controls reviewed.

- Instance/ledger: claim creation / abuse signals.
- Root control: claimant may upload the same bytes again, receiving a new Cloudinary `publicId`.
- Source → sink: `claimController.js:117-134` → `claimRiskService.js:15-20`.
- Closest control: reuse lookup checks only `proofImages.publicId`; no digest, perceptual hash, or stable provider asset identity is stored in `ClaimRequest.js:40-53`.
- Impact/preconditions: cross-account proof-reuse signal is bypassed by re-uploading identical content. Human review remains required and images are authenticated assets, limiting impact to risk-signal evasion.
- Counterevidence: the unique pending-claim indexes at `ClaimRequest.js:133-134` prevent duplicate pending claims per claimant/item but do not detect reused media.
- Checklist: [x] R1 [x] R2 [x] R3 [x] R4 [x] R5.
- Disposition: **reportable**; high confidence.

## CR-03 — Claim quotas are count-before-create races

Rubric: R1 concurrent requests realistic; R2 count/write trace complete; R3 atomic quota control checked; R4 bounded abuse impact; R5 uniqueness countercontrol reviewed.

- Source → sink: `claimController.js:92-105` performs independent counts; upload and create occur later at `117-135`.
- Closest control: the model has per-item pending uniqueness only (`ClaimRequest.js:133-134`), not a per-user pending/daily quota reservation.
- Impact/preconditions: parallel authenticated submissions for distinct items can all observe a count below the limit and exceed both configured quotas, causing upload/provider/storage and review-load amplification.
- Checklist: [x] R1 [x] R2 [x] R3 [x] R4 [x] R5.
- Disposition: **reportable**; high confidence.

## PC-01 — Contact data is shareable while a claim is pending

Rubric: R1 route reachable; R2 authorization/data trace complete; R3 approval boundary checked; R4 PII impact concrete; R5 serializer/UI controls reviewed.

- Source → sink: authenticated `PATCH /claims/:id/share-contact` (`claimRoutes.js:42-43`) → `claimController.js:269-280` sets `isContactShared=true` only when status is `pending` → `serializers.js:42-44` releases email/phone → `ClaimCard.jsx:59-79` renders it.
- Closest control: route limits the action to reporter/admin, but deliberately bypasses approved-claim status. This contradicts the stated requirement that contact details not be exposed before an approved workflow.
- Impact/preconditions: a reporter/admin click exposes participant email/phone and possibly student id during an unapproved claim. No claimant consent/acknowledgment is represented in this transition.
- Checklist: [x] R1 [x] R2 [x] R3 [x] R4 [x] R5.
- Disposition: **reportable policy violation**; high confidence.

## CP-01 — Rejection does not revoke previously shared contact

Rubric: R1 state sequence realistic; R2 transition trace complete; R3 revocation checked; R4 PII persistence concrete; R5 serializer behavior confirmed.

- Source → sink: `shareClaimContact` sets `isContactShared` (`claimController.js:269-280`); rejection changes status/remark only (`190-242`); `claimView` unlocks when `status==='approved' || isContactShared` (`serializers.js:42-44`).
- Closest control: account deletion explicitly clears the flag (`accountService.js:65-89`), proving revocation is modeled, but ordinary rejection does not clear it. Concurrent share/reject operations are also not serialized through one transaction/conditional update.
- Impact/preconditions: both parties retain returned contact PII after rejection; a share/reject race can produce a rejected claim with contact still unlocked.
- Checklist: [x] R1 [x] R2 [x] R3 [x] R4 [x] R5.
- Disposition: **reportable**; high confidence.

## RW-01 — API permits claim rejection without a durable reason

Rubric: R1 API reachable; R2 validation/write trace complete; R3 UI-only control checked; R4 accountability impact stated; R5 fallback behavior reviewed.

- Source → sink: `validators.js:389-400` makes `adminRemark` optional; `claimController.js:207-210` persists empty string. The UI requires text only in `MyClaims.jsx:196-205`.
- Closest control: email substitutes “Insufficient evidence” (`claimController.js:259-263`), but that fallback is not stored as the decision record.
- Impact/preconditions: a direct API client can reject without an auditable rationale, weakening appeals and institutional accountability; no privilege escalation.
- Checklist: [x] R1 [x] R2 [x] R3 [x] R4 [x] R5.
- Disposition: **reportable hardening/accountability**; high confidence.

## RW-02 — Match rejection has no reason field

Rubric: R1 participant/admin API reachable; R2 transition trace complete; R3 schema/validator/UI reviewed; R4 audit impact stated; R5 AI-feedback countercontrol checked.

- Source → sink: `matchController.js:68-102` persists only status and generic AI feedback; validator `validators.js:404-410` accepts only status semantics. `Match`/feedback records do not capture a user rejection rationale.
- Closest control: a pending `not-same` AI decision is recorded, but it contains no reason dimension for this route.
- Impact: lower explainability and poor correction data; not an authorization bypass.
- Checklist: [x] R1 [x] R2 [x] R3 [x] R4 [x] R5.
- Disposition: **reportable hardening**; medium confidence on policy severity.

## HW-01 — Handover resolves an arbitrary confirmed match for the item

Rubric: R1 participant route reachable; R2 state-selection trace complete; R3 claimant tuple binding checked; R4 cross-workflow impact concrete; R5 authorization countercontrol reviewed.

- Source → sink: participant-authorized item resolution/cancellation reaches `itemWorkflowService.js:18-45` / `51-85`; both select `Match.findOne({itemField:item._id,status:'confirmed'})` without the item’s `connectedUserId`, approved `ClaimRequest.matchId`, or caller-supplied match id.
- Closest control: `authorizeParticipant` restricts the caller to owner/connected user/admin (`13-15`), but does not bind the selected reciprocal report to that connected participant/approved claim.
- Impact/preconditions: if an item has more than one confirmed historical/current match, completion or cancellation can update the wrong reciprocal report and wrong approved claim set.
- Checklist: [x] R1 [x] R2 [x] R3 [x] R4 [x] R5.
- Disposition: **reportable workflow-integrity defect**; high confidence.

## AF-01 — AI feedback target and algorithm identity are caller asserted

Rubric: R1 authenticated route reachable; R2 input/storage trace complete; R3 ownership/existence/dedupe checks inspected; R4 dataset impact concrete; R5 admin-review countercontrol assessed.

- Source → sink: `aiFeedbackRoutes.js:9` → `aiFeedbackController.js:10-27` → `AIDecisionFeedback.js:3-30`.
- Closest control: enum/ObjectId validation and mandatory admin approval exist. Missing: target existence/type lookup, submitter relationship/ownership, server-derived algorithm version, and a unique anti-duplicate constraint.
- Admin-review counterevidence: `AIFeedbackReview.jsx:71-89` omits target id/link, algorithm version, and contextual source object, so reviewers cannot reliably verify the record before “Approve dataset use.” Pagination is also discarded by requesting `limit:100` while the server caps at 50.
- Impact/preconditions: any authenticated account can flood plausible pending/duplicate records and can get forged metadata into an approved dataset if an administrator trusts the incomplete UI. No automatic training path was found.
- Checklist: [x] R1 [x] R2 [x] R3 [x] R4 [x] R5.
- Disposition: **reportable**; high confidence.

## CAT-AUTH-01 — Ordinary users mutate the global active taxonomy

Rubric: R1 route/UI reachable; R2 global write trace complete; R3 role control checked; R4 integrity impact concrete; R5 normalization/duplicate controls reviewed.

- Source → sink: `categoryRoutes.js:28-29` grants every authenticated user `/auto-create` → `categoryController.js:123-145` creates `isActive:true` Category → public category cache/list.
- Closest control: normalization and a unique-name race handler exist; there is no admin approval, draft/proposal state, per-user quota, or role gate.
- Impact: an ordinary user can permanently change options shown system-wide and create taxonomy clutter/misclassification.
- Checklist: [x] R1 [x] R2 [x] R3 [x] R4 [x] R5.
- Disposition: **reportable authorization/design gap**; high confidence.

## CAT-DOS-01 — Category auto-create amplifies database/cache and optional AI work

Rubric: R1 normal UI/API path reachable; R2 work trace complete; R3 endpoint quota/dedupe checked; R4 resource impact bounded; R5 provider-disabled behavior assessed.

- Source → sink: `CreatableCategorySelect.jsx:84-89` promotes arbitrary typed text on blur → `ReportItemWizard.jsx:196-220` calls `/categories/auto-create` before report submission → controller performs category reads, optional provider call, insert, and cache deletion (`categoryController.js:123-145`; `imageAnalysisService.js:112-125`).
- Closest control: only the broad API limiter (`server.js:81-85`, 1000/15m) applies; no endpoint cost quota or in-flight normalized-name dedupe. Provider-disabled mode still permits a fallback category insert.
- Impact/preconditions: an authenticated account can create many global categories and force repeated database/cache work; with AI enabled it can also consume provider spend.
- Checklist: [x] R1 [x] R2 [x] R3 [x] R4 [x] R5.
- Disposition: **reportable**; high confidence.

## AI-COST-01 — Authenticated vision analysis lacks a cost-specific limiter

Rubric: R1 endpoint reachable; R2 upload/provider trace complete; R3 endpoint limiter checked; R4 conditional cost impact stated; R5 provider-disabled fail-closed behavior checked.

- Source → sink: `aiRoutes.js:23` → in-memory upload → `suggestDetailsFromImage` provider request (`imageAnalysisService.js:132-164`).
- Closest control: authenticated route, upload limits, and global 1000/15m limiter exist; unlike chat, the vision endpoint has no low cost-specific quota.
- Impact/preconditions: only when the vision provider is deliberately configured, one account can produce disproportionate provider cost and CPU/memory load. When vision is disabled, the endpoint fails rather than silently charging a provider.
- Checklist: [x] R1 [x] R2 [x] R3 [x] R4 [x] R5.
- Disposition: **reportable, provider-dependent**; high confidence.

## LA/AC-01 — Last-administrator invariant is vulnerable to cross-target write skew

Rubric: R1 concurrent admin actions realistic; R2 read/write sets traced; R3 transaction/index controls checked; R4 availability/lockout impact concrete; R5 self-target and session controls reviewed.

- Instances: `LA-STATUS-01`, `LA-ROLE-01`, `LA-DELETE-01`, `AC-01`.
- Root control: two administrators concurrently act on different active administrator accounts.
- Source → sink: `ensureNotLastActiveAdmin` counts all active admins (`accountService.js:14-18`), then the caller writes only its target in separate transactions (`adminController.js:210-275`; account deletion `accountService.js:20-140`).
- Closest control: per-operation Mongo transactions and self-target bans exist, but there is no shared invariant document, lock, serializable transaction, or database constraint. With two admins, both snapshots may read count=2 and each deactivate/demote/delete the other target.
- Impact: zero active administrators and operational lockout. Session revocation happens after some commits, but does not restore the invariant.
- Checklist: [x] R1 [x] R2 [x] R3 [x] R4 [x] R5.
- Disposition: **reportable**; high confidence.

## AL-SETTING-01 — Security setting mutation has no admin audit event

Rubric: R1 admin route reachable; R2 write trace complete; R3 logging inventory checked; R4 accountability impact stated; R5 authorization countercontrol acknowledged.

- Source → sink: admin setting update → `systemSettingController.js:103-135` upserts live settings.
- Closest control: strict key/type/publicity allowlists are effective, but the controller does not create `AdminLog`; logging exists for user status/role/deletion elsewhere.
- Impact: claim-abuse and authentication policy changes cannot be attributed through the application audit trail.
- Checklist: [x] R1 [x] R2 [x] R3 [x] R4 [x] R5.
- Disposition: **reportable accountability gap**; high confidence.

## AL-REPORT-01 — Admin report deletion is absent from AdminLog

Rubric: R1 admin delete path reachable; R2 cascade trace checked; R3 audit writes searched; R4 forensic impact stated; R5 owner-vs-admin distinction reviewed.

- Source → sink: lost/found delete controllers permit owner/admin and transactionally soft-delete reports, reject claims/matches, then remove media; neither emits an `AdminLog` entry when the actor is an administrator deleting another user’s report.
- Impact: a privileged destructive/cascading action lacks actor/reason evidence in the dedicated audit collection.
- Checklist: [x] R1 [x] R2 [x] R3 [x] R4 [x] R5.
- Disposition: **reportable accountability gap**; high confidence.

## SET-ATOMIC-01 — Three abuse settings can partially commit

Rubric: R1 admin save path reachable; R2 three-write trace complete; R3 transaction/rollback checked; R4 live-policy inconsistency concrete; R5 server-side value controls acknowledged.

- Source → sink: `SiteSettings.jsx:122-150` issues three independent PUTs through `Promise.all`; `systemSettingController.js:122-135` commits each setting independently.
- Closest control: each individual value is strictly bounded, but no batch endpoint/transaction or compensating rollback exists.
- Impact/preconditions: a network/server failure after one or two successes leaves a mixed policy while the UI reports the combined save failed and retains no authoritative partial-success state.
- Checklist: [x] R1 [x] R2 [x] R3 [x] R4 [x] R5.
- Disposition: **reportable integrity/operability defect**; high confidence.

## PG-01 — Non-finite page input reaches database skip

Rubric: R1 query reachable; R2 parse-to-sink trace complete; R3 finite/max-page controls checked; R4 failure impact bounded; R5 pure-function probe executed.

- Source → sink: public/authenticated list query → `pagination.js:22-36` → `.skip(pagination.skip)` in controllers.
- Probe: `paginate({page:'9'.repeat(400),limit:'50'},100)` returned `page: Infinity` and `skip: Infinity`.
- Closest control: limit is capped at 50, but page is not checked with `Number.isSafeInteger`/`Number.isFinite` or a maximum offset.
- Impact: crafted list requests can trigger database/query-cast errors and noisy 5xx responses; broad availability impact is bounded by the global rate limiter.
- Checklist: [x] R1 [x] R2 [x] R3 [x] R4 [x] R5.
- Disposition: **reportable low-severity robustness issue**; high confidence.

## Negative controls — automatic punitive/ownership decisions

Rubric: R1 automated decision paths searched; R2 candidate writers traced; R3 advisory/human controls inspected; R4 residual risk bounded; R5 tests/source assertions reviewed.

- Claim risk uses `policy:'advisory-only'` and does not write rejected status (`claimRiskPolicy.js`; `backend/tests/claim-risk.test.js`).
- AI feedback remains pending until an administrator acts; no automatic training consumer was found (`AIDecisionFeedback.js`, `aiFeedbackController.js`).
- Match suggestions do not approve claims; claim approval remains an explicit reporter/admin transaction (`claimController.js:190-242`).
- Disposition: **suppressed as automatic-approval/automatic-ban findings**. AF-01 and CR-01 remain separately reportable because they weaken the evidence available to the human decision-maker.

## Commands/evidence

```text
node --input-type=module -e "import { assessClaimEvidence, parseVerificationAnswers } ..."
=> {"score":95,"level":"strong","warnings":[]}

node --input-type=module -e "import { paginate } ..."
=> page Infinity; skip Infinity
```

No production/provider state was mutated. No source remediation was performed.
