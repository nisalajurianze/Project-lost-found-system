# AI Provider Routing

The production AI stack separates text and image workloads so a working chatbot does not hide a broken vision configuration.

## Recommended routing

```env
AI_ENABLED=true
AI_CHAT_PROVIDER=openrouter
AI_VISION_PROVIDER=primary

AI_API_URL=https://opencode.ai/zen/v1/chat/completions
AI_API_KEY=<OpenCode Zen key>
AI_VISION_MODEL=muse-spark-1.3-contributor-free
AI_VISION_MODELS=muse-spark-1.3-contributor-free,muse-spark-1.2-contributor-free

OPENROUTER_API_URL=https://openrouter.ai/api/v1/chat/completions
OPENROUTER_API_KEY=<OpenRouter key>
OPENROUTER_CHAT_MODEL=thinkingmachines/inkling-small:free
OPENROUTER_CHAT_MODELS=thinkingmachines/inkling-small:free,minimax/minimax-m3:free,google/gemma-4-31b-it:free
```

Never commit real keys. Set them in Railway variables and redeploy the backend.

## Workload map

| Workload | Provider/model group | Failure behavior |
| --- | --- | --- |
| Assistant reply and search wording | OpenRouter chat models | Deterministic localized response |
| Category validation, name, description, and emoji | OpenRouter chat models | Safe normalized category and deterministic icon |
| Uploaded-photo details, privacy regions, OCR, and captions | OpenCode Muse vision models | Manual privacy review; report remains usable |
| Stored-image analysis and direct visual comparison | OpenCode Muse vision models | Bounded local/text evidence only |

Muse models use OpenCode's `/v1/responses` request and response format. The provider client selects that format automatically for `muse-spark-*`; other configured models continue to use `/v1/chat/completions`.

## Verification

1. Confirm `/api/health` and `/api/health/ready` return `200`.
2. As an administrator, inspect `/api/admin/ai-health`. Verify `configuredProviders.chat` shows `openrouter` and `configuredProviders.vision` shows the OpenCode host and Muse model.
3. Send a normal chatbot message and confirm `purposes.assistant-chat.successes` increases.
4. Upload a non-sensitive test image and confirm `purposes.report-auto-fill.successes` increases.
5. Verify an unavailable provider produces a usable fallback rather than blocking report submission.

Liveness/readiness endpoints validate application dependencies; they do not call external AI providers. Use the AI health metrics and actual smoke requests for provider acceptance.
