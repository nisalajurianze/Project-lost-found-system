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
