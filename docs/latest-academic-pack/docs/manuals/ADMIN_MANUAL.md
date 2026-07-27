# Administrator Manual

## 1. Role and accountability

Administrators operate a university service, not an AI autopilot. Every claim, enforcement, sensitive-location publication, and handover decision requiring judgement remains human-owned and auditable.

## 2. Daily opening checks

1. Review `/health/live` and `/health/ready`.
2. Check failed/dead outbox events and email/push/media/AI provider health.
3. Review urgent claims, handover confirmations, privacy reports, AI human-review flags, and unverified locations.
4. Confirm backup success and security alerts.
5. Ensure at least two active authorised admins remain.

## 3. Claims queue

- Verify the target report and claimant relationship.
- Review only necessary private evidence.
- Compare unique private identifiers, timing, location, and match evidence.
- Request more information rather than guessing.
- Record a concise reason for approval/rejection.
- Approval updates connected reports transactionally and rejects competing pending claims consistently.
- Do not download/share private evidence outside approved workflow.

## 4. AI human-review queue

Flags may indicate unusual frequency, repeated rejected claims, duplicate proof content, weak evidence, privacy/content risk, or AI-quality feedback.

- **Start review** assigns operational attention.
- Check underlying records and context.
- Resolve only after human decision.
- Dismiss false positives with reason.
- AI flags cannot suspend users or reject claims.

## 5. Users

- Activate/deactivate only with approved reason.
- Role changes revoke sessions.
- The last active admin cannot be demoted/deactivated by concurrent requests.
- Admin deletion uses anonymisation and workflow cleanup; use least privilege and dual review for sensitive actions.

## 6. Reports and matches

- Correct or moderate unsafe public content.
- Preserve audit evidence.
- Do not reveal hidden contact or private proof.
- Review explainable score breakdown; never approve ownership from score alone.
- Rejected matches must remain rejected unless a new validated workflow explicitly reopens them.

## 7. Location knowledge

Review community-submitted lanes, landmarks, boarding/shop names, bus stops, and aliases. Verify source, approximate coordinates/area, privacy sensitivity, and local spelling. Do not publish private residences, student room numbers, CCTV/blind spots, server/security rooms, key storage, or unsafe operational detail.

Optional live place-provider data is a reference; university-owned verified records are the authoritative layer.

## 8. Categories and icons

Use normalised unique categories. AI may suggest spelling/icon/description, but admin approves. Rename migrates related reports transactionally. Do not delete a category that still has records; deactivate or migrate.

## 9. AI operations

Monitor feature/provider/model success, failures, latency, token use, feedback, fallbacks, and outbox status. Disable optional AI with `AI_ENABLED=false` if unsafe/unavailable; manual reporting/search remains available. Rotate compromised keys immediately.

## 10. Settings

Only approved public keys may be exposed. Security limits, provider secrets, anti-spam controls, and private contact configuration remain admin/server-only. Record changes in audit logs and change management.

## 11. Incident response

Follow `docs/operations/INCIDENT_RESPONSE_PLAN.md`. Preserve logs, revoke sessions/keys, isolate unsafe providers, notify authorised leadership/privacy/security officers, and document timeline and decisions. Do not disclose incident details publicly without approval.

## 12. Backup and recovery

Follow `docs/operations/BACKUP_DR_PLAN.md`. Regularly test restore to isolated staging. Backups containing personal data must be encrypted and access logged.

## 13. Release approval

Do not declare production approval until the release checklist, migration dry run, clean build, container scan, DAST, staging UAT, accessibility, provider tests, backup restore, load/soak, monitoring, rollback, credential rotation, and institutional sign-offs pass.
