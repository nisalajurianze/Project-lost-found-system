# Package Contents

## Runnable source

The package root contains the current hardened backend, frontend, Docker, CI and operations source tree.

## Newly implemented chatbot/search increment

- `backend/services/chatSearchService.js` — Unicode-safe multilingual expansion, intent detection, bounded fuzzy matching and explainable weighted scoring
- `backend/controllers/aiChatController.js` — structured paginated search responses and authenticated activity summaries
- `frontend/src/components/common/AIChatbot.jsx` — mobile full-screen / desktop side-panel assistant with structured cards, focus management, live regions and voice-language selection
- `backend/tests/chat-search.test.js` and `frontend/tests/ai-chat.test.mjs` — focused regression coverage
- `docs/implementation/DEEP_CHATBOT_SEARCH_UI_BATCH_2026-07-26.md` — exact implementation boundary and pending gates

## Latest AI/UI design artifacts

`docs/latest-ai-ui-design/` contains the broader AI/chatbot/UI/security/deployment design artifacts that are not yet fully implemented.

## Latest academic documentation

`docs/latest-academic-pack/` contains the latest available university report, SRS, software design and user/administrator manuals.

## Status and roadmap

- `CURRENT_IMPLEMENTATION_STATUS.md` — exact implemented-versus-planned boundary
- `REMAINING_PLAN.md` — authoritative remaining implementation and certification plan
- `PROJECT_COMPLETION_MATRIX.md` — remediation and verification status
- `PACKAGE_VERIFICATION.md` — checks executed on this package
- `PRODUCTION_CERTIFICATION_STATUS.md` — external target-environment blockers

## Excluded for safety and reproducibility

- populated `.env` files
- `.git` history
- `node_modules`
- stale frontend `dist`
- untracked scratch files
- real provider credentials
