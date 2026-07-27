# Privacy and Student Data Notice

> **Status:** University-review draft  
> **Release date:** 2026-07-26  
> **Important:** Replace bracketed institutional placeholders and obtain formal university approval before public deployment.

## 1. Purpose and controller

Smart Lost & Found helps the South Eastern University of Sri Lanka community report, search, match, claim and safely return lost property. The proposed data controller is **[University Data Controller / Responsible Department]**. Privacy enquiries must be sent to **[approved privacy contact]**.

## 2. Data collected

The service may process account identity (name, university email, student identifier, profile image and optional phone number), authentication/session records, lost/found reports, approximate location and dates, item photographs, private claim evidence, ownership answers, notifications, audit/security logs, accessibility/language preferences and AI processing metadata. Bank-card data, passwords, private addresses and unnecessary government identifiers must not be submitted.

## 3. Purposes

Data is processed to authenticate users, publish privacy-reduced reports, retrieve possible matches, verify ownership, coordinate handover, prevent abuse, operate and secure the service, respond to data-subject requests, measure recovery outcomes and satisfy university governance/audit obligations. AI provides suggestions and rankings only; it does not approve claims, suspend users or establish ownership.

## 4. Public and private fields

Public report views may show the item name, category, description, privacy-safe image, approximate location, date, status and reporter display name/profile image. Email, phone, student identifier, exact private location, original unredacted image and claim evidence are not public by default. Contact details are shared only through an approved claim/contact workflow or an explicit public-visibility choice.

Assistant conversation history is optional browser-local storage. It retains only recent user/assistant text for up to seven days and does not store structured report cards, account summaries, images or evidence. The service does not receive browser-local history merely because it is saved; messages are sent to the backend only when the user submits them to the assistant. Users can delete one session or clear all local history.

Saved public-search filters are also browser-local, limited to five entries and expire after 30 days. They are not synced to the user account. Users should not place private identifiers in search text and can delete saved searches at any time.

Accessibility preferences (text scale, contrast, motion and visual-effects choices) are stored only in the current browser and are not synced to the user account. Users can reset them from the accessibility panel or clear browser storage.

## 5. Legal basis and institutional approval

The university must document the applicable Sri Lankan legal basis and institutional mandate before launch. Expected bases may include performance of a university public task, legitimate operational interests, user consent for optional processing, and compliance with legal/security obligations. This draft does not make the legal determination.

## 6. AI and automated processing

Image analysis may suggest category, colour, brand, model, description, tags and privacy redactions. Matching may compare text, category, location aliases, dates, privacy-safe OCR, image labels and optional visual similarity. Scores are ranking signals, not probabilities of ownership. Users can ignore/edit suggestions and submit corrections. Approved corrections enter an evaluation dataset only after administrator review.

## 7. Sharing and processors

Data may be processed by approved hosting, database, object-storage/image, email, cache/queue, authentication, push-notification and AI providers. The authoritative list is in `THIRD_PARTY_PROCESSOR_REGISTER.md`. No provider may use university data beyond the contracted purpose.

## 8. Retention

Retention follows `DATA_RETENTION_AND_DELETION_POLICY.md`. Exact periods require university approval. Operational records should be retained only as long as needed for recovery, disputes, security and audit. Private evidence should have the shortest justified retention. Backups must expire on a documented schedule.

## 9. Rights and requests

Subject to applicable law and university policy, users may request access, correction, restriction, deletion/anonymisation, objection, portability where applicable, and human review of AI-assisted decisions. Requests go to **[approved privacy contact]**. Identity must be verified before disclosure or deletion.

## 10. Children, sensitive data and prohibited inference

The system must not perform face identification, infer ethnicity, religion, health, disability, political views or other sensitive traits, or expose residence-level precision. Faces and sensitive identifiers in public images should be redacted. Users must not upload evidence unrelated to ownership.

## 11. Security and incidents

Controls include HttpOnly cookie sessions, CSRF protection, role-based authorisation, upload validation, rate limiting, privacy serializers, audit records, encrypted transport, secret management, backup/restore procedures and incident response. Suspected incidents must follow `docs/governance/INCIDENT_RESPONSE_PLAN.md`.

## 12. Changes

Material changes require versioning, approval and clear notice. The service must display the effective date and preserve prior versions for audit.
