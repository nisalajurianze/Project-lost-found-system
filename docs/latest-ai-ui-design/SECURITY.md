# Security Model

## Trust boundaries

Guests may read sanitized public reports. Authenticated users may manage only their reports, claims, matches, notifications, and profile. Reporters and administrators review claims. Administrator routes use centralized role authorization. Provider credentials, claim evidence, session hashes, internal relationship IDs, and private contact data are server-side secrets.

## Authentication

Access tokens are short-lived JWTs stored in HttpOnly cookies. Refresh tokens are opaque random values; only hashes are persisted. Rotation is transaction-backed. Reuse of an old token revokes the complete session family. Password changes, deactivation, and account deletion revoke active sessions.

State-changing cookie-authenticated requests require a matching CSRF cookie/header pair. Production rejects insecure cookies, HTTP client origins, short signing secrets, missing required providers, and MongoDB deployments without transaction support.

## Privacy

Public item serializers expose only public report fields and a minimal reporter identity. Email, phone, student ID, connected-user metadata, and private media identifiers are removed. Legacy public-contact flags cannot bypass the approved claim/contact workflow. Match responses never contain contact data.

Claim proof descriptions and images are visible only to the claimant, target reporter, or administrator. Proof images use authenticated Cloudinary delivery and short-lived signed URLs.

## Uploads

Uploads are limited by count and size, validated by MIME type and file signature, and sent to segregated folders. Private claim evidence is not stored as a public asset. Replacement workflows upload and save the new asset before deleting the old one.

## Operational controls

- Exact CORS allowlist
- Helmet security headers and restrictive Nginx CSP
- Rate limits and request-size limits
- Mongo sanitization and express-validator input contracts
- Durable outbox retries and notification deduplication
- Distributed locks for scheduled work
- Admin audit logs
- Non-destructive initialization and explicit administrator bootstrap
- CI secret scanning, dependency review, and CodeQL

## Vulnerability reporting

Do not include passwords, tokens, private proof images, or personal data in reports. Supply a minimal reproduction, affected endpoint, impact, and suggested remediation through the project owner's private security channel.
