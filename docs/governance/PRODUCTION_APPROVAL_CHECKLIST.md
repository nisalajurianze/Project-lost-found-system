# Production Approval Checklist

## Source and security
- [ ] Exact commit/tag and clean tree
- [ ] No critical/high unresolved findings
- [ ] Secret/history scan and all historical credentials rotated
- [ ] Cookie/CSRF/CORS/CSP/WebSocket/HTTPS verified
- [ ] Public PII and signed private evidence tests pass
- [ ] SAST/dependency/container/DAST results reviewed

## Build and infrastructure
- [ ] Clean Linux Node 22 `npm ci`
- [ ] Backend full tests and frontend lint/tests/build
- [ ] Docker images/Compose and non-root runtime
- [ ] MongoDB replica set transaction/migration tests
- [ ] Authenticated Redis and distributed workers
- [ ] Cloudinary/email/OAuth/push/AI/places verification as enabled
- [ ] backup restore and rollback drill
- [ ] load, soak and failure-recovery tests

## Experience/governance
- [ ] EN/SI/TA browser/mobile UAT
- [ ] WCAG 2.2 AA review
- [ ] privacy/terms/retention/processors approved and published
- [ ] support/escalation contacts complete
- [ ] field/location data approval
- [ ] university UAT/privacy/security/administrative sign-off

## Immutable release
- [ ] file manifest and ZIP SHA-256 generated
- [ ] all evidence tied to the same checksum
- [ ] production approval record signed
