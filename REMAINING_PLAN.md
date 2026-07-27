# Remaining Plan

This is the authoritative completion plan for turning the current hardened release candidate into the final university public-release build.

## Completion rules

- Preserve all existing working lost-and-found functions.
- Preserve the signature space animation; optimise it rather than removing it.
- Do not remove the original AI chatbot, AI matching, category/icon suggestion, image recognition or image auto-fill capabilities.
- Do not call a feature implemented until source, tests and user-facing behaviour all agree.
- Do not call a release production-certified until the exact checksum passes target-environment gates.

---

## Phase 1 — Consolidate the latest AI and UI implementation

### 1.1 Deep chatbot engine

> **Implementation progress — 2026-07-26:** weighted multilingual OR/fuzzy retrieval, explainable structured result cards, bounded pagination, authenticated activity summaries, mobile full-screen/desktop side-panel UI, focus management, live regions and multilingual voice selection are now physically implemented and covered by focused tests. Durable conversation memory, report-draft handoff, provider-grounded help, full database/browser/build verification and field-data-backed location intelligence remain pending.


Implement and verify:

- English, Sinhala and Tamil Unicode
- Singlish and Tamilish
- Mixed Sinhala/English and Tamil/English messages
- Language/style continuity across the conversation
- Weighted retrieval instead of strict all-keyword matching
- All relevant results, total result count and pagination
- Bounded fuzzy and synonym matching
- Context memory and follow-up query refinement
- Meaningful clarification questions only when material ambiguity exists
- Authenticated answers about the user's reports, claims, matches and notifications
- Structured result cards rather than plain text-only output
- “Show more”, refine, open report and start claim actions
- AI-assisted report draft handoff to the report wizard
- Grounded system/help answers with uncertainty disclosure
- Deterministic/manual fallback when an AI provider is unavailable

### 1.2 Preserve and improve original AI integration

Verify the full provider path and preserve backward compatibility for:

- Original AI API key configuration
- Multiple keys and models where supported
- Chat model failover
- Vision model failover
- Image recognition
- Item name/category/icon suggestions
- Description, tags, colour and characteristic suggestions
- Form auto-fill with user review
- Existing manual entry fallback
- Provider timeout, retry, schema validation and monitoring
- No API key exposure to the browser

### 1.3 Explainable AI matching

Implement and verify matching across:

- item type/category
- semantic item name and description
- brand and model
- primary and secondary colours
- material
- unique marks
- tags and privacy-safe visible text
- location aliases and distance context
- date/time plausibility
- image labels
- optional image-to-image similarity
- previous user decisions and duplicate suppression

The UI must explain why a match was suggested and state that the score is not proof of ownership.

### 1.4 AI capability portfolio

Create a source-backed status matrix for all planned AI capabilities:

1. Advanced image recognition
2. OCR and safe identifier masking
3. Image-to-image similarity
4. Semantic multilingual matching
5. Location intelligence
6. Date/time reasoning
7. Duplicate-report detection
8. Conversational report creation
9. Voice input
10. Natural-language search
11. Explainable matching
12. Confidence calibration
13. Smart ownership questions
14. Evidence-quality checks
15. Fraud/abuse review flags
16. Image moderation
17. Privacy redaction
18. Category/icon intelligence
19. Report-quality scoring
20. Missing-information assistance
21. Translation/normalisation
22. Admin AI triage
23. Daily operational summaries
24. Recovery analytics
25. Predictive recommendations
26. Smart notifications
27. Feedback-based improvement
28. Provider failover
29. AI monitoring
30. AI governance/safety controls
31. SEUSL regional micro-location intelligence

Each capability must be marked `implemented`, `partial`, `provider-dependent`, `field-data-dependent` or `planned`, with linked source files and tests.

---

## Phase 2 — Complete the UI redesign

### 2.1 Design system and typography

- 16px minimum base text
- Sinhala and Tamil font fallbacks
- consistent spacing, radii, elevation, focus and motion tokens
- stronger contrast and non-colour-only statuses
- split large global styles into maintainable modules

### 2.2 Space animation preservation

- retain full signature animation on the home hero
- use subtle variants on authentication and content pages
- lower particle/effect density on low-power/mobile devices
- pause in background tabs
- respect `prefers-reduced-motion`
- provide an attractive static fallback
- keep it decorative and hidden from assistive technology

### 2.3 Navigation

- task-first desktop navigation
- mobile navigation with a central Report action
- accessible language switcher
- skip link and semantic landmarks
- no collision among chatbot, bottom navigation and scroll controls

### 2.4 Chatbot UI

- mobile full-screen assistant
- desktop side panel
- focus management and keyboard support
- `aria-live` status/result updates
- structured report/match/location/claim cards
- result counts and pagination
- confidence, explanation and correction controls
- language and voice-input controls
- conversation history and new-conversation action

### 2.5 Public search and result pages

- natural-language search
- Lost / Found / Both selector
- advanced filters and removable filter chips
- all relevant results ordered by relevance
- list/grid modes
- better no-result recovery
- accessible non-nested item cards
- save/search-again support where approved

### 2.6 Report creation and editing

Use the same guided workflow for create and edit:

1. Photo and AI analysis
2. Item details
3. Location and time
4. Privacy, review and submission

Add:

- AI suggestions with confidence and Apply/Ignore/Edit controls
- no silent field overwrites
- autosaved drafts
- upload progress and image crop/rotation
- smart location autocomplete without requiring a visible map
- validation error summary
- character counters
- final review screen
- offline/low-bandwidth draft handling

### 2.7 Claims, matches and handover

- dedicated claim steps
- private-evidence explanation
- match side-by-side comparison
- explanation dimensions
- claim and handover timelines
- clear human-decision wording
- mobile sticky primary action without overlapping navigation

### 2.8 Dashboards

Student dashboard:

- needs-attention section
- quick actions
- active reports
- matches and claims
- recovery progress
- optional install/push/profile prompts below primary tasks

Administrator dashboard:

- claims awaiting review
- strong matches awaiting action
- overdue handovers
- failed notifications/outbox jobs
- AI provider health
- human AI-risk review queue
- privacy requests and audit activity
- location-knowledge approval queue

### 2.9 Accessibility

Target WCAG 2.2 AA:

- keyboard navigation
- visible focus
- dialog focus trap and restore
- accessible select/combobox behaviour
- 44–48px touch targets
- semantic headings/landmarks
- live-region status messages
- 200% text zoom
- reduced motion
- language attributes
- screen-reader labels
- browser/mobile accessibility checks

---

## Phase 3 — SEUSL internal location intelligence

No visible map is mandatory. The AI must use internal location knowledge for search, report auto-fill, matching and guidance.

### 3.1 Coverage

- SEUSL Oluvil campus
- Sammanthurai Faculty of Applied Sciences
- Mahapola/Technology-related locations
- Oluvil village
- Palamunai and Addalaichenai surroundings
- relevant Akkaraipattu–Kalmunai corridor locations
- roads, lanes, junctions, bus stops, shops, boarding areas and student landmarks

### 3.2 Data model

Store:

- canonical name
- Sinhala/Tamil/English names
- Singlish/Tamilish aliases and misspellings
- student/local nickname
- campus, village and administrative area
- coordinates and approximate zone
- nearby roads and landmarks
- verification source/date/status
- public/restricted sensitivity
- aliases and relationship graph

### 3.3 Data acquisition and governance

- official university records
- approved public geographic sources
- optional live Places lookup used according to provider terms
- field-survey GPS data
- student/community corrections
- administrator approval and version history
- confidence-based answers
- no publication of security-sensitive or private residence details

### 3.4 Acceptance tests

- local aliases resolve correctly
- small-area descriptions refine results
- ambiguity triggers a useful targeted question
- location information affects match ranking
- unverified records are never presented as verified facts
- private locations are precision-reduced

---

## Phase 4 — Finish the university public documentation pack

Physically include and link-test:

- Privacy and Student Data Notice
- Terms of Use
- Acceptable Use Policy
- Cookie and Session Notice
- Data Retention and Deletion Policy
- Third-party Processor Register
- Accessibility Statement
- AI Transparency Notice
- User Manual
- Administrator Manual
- Support and Escalation Guide
- SRS
- Software Design Document
- architecture/UML diagrams
- ER diagram and data dictionary
- OpenAPI specification
- Test Plan and Cases
- DPIA and Risk Assessment
- UAT and approval sign-off template
- Backup/Disaster Recovery Plan
- Incident Response Plan
- Production Approval Checklist
- SBOM
- Dependency Licence Review
- updated University Project Report and PDF

Remove outdated statements about token handling, AI thresholds, deployment providers and production readiness.

---

## Phase 5 — Final source regression

Run on the consolidated source tree:

### Backend

- syntax check of every JavaScript file
- complete unit/security suite
- MongoDB replica-set integration tests
- concurrent refresh rotation/reuse tests
- concurrent claim approval tests
- item/match/claim transaction tests
- notification/email idempotency tests
- AI retrieval/language/location tests
- image-analysis/redaction tests

### Frontend

- ESLint with zero errors
- component/unit tests
- multilingual UI tests
- chatbot result/pagination tests
- report wizard tests
- accessibility automated tests
- broken import/route checks
- production build

### Repository and documents

- secret scan
- populated `.env` exclusion
- JSON/YAML/OpenAPI validation
- broken documentation links
- licence/SBOM consistency
- release-hygiene scan

---

## Phase 6 — Target-environment certification

These gates require real infrastructure and credentials:

- clean Linux `npm ci`
- live dependency advisory scans
- frontend production build
- Docker images and full Compose stack
- MongoDB replica set and migration dry run
- authenticated Redis
- Cloudinary public/private upload, signed access and delete
- email verification/reset/claim/handover delivery
- Google OAuth when enabled
- VAPID push delivery when enabled
- AI provider chat/vision/failover tests
- optional place-provider tests
- HTTPS cookie, CSRF, CORS, CSP, WebSocket and SPA-route checks
- SAST, secret, dependency, container and DAST scans
- backup and restore drill
- rollback test
- load, failure-recovery and soak tests
- Chrome/Edge/Firefox/Safari/mobile UAT
- WCAG 2.2 AA review
- university privacy/security/administrative approval

---

## Phase 7 — Final immutable release

Produce:

- complete source ZIP
- exact source commit/tag or release identifier
- generated frontend build evidence
- test and scan logs
- migration report
- provider verification report
- backup/restore evidence
- UAT and institutional sign-off
- release manifest with every file hash
- ZIP SHA-256 checksum
- final production approval record tied to that checksum

## Definition of complete

The project is complete only when:

- requested user-visible AI/UI features are physically present in source;
- tests demonstrate those behaviours;
- all required documents are physically present and consistent;
- target infrastructure gates pass;
- no unresolved critical/high security finding remains;
- the university signs the UAT/privacy/security approval for the exact release checksum.
