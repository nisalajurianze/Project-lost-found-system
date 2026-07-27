# Data Retention and Deletion Policy

> **Status:** University-review draft  
> **Release date:** 2026-07-26  
> **Important:** Replace bracketed institutional placeholders and obtain formal university approval before public deployment.

## Principles
Retention must be necessary, proportionate, documented and automatically enforceable. Legal holds override deletion only when authorised and recorded.

## Proposed schedule requiring approval
| Record | Proposed operational period | End action |
|---|---:|---|
| Active lost/found report | Until resolved/cancelled plus **[approved period]** | Archive then anonymise/delete |
| Private claim evidence | Claim closure plus **[short approved period]** | Delete original and derived private copies |
| Rejected/withdrawn claim | **[approved dispute period]** | Anonymise/delete |
| Session records | Until expiry/revocation plus short security window | Delete |
| Notifications/outbox | **[approved operational period]** | Delete/aggregate |
| Security/audit logs | **[approved audit period]** | Secure deletion |
| AI provider telemetry | Minimum needed for reliability/cost/security | Aggregate/delete identifiers |
| Approved AI feedback | Versioned evaluation dataset under governance | Periodic necessity review |
| Backups | **[approved backup cycle]** | Cryptographic/physical expiry |

## Account deletion
The account service must revoke sessions, remove optional profile/contact data and anonymise records needed for claim/audit integrity. Active claims and legal holds require a documented resolution path. Deletion results must be logged without retaining the deleted sensitive data.

## Automation and review
One authoritative lifecycle worker with distributed locking performs scheduled actions. Overlapping cleanup jobs are prohibited. Retention configuration, failures and restore copies are reviewed quarterly or after material system changes.
