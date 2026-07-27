# Operations Runbook

## Monitoring

Alert on readiness failures, repeated authentication failures, refresh-token reuse, outbox retry exhaustion, failed private-media deletion, email delivery errors, job-lock contention, elevated HTTP 5xx rates, database replication lag, Redis memory pressure, and storage growth.

Logs must be structured and must not contain tokens, reset/verification links, passwords, private proof text, provider responses, or complete personal records.

## Backups

Use encrypted MongoDB backups with retention aligned to institutional policy. Perform scheduled restore drills to an isolated environment. Media retention and deletion must follow the same policy; database references should not be removed when provider deletion fails.

## Incident response

1. Restrict traffic or enable maintenance mode.
2. Preserve logs and audit evidence.
3. Revoke affected sessions and rotate exposed credentials.
4. Identify affected users and data.
5. Apply and verify a fix in staging.
6. Restore service with heightened monitoring.
7. Document timeline, root cause, impact, and corrective actions.

## Scheduled jobs

Cleanup and reminder jobs use database-backed distributed locks. The outbox worker retries durable matching/notification events. Verify one healthy worker is running and monitor stale locks and dead-letter/retry counts.
