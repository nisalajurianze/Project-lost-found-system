# Phase 3 validation shard — performance and scalability

- Target: `7499a19`
- Runtime limitation: Chrome DevTools performance MCP is not configured in this session. Core Web Vitals/Lighthouse values are therefore **not measured** and remain an explicit acceptance gate.
- Local production build: passed with Vite 8.1.3, 2,782 modules, 2.69 s.

## PERF-01 — Eager application shell carries a large initial JavaScript chunk

Rubric: production build measured; source composition traced; route lazy-loading countercontrol checked; warning threshold checked; real-browser proof gap stated.

- Build evidence: main `index-D0d3fAIu.js` is 881,454 bytes (220.56 kB gzip); global CSS is 130.67 kB (20.23 kB gzip).
- Source contributors:
  - `LanguageContext.jsx:2` eagerly imports the full three-language catalog; `translations.js` alone is 290,163 source bytes and imports additional translation catalogs.
  - `App.jsx:65,200` eagerly imports/renders the 42,970-byte AI assistant on every route, along with global navigation/accessibility controls.
  - Route pages themselves are dynamically imported (`App.jsx:19-61`), which is an effective countercontrol.
  - `vite.config.js:25` raises `chunkSizeWarningLimit` to 1500 kB, hiding the standard signal rather than defining a measured performance budget.
- Impact: additional parse/compile/execute cost on first visit, especially low-end/mobile devices. Network gzip size is moderate, but no trace is available to quantify TBT/INP/LCP impact.
- Disposition: **reportable performance opportunity; browser severity deferred**. High source/build confidence.

## PERF-02 — Public chatbot search builds up to 168 unanchored regex clauses

Rubric: public entrypoint and limiter checked; query cardinality traced; indexes compared; result bound checked; load proof gap stated.

- Source → sink: public `POST /api/ai/chat` (20 requests/5 min/IP) expands up to 24 terms and seven fields (`aiChatController.js:73-85`), producing up to 168 case-insensitive regex OR clauses for each model. It executes one or two model searches (`88-99`, `183-193`).
- Closest controls: each model result is capped at 120 and status/soft-delete predicates are indexed. Text indexes exist (`LostItem.js:169-181`, `FoundItem.js:174-186`) but are not used by these regex clauses; unanchored case-insensitive regex generally cannot exploit those text indexes.
- Impact/preconditions: adversarial or simply broad multilingual queries can cause high document examination and CPU on growing collections; global/IP throttles bound a single source but do not establish query cost.
- Disposition: **reportable scalability/DoS hardening**; high static confidence, load severity deferred.

## PERF-03 — Matching performs per-candidate read/write work serially

Rubric: background entrypoint traced; candidate bound/indexes checked; per-record operations counted; provider bound checked; dataset/load proof gap stated.

- `aiMatchingService.js:52-67` permits up to 1,000 candidates (default 300) and uses a matching compound index on category/status/soft-delete/archive/date.
- After bounded parallel visual comparison of at most five (`87-97`), the loop at `100-133` may execute `Match.findOne`, `match.save`, item saves, another match save, and notification/email work per qualifying candidate, serially.
- Countercontrols: outbox execution decouples this from report HTTP latency; candidate/date/provider limits exist; Match uniqueness prevents duplicate pairs.
- Impact: long worker occupancy and job-lease pressure as report volume grows, increasing overlap with `BG-02/BG-06/BG-07` concurrency candidates.
- Disposition: **reportable scalability hotspot**; high static confidence, soak severity deferred.

## PERF-04 — Space canvas rebuilds all particles on every resize event

Rubric: UI entrypoint traced; event frequency and work counted; device/reduced-motion controls checked; browser proof gap stated.

- `SpaceBackground.jsx:35-98` resizes the backing canvas and recreates 120–900 star objects; `332-345` invokes this directly for every native `resize` event without RAF/debounce/ResizeObserver coalescing.
- Effective controls: hidden-tab animation pause, 30 fps mobile/low-effects mode, reduced-motion static rendering, and complete event cleanup are implemented (`101-109`, `302-341`, `375-387`).
- Impact: resize/orientation/visual-viewport bursts can cause repeated allocations and main-thread work, most visible on mobile/low-power devices.
- Disposition: **reportable low/medium performance hardening**; high static confidence, browser severity deferred.

## PERF-05 — Admin dashboard cache misses fan out into many database operations

Rubric: privileged entrypoint checked; query fan-out counted; cache and indexes reviewed; impact bounded; profiling proof gap stated.

- `adminController.js:42-142` starts more than 30 counts/aggregations in one `Promise.all`, including several report scans/groupings. Results are cached for 60 seconds (`21-22`, `189-190`).
- Countercontrols: admin-only route, 60-second Redis cache, time windows on many aggregates, and result limits on hotspot/cohort outputs.
- Impact: concurrent cache misses or Redis-unavailable mode can create periodic database load spikes; the candidate is magnified by `CF-01` when Redis is optional/unavailable.
- Disposition: **reportable operability hotspot**, not a standalone vulnerability; medium confidence pending production query profiling.

## PERF-06 — Claims listing materializes every owned report id before pagination

Rubric: authenticated entrypoint checked; pre-pagination reads traced; index/select controls checked; impact bounded; scale proof gap stated.

- `claimController.js:160-180` fetches all owned found/lost report ids before applying pagination to claims. Report `userId` fields are indexed and only `_id` is selected, but the two preliminary result sets are unbounded.
- Impact: high-volume accounts incur memory/latency proportional to lifetime reports on every claims-list page.
- Disposition: **reportable low-severity scalability issue**; high static confidence.

## Verification summary

```text
backend syntax: 124 JavaScript files passed
backend ESLint: passed
frontend ESLint: passed
frontend production build: passed
backend tests: 63 passed, 1 skipped, 0 failed
frontend tests: 103 passed, 0 failed
```

The skipped backend test is the MongoDB-backed concurrent refresh-family test; its environment requirement remains relevant to session validation. No browser Core Web Vitals, load, or soak claim is made.
