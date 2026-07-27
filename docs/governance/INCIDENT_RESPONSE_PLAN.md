# Incident Response Plan

## Roles
Incident commander, technical lead, privacy lead, communications lead and recorder must be named before launch.

## Lifecycle
1. Detect/triage and assign severity.
2. Preserve logs/evidence without copying unnecessary personal data.
3. Contain: revoke sessions/keys, restrict endpoints/provider, isolate instance, pause workers.
4. Eradicate root cause and verify patch.
5. Recover from trusted build/backup; monitor recurrence.
6. Notify affected parties/authorities according to law and university policy.
7. Post-incident review with actions, owners and deadlines.

## Playbooks
- Exposed credential: revoke/rotate, search logs/history, invalidate sessions and redeploy.
- Public PII/image exposure: disable access, purge caches/provider copies, identify scope, notify privacy lead.
- Fraudulent claims: preserve audit/evidence, suspend only after authorised human decision unless emergency containment.
- Database corruption: stop writes, assess transaction/outbox state, restore/reconcile.
- Provider compromise/outage: open circuit, switch approved fallback/manual mode, review data sent.

Never place reset/verification tokens or full private evidence in incident tickets or ordinary logs.
