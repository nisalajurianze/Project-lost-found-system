# Administrator Manual

## Roles and access
Admin access is role-gated; there is no hard-coded startup promotion. Bootstrap the first administrator only with the protected one-time command and environment-supplied password. Never share admin accounts.

## Daily attention queue
The administrator navigation and operational dashboard follow the selected English, Sinhala or Tamil interface language. Review pending/overdue claims, strong matches, handovers over 48 hours, dead outbox jobs, weak evidence, privacy moderation, advisory risk flags, AI feedback and location suggestions. Counts must come from database queries, not hard-coded metrics, and every AI flag remains advisory until a human review is recorded.

## Claims and safety
Read ownership answers and private evidence. Risk signals are advisory only. Record reasons for approval/rejection. Share contact only through the dedicated action. Confirm completion after physical handover evidence/participant confirmation.

## Lost and found report moderation
The administrator lost/found queues share one translated moderation workflow. “Archive” is a transactional soft-delete/closure action: report images and analysis are removed, active matches and pending claims are rejected, and an active handover must be cancelled before archival. Do not describe this workflow as an irreversible database-row deletion.

## User and category administration
User-account closure is a privacy-safe anonymisation and workflow-closure operation, not a simple permanent row deletion. The server prevents suspending, demoting or anonymising the last active administrator. Category removal is also state-aware: a category with linked reports is deactivated rather than deleted so historical report associations remain valid.

## Critical human-review queues
Claims, AI match suggestions, community location records and AI correction feedback must be reviewed in the selected English, Sinhala or Tamil interface language. Similarity scores, risk indicators and community suggestions are advisory evidence only; record an explicit authorised human decision before changing workflow state, activating a location as verified or approving feedback for dataset use.

## Site settings and claim safeguards
Maintain public support contact details only after the university confirms them. Email verification should remain enabled outside an explicitly authorised test environment. Pending-claim and 24-hour submission limits temporarily block additional claim requests; they do not punish the account. The rejected-claim threshold adds an advisory signal to the human-review queue for the configured 90-day pattern window. It never bans, suspends, approves or rejects a user automatically.

## AI feedback governance
Approve/reject corrections before evaluation/training dataset use. Review target, dimension, note, algorithm version and submitter. Do not approve coordinated/spam feedback. Dataset/model changes require versioned evaluation.

## Location knowledge
Community suggestions begin unverified. Check aliases, source, coordinates, sensitivity and version history. Promote through map-source/field/university-approved states. Private residences must remain approximate/restricted.

## Content/privacy moderation
Review images marked review/reject, verify redactions, remove public sensitive data and retain originals only under policy. Never identify faces or infer sensitive traits.

## Users and audit
Role/status changes are audited and revoke sessions. Do not delete the last active admin. User deletion uses anonymisation/cascade policy to avoid orphan records.

## Operations
Monitor AI health, database/Redis readiness, outbox delivery, email/push failures and logs. Follow incident response for suspected breach. Use one lifecycle scheduler with distributed locking.

## Historical recovery cohorts
The analytics page may show category and governed-location cohorts only after the configured minimum number of verified lost-report outcomes exists. Review sample size, observed recovery rate, the 95% uncertainty interval and average verified recovery time together. These aggregates do not predict an individual report, do not use user-level profiling and must never drive automatic claim, suspension or handover decisions.

## Handover resolution and cancellation evidence
A participant should mark a handover complete only after the physical exchange. Cancelling a handover reopens the paired reports, returns linked approved claims to human review and records a bounded reason for reviewer context. The interface must never describe an AI match as proof that ownership or handover was completed. Recovery feedback is separate from ownership evidence and must not contain phone numbers, passwords or private claim material.

## Audit, analytics and feedback evidence
- Audit records preserve original action details. Missing IP addresses, targets or actor metadata are displayed as **not recorded**; the interface does not invent localhost or placeholder evidence.
- Analytics uses database-backed aggregate counts, stable brief/recommendation types and structured parameters so interface labels can be rendered in English, Sinhala or Tamil. Legacy messages remain available for compatibility, but no user-level profiling or individual recovery prediction is performed.
- Historical cohort guidance must be read with its sample size, minimum-sample gate, observed rate, uncertainty interval and verified recovery duration. It is advisory only.
- Feedback filters use the backend categories `general`, `bug_report`, `feature_request`, `complaint` and `praise`. Preserve the user's original subject and message unchanged. Only authorised administrators may send an official response through the validated response action, and the response status must be recorded.

## Backup and recovery
Follow the documented runbook. Test restoration into an isolated environment, verify counts/checksums and record RPO/RTO evidence. Never overwrite production during drills.

## Release approval
Run the production checklist, exact source checksum, migration dry run, browser/accessibility UAT, provider tests, security scans and institutional sign-off before public release.
