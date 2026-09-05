# AI Provider Routing

The production AI stack separates text and image workloads so a working chatbot does not hide a broken vision configuration.

## Recommended routing

```env
AI_ENABLED=true
AI_CHAT_PROVIDER=primary
AI_VISION_PROVIDER=openrouter

AI_API_URL=https://opencode.ai/zen/v1/chat/completions
AI_API_KEY=<OpenCode Zen key>
AI_CHAT_MODEL=ling-3.0-flash-fin-free
AI_CHAT_MODELS=ling-3.0-flash-fin-free,nemotron-3.5-lightning-free
AI_VISION_MODEL=muse-spark-1.3-contributor-free
AI_VISION_MODELS=muse-spark-1.3-contributor-free,muse-spark-1.2-contributor-free

OPENROUTER_API_URL=https://openrouter.ai/api/v1/chat/completions
OPENROUTER_API_KEY=<OpenRouter key>
OPENROUTER_CHAT_MODEL=thinkingmachines/inkling-small:free
OPENROUTER_CHAT_MODELS=thinkingmachines/inkling-small:free,minimax/minimax-m3:free,google/gemma-4-31b-it:free
OPENROUTER_VISION_MODEL=openrouter/free
OPENROUTER_VISION_MODELS=openrouter/free,thinkingmachines/inkling-small:free,minimax/minimax-m3:free
```

Never commit real keys. Set them in Railway variables and redeploy the backend.

## Workload map

| Workload | Provider/model group | Failure behavior |
| --- | --- | --- |
| Assistant reply and search wording | OpenCode Ling/Nemotron chat models | Deterministic localized response |
| Category validation, name, description, and emoji | OpenCode chat models | Safe normalized category and deterministic icon |
| Uploaded-photo details, privacy regions, OCR, and captions | OpenRouter free multimodal router/models | Manual privacy review; report remains usable |
| Stored-image analysis and direct visual comparison | OpenRouter free multimodal router/models | Bounded local/text evidence only |

Muse models use OpenCode's `/v1/responses` request and response format. The provider client selects that format automatically for `muse-spark-*`; OpenRouter multimodal models use `/v1/chat/completions` with the original image input. Free-model capacity changes over time, so verify real chat and image requests after every routing change.

## Verification

1. Confirm `/api/health` and `/api/health/ready` return `200`.
2. As an administrator, inspect `/api/admin/ai-health`. Verify `configuredProviders.chat` shows the OpenCode host and `configuredProviders.vision` shows `openrouter`.
3. Send a normal chatbot message and confirm `purposes.assistant-chat.successes` increases.
4. Upload a non-sensitive test image and confirm `purposes.report-auto-fill.successes` increases.
5. Verify an unavailable provider produces a usable fallback rather than blocking report submission.

Liveness/readiness endpoints validate application dependencies; they do not call external AI providers. Use the AI health metrics and actual smoke requests for provider acceptance.

## 2026-09-05 upload/session verification

- The previous deployed browser bundle sent API calls directly to Railway. Production Vercel builds now use the existing same-origin `/api` rewrite, including multipart uploads and session refresh, even if an old deployment variable contains the Railway URL. Other hosts retain their configured API URL.
- Failed session refresh now clears Redux authentication and redirects protected reports to login. Image preparation finishes before waiting for the separate AI/privacy scan.
- Frontend verification: 138 tests, lint, and production build passed. Six desktop/mobile browser checks exercised multipart retry after a successful refresh, login redirect after a rejected refresh, and manual review after an AI 503. Browser API responses in these regression checks are mocked; they do not certify an external model.
- Live frontend code deployed with commit `da66a35`; the public chatbot returned a relevant response in 3.9 seconds on September 5. The local OpenCode Muse vision request timed out after 18 seconds.
- A browser regression against the deployed frontend also passed: both the initial upload and its refreshed retry used the website's own `/api` origin. API responses were mocked for this session-recovery check.
- Live OpenRouter photo analysis still needs a signed-in smoke test. The connected browser has no authenticated session and the connector does not expose provider key values. Do not mark vision fixed based on chatbot success or browser mocks.

To reproduce browser checks without replacing historical tracked test artifacts, use `PLAYWRIGHT_BASE_URL` for the preview/deployment URL and run `node node_modules/@playwright/test/cli.js test e2e/report-session.spec.js --output=.tmp/report-session-results --reporter=list` from `frontend`. Set `PLAYWRIGHT_CHANNEL=chrome` if using an installed Chrome instead of bundled Chromium.
