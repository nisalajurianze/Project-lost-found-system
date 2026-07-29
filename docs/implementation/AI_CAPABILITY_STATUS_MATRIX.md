# AI Capability Status Matrix

Statuses are evidence-based. `provider-dependent` and `field-data-dependent` are not claimed complete until live provider/field/institutional gates pass.

| # | Capability | Status | Source | Test/evidence |
|---:|---|---|---|---|
| 1 | Advanced image recognition | `provider-dependent` | `backend/services/imageAnalysisService.js`; `frontend/src/components/common/AISuggestionReview.jsx` | `backend/tests/ai-provider.test.js` |
| 2 | OCR and safe identifier masking | `implemented` | `backend/services/imagePrivacyService.js`; `backend/models/ImageAnalysis.js` | `backend/tests/ai-matching.test.js` |
| 3 | Image-to-image similarity | `provider-dependent` | `backend/services/imageComparisonService.js`; `backend/services/aiMatchingService.js`; `backend/services/matchScoringService.js` | `backend/tests/image-comparison.test.js`; `backend/tests/ai-matching.test.js`; live vision-provider acceptance pending |
| 4 | Semantic multilingual matching | `implemented` | `backend/services/chatSearchService.js`; `backend/services/matchScoringService.js` | `backend/tests/chat-search.test.js`; `backend/tests/ai-matching.test.js` |
| 5 | Location intelligence | `field-data-dependent` | `backend/services/locationIntelligenceService.js`; `backend/models/LocationKnowledge.js` | `backend/tests/location-governance.test.js` |
| 6 | Date/time reasoning | `implemented` | `backend/services/matchScoringService.js` | `backend/tests/ai-matching.test.js` |
| 7 | Duplicate-report detection | `implemented` | `backend/services/reportIntelligenceService.js` | `backend/tests/report-intelligence.test.js` |
| 8 | Conversational report creation | `implemented` | `backend/services/conversationalReportService.js`; `backend/controllers/aiChatController.js`; `frontend/src/components/common/AIChatbot.jsx`; `frontend/src/components/common/ReportItemWizard.jsx` | `backend/tests/conversational-report.test.js`; `frontend/tests/ai-chat.test.mjs` |
| 9 | Voice input | `provider-dependent` | `frontend/src/components/common/AIChatbot.jsx` | `frontend/tests/ai-chat.test.mjs`; browser speech-recognition UAT remains required |
| 10 | Natural-language search | `implemented` | `backend/services/chatSearchService.js`; `frontend/src/pages/public/SearchItems.jsx` | `backend/tests/chat-search.test.js`; `frontend/tests/search-ui.test.mjs` |
| 11 | Explainable matching | `implemented` | `backend/services/matchScoringService.js`; `frontend/src/components/common/MatchExplanation.jsx` | `backend/tests/ai-matching.test.js` |
| 12 | Confidence calibration | `field-data-dependent` | `backend/services/matchScoringService.js` | `backend/tests/ai-matching.test.js`; meaningful statistical calibration requires sufficient verified historical outcomes |
| 13 | Smart ownership questions | `implemented` | `backend/services/claimVerificationService.js` | `backend/tests/claim-verification.test.js` |
| 14 | Evidence-quality checks | `implemented` | `backend/services/claimVerificationService.js` | `backend/tests/claim-verification.test.js` |
| 15 | Fraud/abuse review flags | `implemented` | `backend/services/claimRiskService.js` | `backend/tests/claim-risk.test.js` |
| 16 | Image moderation | `provider-dependent` | `backend/services/imageAnalysisService.js` | `frontend/tests/image-redaction.test.mjs`; live provider moderation tests pending |
| 17 | Privacy redaction | `implemented` | `backend/services/imagePrivacyService.js`; `frontend/src/utils/imageRedaction.js`; `frontend/src/components/common/ImagePrivacyReview.jsx`; `frontend/src/components/common/ReportItemWizard.jsx` | `frontend/tests/image-redaction.test.mjs`; `backend/tests/ai-matching.test.js`; live provider/storage acceptance remains a target-environment gate |
| 18 | Category/icon intelligence | `provider-dependent` | `backend/services/imageAnalysisService.js`; `backend/controllers/categoryController.js`; `frontend/src/components/common/ReportItemWizard.jsx` | `frontend/tests/full-plan-acceptance.test.mjs`; provider and admin workflow UAT |
| 19 | Report-quality scoring | `implemented` | `backend/services/reportQualityService.js`; `frontend/src/components/common/ReportItemWizard.jsx` | `backend/tests/report-intelligence.test.js`; `frontend/tests/ai-governance.test.mjs` |
| 20 | Missing-information assistance | `implemented` | `backend/services/reportQualityService.js`; `backend/services/claimVerificationService.js` | `backend/tests/report-intelligence.test.js` |
| 21 | Translation/normalisation | `implemented` | `backend/services/chatSearchService.js`; `frontend/src/i18n` | `backend/tests/chat-search.test.js`; `frontend/tests/i18n.test.mjs` |
| 22 | Admin AI triage | `implemented` | `backend/controllers/adminController.js`; `frontend/src/pages/admin/AdminDashboard.jsx` | `backend/tests/dashboard-source.test.js`; `frontend/tests/dashboard.test.mjs` |
| 23 | Daily operational summaries | `implemented` | `backend/services/operationalIntelligenceService.js`; `backend/controllers/adminController.js`; `frontend/src/pages/admin/Analytics.jsx` | `backend/tests/operational-intelligence.test.js`; `frontend/tests/dashboard.test.mjs` |
| 24 | Recovery analytics | `implemented` | `backend/services/operationalIntelligenceService.js`; `backend/controllers/adminController.js`; `frontend/src/pages/admin/Analytics.jsx` | `backend/tests/operational-intelligence.test.js`; `frontend/tests/dashboard.test.mjs` |
| 25 | Predictive recommendations | `field-data-dependent` | `backend/services/operationalIntelligenceService.js`; `backend/controllers/adminController.js`; `frontend/src/pages/admin/Analytics.jsx` | `backend/tests/operational-intelligence.test.js`; `frontend/tests/dashboard.test.mjs`; meaningful calibration requires sufficient verified outcomes and university governance |
| 26 | Smart notifications | `implemented` | `backend/services/notificationService.js`; `backend/services/emailService.js` | `backend/tests/notification-preferences.test.js`; `frontend/tests/notification-preferences.test.mjs`; live email/push delivery pending |
| 27 | Feedback-based improvement | `implemented` | `backend/models/AIDecisionFeedback.js`; `backend/controllers/aiFeedbackController.js`; `frontend/src/pages/admin/AIFeedbackReview.jsx` | `backend/tests/report-intelligence.test.js`; `frontend/tests/ai-governance.test.mjs` |
| 28 | Provider failover | `implemented` | `backend/services/aiProviderService.js` | `backend/tests/ai-provider.test.js`; live provider test pending |
| 29 | AI monitoring | `implemented` | `backend/services/aiProviderService.js`; `frontend/src/pages/admin/AdminDashboard.jsx` | `backend/tests/ai-provider.test.js` |
| 30 | AI governance/safety controls | `implemented` | `backend/utils/serializers.js`; `backend/services/claimRiskService.js`; `backend/models/AIDecisionFeedback.js`; `backend/services/aiProviderService.js` | `backend/tests/security.test.js`; `backend/tests/claim-risk.test.js`; `backend/tests/report-intelligence.test.js`; `frontend/tests/ai-governance.test.mjs` |
| 31 | SEUSL regional micro-location intelligence | `field-data-dependent` | `backend/data/seuslLocations.js`; `backend/models/LocationKnowledge.js`; `backend/controllers/locationKnowledgeController.js` | `backend/tests/location-governance.test.js`; field/university approval pending |
