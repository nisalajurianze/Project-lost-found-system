# Third-Party Processor Register

> **Status:** University-review draft  
> **Release date:** 2026-07-26  
> **Important:** Replace bracketed institutional placeholders and obtain formal university approval before public deployment.

| Function | Candidate/Configured provider | Data categories | Required controls/status |
|---|---|---|---|
| Hosting/runtime | Railway or approved replacement | Application traffic, logs | Contract/DPA, region, TLS, access logs, deletion verified **[pending approval]** |
| Database | MongoDB/Atlas or approved MongoDB host | Accounts, reports, claims, audit | Encryption, replica set, backups, least privilege **[pending live verification]** |
| Cache/queue | Redis provider | Cache, locks, queue metadata | Authentication, TLS, eviction/retention **[pending live verification]** |
| Image/object storage | Cloudinary or approved replacement | Public/private images, evidence | Signed private access, deletion, transformation, DPA **[pending live verification]** |
| Email | SMTP/Resend or approved service | Email, message metadata | SPF/DKIM/DMARC, suppression, DPA **[pending]** |
| Google sign-in | Google OAuth when enabled | OAuth identity claims | Verified-email requirement, approved client IDs **[optional/pending]** |
| Push | Web Push/VAPID/browser push services | Subscription endpoint/keys | Consent, unsubscribe, secret rotation **[optional/pending]** |
| AI chat/vision | Configured OpenRouter/compatible providers | Prompt text, privacy-reduced images/metadata | No training, retention limits, redaction, DPA, region **[provider-dependent]** |
| Places/geocoding | Optional approved provider | Search text, approximate coordinates | Terms-compliant caching, minimisation **[optional/pending]** |

Provider names, sub-processors, hosting regions, retention, transfer mechanisms and contract owners must be completed before approval. Provider keys remain backend-only.
