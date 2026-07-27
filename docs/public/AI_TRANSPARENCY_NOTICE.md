# AI Transparency Notice

> **Status:** University-review draft  
> **Release date:** 2026-07-26  
> **Important:** Replace bracketed institutional placeholders and obtain formal university approval before public deployment.

## What AI does
- Understands English, Sinhala, Tamil, Singlish/Tamilish and mixed queries.
- Retrieves and ranks lost/found reports.
- Suggests image-derived item fields and normalised privacy-redaction regions. The report wizard requires each newly selected public image to be resolved before submission and can create a browser-side privacy-safe replacement file.
- Calculates explainable similarity across category, text, attributes, location, date/time and image metadata.
- Suggests ownership questions, report-quality improvements and duplicate reports.
- Flags evidence/claim patterns for human review and produces operational summaries.
- Provides bounded, text-only conversation history in the current browser; structured cards, account summaries, images and evidence are excluded and sessions expire after seven days.

## What AI does not do
AI does not identify faces, infer sensitive personal traits, establish legal ownership, approve/reject a claim, suspend a user, impose discipline or guarantee a match. Predictive outputs are labelled as estimates and require sufficient historical data and approval.

## Scores and confidence
A match score is a deterministic/model-assisted ranking signal, not a probability that two reports describe the same item. The interface explains available evidence and missing/caution dimensions. Impossible date ordering caps scores.

## Human control
Users review/ignore/edit suggestions, use manual forms/search when providers fail, correct AI details and request human review. Match decisions and corrections are stored in a pending governance queue; only administrator-approved records can enter evaluation/training datasets.

## Privacy and providers
Sensitive visible text is masked. For newly selected public report photos, detected regions can be pixelated in the browser and the replacement file is submitted instead of the original browser file. Automated detection remains provider-dependent and requires live acceptance testing. Provider keys remain server-side. Provider use must satisfy the processor register, retention limits and no-training requirements.

## Monitoring
The admin dashboard records request counts, provider success/failure, latency, fallback use and human correction queues. Material model/provider changes require evaluation, documentation and approval.
