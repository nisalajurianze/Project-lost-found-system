# Data Protection Impact and Risk Assessment

## Processing necessity
The service processes identity, item reports, approximate location, images and private ownership evidence to return property. Public data is minimised; private evidence/contact is role/relationship gated. AI is assistance only.

## Principal risks and controls
| Risk | Initial | Controls | Residual/owner |
|---|---|---|---|
| Public student/contact exposure | Critical | DTO serializers, request-only contact, tests | Low/Privacy owner |
| Session theft/XSS | High | HttpOnly cookies, CSP, CSRF, no localStorage tokens | Medium/Security |
| False claim/property theft | High | private questions/evidence, human review, handover timeline | Medium/Service owner |
| Sensitive image/OCR exposure | High | moderation, masking, redacted public copy, signed private access | Medium/Privacy |
| AI false positive/bias | High | explanations, missing evidence, no auto decisions, corrections | Medium/AI governance |
| Precise residence/location exposure | High | sensitivity, precision reduction, approved knowledge | Low/Location owner |
| Provider retention/training | High | DPA/no-training/minimisation, processor register | Pending contracts |
| Database inconsistency | High | replica-set transactions, outbox/idempotency | Low after target test |
| Abuse/harassment | High | rate limits, advisory risk, admin review/audit/escalation | Medium |
| Data loss/outage | High | backups, restore/rollback drills, graceful fallback | Pending target evidence |

## Consultation and approval
Consult students, administrators, privacy/legal, security and accessibility stakeholders. Complete legal basis, contacts, retention, providers and residual-risk acceptance before launch. High residual risk must be escalated to the competent university authority.
