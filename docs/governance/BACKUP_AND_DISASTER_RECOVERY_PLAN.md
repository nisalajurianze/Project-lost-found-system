# Backup and Disaster Recovery Plan

## Objectives requiring approval
RPO: **[approved duration]**. RTO: **[approved duration]**. Owners/on-call contacts: **[complete]**.

## Backups
Use encrypted automated MongoDB snapshots plus tested export where appropriate; protect object/image storage metadata and configuration/secrets separately; retain audit/outbox state consistently. Redis is not authoritative unless configured for queue durability. Maintain off-account/off-region copy according to risk and contracts.

## Restore drill
1. Declare drill/incident and freeze destructive automation.
2. Select known-good backup and verify checksum/metadata.
3. Restore into isolated environment with rotated secrets.
4. run migrations in dry-run then apply.
5. compare collection/document counts, indexes and sample privacy fields.
6. verify signed/private images, sessions revoked as needed, outbox dedupe and app smoke/UAT.
7. document actual RPO/RTO, gaps and approval.

## Failover and rollback
Deploy immutable image/source checksum; retain previous compatible release; back up before migration; provide backward/forward migration plan; route traffic only after readiness. Do not restore over production during a test.
