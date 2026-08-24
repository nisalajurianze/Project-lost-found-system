# Exhaustive Application-Code Checklist — ecf54c1

Every row stays unchecked until the file has been read fully line-by-line and reviewed for repository-relevant vulnerabilities. Tests, docs, generated outputs, dependency trees, and static build artifacts are excluded by the runtime inventory.

## Initial recon annotations

Search hits are review priority markers, not findings or completed reviews.

| Checklist file | Recon families |
|---|---|
| `backend/config/redis.js` | filesystem |
| `backend/config/socket.js` | crypto-token |
| `backend/controllers/adminController.js` | nosql-query, authorization |
| `backend/controllers/aiChatController.js` | nosql-query, authorization |
| `backend/controllers/aiController.js` | upload-parser, authorization |
| `backend/controllers/aiFeedbackController.js` | nosql-query, authorization |
| `backend/controllers/authController.js` | crypto-token, authorization |
| `backend/controllers/categoryController.js` | nosql-query |
| `backend/controllers/claimController.js` | nosql-query, authorization |
| `backend/controllers/feedbackController.js` | nosql-query, authorization |
| `backend/controllers/foundItemController.js` | nosql-query, authorization |
| `backend/controllers/locationKnowledgeController.js` | nosql-query, authorization |
| `backend/controllers/lostItemController.js` | nosql-query, authorization |
| `backend/controllers/matchController.js` | nosql-query, authorization |
| `backend/controllers/notificationController.js` | network, nosql-query, authorization |
| `backend/controllers/systemSettingController.js` | nosql-query |
| `backend/controllers/userController.js` | authorization |
| `backend/eslint.config.js` | network |
| `backend/jobs/reminderJob.js` | authorization |
| `backend/middlewares/authMiddleware.js` | crypto-token, authorization |
| `backend/middlewares/csrfMiddleware.js` | crypto-token |
| `backend/middlewares/rateLimitMiddleware.js` | code-exec |
| `backend/middlewares/roleMiddleware.js` | code-exec, authorization |
| `backend/middlewares/uploadMiddleware.js` | upload-parser |
| `backend/models/JobLock.js` | authorization |
| `backend/models/User.js` | crypto-token |
| `backend/routes/adminRoutes.js` | authorization |
| `backend/routes/aiFeedbackRoutes.js` | authorization |
| `backend/routes/authRoutes.js` | crypto-token |
| `backend/routes/categoryRoutes.js` | authorization |
| `backend/routes/claimRoutes.js` | authorization |
| `backend/routes/feedbackRoutes.js` | authorization |
| `backend/routes/locationKnowledgeRoutes.js` | authorization |
| `backend/routes/systemSettingRoutes.js` | authorization |
| `backend/scripts/bootstrapAdmin.js` | authorization |
| `backend/scripts/checkSyntax.mjs` | code-exec, filesystem |
| `backend/scripts/migrateProduction.js` | crypto-token |
| `backend/server.js` | crypto-token |
| `backend/services/aiProviderService.js` | network |
| `backend/services/claimVerificationService.js` | authorization |
| `backend/services/cloudinaryService.js` | upload-parser |
| `backend/services/emailService.js` | network, crypto-token, authorization |
| `backend/services/imageComparisonService.js` | network, authorization |
| `backend/services/itemWorkflowService.js` | authorization |
| `backend/services/jobLockService.js` | authorization |
| `backend/services/matchScoringService.js` | authorization |
| `backend/services/sessionService.js` | crypto-token, authorization |
| `backend/tests/ai-matching.test.js` | authorization |
| `backend/tests/ai-provider.test.js` | network |
| `backend/tests/claim-risk.test.js` | network, filesystem |
| `backend/tests/claim-verification.test.js` | authorization |
| `backend/tests/dashboard-source.test.js` | filesystem |
| `backend/tests/database.integration.test.js` | crypto-token |
| `backend/tests/deployment-config.test.js` | network, filesystem |
| `backend/tests/image-comparison.test.js` | network, filesystem |
| `backend/tests/location-governance.test.js` | network, filesystem, authorization |
| `backend/tests/operational-intelligence.test.js` | network, filesystem |
| `backend/tests/report-intelligence.test.js` | network, filesystem |
| `backend/tests/security.test.js` | authorization |
| `backend/tests/static-security.test.js` | code-exec, filesystem, crypto-token, authorization |
| `backend/utils/apiError.js` | authorization |
| `backend/utils/asyncHandler.js` | code-exec |
| `backend/utils/cookies.js` | crypto-token |
| `backend/utils/pagination.js` | nosql-query |
| `backend/utils/security.js` | crypto-token |
| `backend/utils/serializers.js` | authorization |
| `backend/utils/validators.js` | authorization |
| `frontend/public/sw.js` | network |
| `frontend/src/components/cards/ClaimCard.jsx` | authorization |
| `frontend/src/components/cards/MatchCard.jsx` | authorization |
| `frontend/src/components/common/AIChatbot.jsx` | authorization |
| `frontend/src/components/common/ClaimModal.jsx` | authorization |
| `frontend/src/components/common/ItemEvidenceSummary.jsx` | authorization |
| `frontend/src/components/common/MatchExplanation.jsx` | authorization |
| `frontend/src/i18n/adminEvidenceTranslations.js` | authorization |
| `frontend/src/i18n/recoveryTranslations.js` | authorization |
| `frontend/src/i18n/translations.js` | authorization |
| `frontend/src/pages/admin/ManageClaims.jsx` | authorization |
| `frontend/src/pages/public/Contact.jsx` | network |
| `frontend/src/pages/public/FoundItemDetail.jsx` | authorization |
| `frontend/src/pages/public/Home.jsx` | network |
| `frontend/src/pages/public/LostItemDetail.jsx` | authorization |
| `frontend/src/pages/public/ResetPassword.jsx` | browser-html-url |
| `frontend/src/pages/public/VerifyEmail.jsx` | browser-html-url |
| `frontend/src/pages/user/MyClaims.jsx` | authorization |
| `frontend/src/redux/slices/claimSlice.js` | authorization |
| `frontend/src/services/api.js` | network, crypto-token |
| `frontend/src/services/claimService.js` | authorization |
| `frontend/src/utils/assistantHistory.js` | crypto-token |
| `frontend/src/utils/constants.js` | browser-html-url |
| `frontend/src/utils/internalNavigation.js` | network |
| `frontend/src/utils/lazyWithRetry.js` | code-exec, network, browser-html-url |

- [x] `backend\config\cloudinary.js`
- [x] `backend\config\db.js`
- [x] `backend\config\redis.js`
- [x] `backend\config\security.js`
- [x] `backend\config\socket.js`
- [x] `backend\data\seuslLocations.js`
- [x] `backend\controllers\adminController.js`
- [x] `backend\controllers\aiChatController.js`
- [x] `backend\controllers\aiController.js`
- [x] `backend\controllers\aiFeedbackController.js`
- [x] `backend\controllers\authController.js`
- [x] `backend\controllers\categoryController.js`
- [x] `backend\controllers\claimController.js`
- [x] `backend\controllers\feedbackController.js`
- [x] `backend\controllers\foundItemController.js`
- [x] `backend\controllers\locationKnowledgeController.js`
- [x] `backend\controllers\lostItemController.js`
- [x] `backend\controllers\matchController.js`
- [x] `backend\controllers\notificationController.js`
- [x] `backend\controllers\statsController.js`
- [x] `backend\controllers\systemSettingController.js`
- [x] `backend\controllers\userController.js`
- [x] `backend\cron\autoCleanCron.js`
- [x] `backend\jobs\cleanupJob.js`
- [x] `backend\jobs\reminderJob.js`
- [x] `backend\middlewares\authMiddleware.js`
- [x] `backend\middlewares\cacheMiddleware.js`
- [x] `backend\middlewares\csrfMiddleware.js`
- [x] `backend\middlewares\errorMiddleware.js`
- [x] `backend\middlewares\rateLimitMiddleware.js`
- [x] `backend\middlewares\roleMiddleware.js`
- [x] `backend\middlewares\sanitizeMiddleware.js`
- [x] `backend\middlewares\uploadMiddleware.js`
- [x] `backend\middlewares\validateMiddleware.js`
- [x] `backend\models\AdminLog.js`
- [x] `backend\models\AIDecisionFeedback.js`
- [x] `backend\models\Category.js`
- [x] `backend\models\ClaimRequest.js`
- [x] `backend\models\Feedback.js`
- [x] `backend\models\FoundItem.js`
- [x] `backend\models\ImageAnalysis.js`
- [x] `backend\models\JobLock.js`
- [x] `backend\models\LocationKnowledge.js`
- [x] `backend\models\LostItem.js`
- [x] `backend\models\Match.js`
- [x] `backend\models\Notification.js`
- [x] `backend\models\OutboxEvent.js`
- [x] `backend\models\RefreshSession.js`
- [x] `backend\models\SystemSetting.js`
- [x] `backend\models\User.js`
- [x] `backend\routes\adminRoutes.js`
- [x] `backend\routes\aiFeedbackRoutes.js`
- [x] `backend\routes\aiRoutes.js`
- [x] `backend\routes\authRoutes.js`
- [x] `backend\routes\categoryRoutes.js`
- [x] `backend\routes\claimRoutes.js`
- [x] `backend\routes\feedbackRoutes.js`
- [x] `backend\routes\foundItemRoutes.js`
- [x] `backend\routes\locationKnowledgeRoutes.js`
- [x] `backend\routes\lostItemRoutes.js`
- [x] `backend\routes\matchRoutes.js`
- [x] `backend\routes\notificationRoutes.js`
- [x] `backend\routes\statsRoutes.js`
- [x] `backend\routes\systemSettingRoutes.js`
- [x] `backend\routes\userRoutes.js`
- [x] `backend\scripts\bootstrapAdmin.js`
- [x] `backend\scripts\migrateProduction.js`
- [x] `backend\server.js`
- [x] `backend\services\accountService.js`
- [x] `backend\services\aiMatchingService.js`
- [x] `backend\services\aiProviderService.js`
- [x] `backend\services\chatSearchService.js`
- [x] `backend\services\claimRiskPolicy.js`
- [x] `backend\services\claimRiskService.js`
- [x] `backend\services\claimVerificationService.js`
- [x] `backend\services\cloudinaryService.js`
- [x] `backend\services\conversationalReportService.js`
- [x] `backend\services\emailService.js`
- [x] `backend\services\imageAnalysisService.js`
- [x] `backend\services\imageComparisonService.js`
- [x] `backend\services\imagePrivacyService.js`
- [x] `backend\services\itemProcessingService.js`
- [x] `backend\services\itemWorkflowService.js`
- [x] `backend\services\jobLockService.js`
- [x] `backend\services\locationIntelligenceService.js`
- [x] `backend\services\locationKnowledgeBootstrapService.js`
- [x] `backend\services\matchScoringService.js`
- [x] `backend\services\notificationPreferenceService.js`
- [x] `backend\services\notificationService.js`
- [x] `backend\services\operationalIntelligenceService.js`
- [x] `backend\services\outboxService.js`
- [x] `backend\services\reportIntelligenceService.js`
- [x] `backend\services\reportQualityService.js`
- [x] `backend\services\sessionService.js`
- [x] `backend\services\workflowEmailService.js`
- [x] `backend\utils\apiError.js`
- [x] `backend\utils\apiResponse.js`
- [x] `backend\utils\asyncHandler.js`
- [x] `backend\utils\cookies.js`
- [x] `backend\utils\pagination.js`
- [x] `backend\utils\security.js`
- [x] `backend\utils\serializers.js`
- [x] `backend\utils\validators.js`
- [x] `frontend/public\sw.js`
- [x] `frontend/src\App.jsx`
- [ ] `frontend/src\components\admin\AdminReportModeration.jsx`
- [x] `frontend/src\components\cards\ClaimCard.jsx`
- [x] `frontend/src\components\cards\ItemCard.jsx`
- [x] `frontend/src\components\cards\MatchCard.jsx`
- [x] `frontend/src\components\cards\NotificationCard.jsx`
- [ ] `frontend/src\components\cards\StatCard.jsx`
- [ ] `frontend/src\components\charts\DashboardChart.jsx`
- [ ] `frontend/src\components\charts\MonthlyReportsChart.jsx`
- [ ] `frontend/src\components\charts\StatusPieChart.jsx`
- [ ] `frontend/src\components\common\AccessibilityPreferences.jsx`
- [x] `frontend/src\components\common\AIChatbot.jsx`
- [ ] `frontend/src\components\common\AILoadingToast.jsx`
- [x] `frontend/src\components\common\AISuggestionReview.jsx`
- [x] `frontend/src\components\common\Button.jsx`
- [x] `frontend/src\components\common\ClaimModal.jsx`
- [x] `frontend/src\components\common\ConfirmDialog.jsx`
- [ ] `frontend/src\components\common\CreatableCategorySelect.jsx`
- [ ] `frontend/src\components\common\EmptyState.jsx`
- [x] `frontend/src\components\common\FeedbackModal.jsx`
- [x] `frontend/src\components\common\ImagePrivacyReview.jsx`
- [x] `frontend/src\components\common\ImageUpload.jsx`
- [x] `frontend/src\components\common\Input.jsx`
- [ ] `frontend/src\components\common\ItemAttributeFields.jsx`
- [x] `frontend/src\components\common\ItemEvidenceSummary.jsx`
- [ ] `frontend/src\components\common\LanguageSwitcher.jsx`
- [ ] `frontend/src\components\common\Loader.jsx`
- [ ] `frontend/src\components\common\LocationAssistant.jsx`
- [x] `frontend/src\components\common\MatchExplanation.jsx`
- [x] `frontend/src\components\common\Modal.jsx`
- [x] `frontend/src\components\common\Pagination.jsx`
- [x] `frontend/src\components\common\ReportItemWizard.jsx`
- [ ] `frontend/src\components\common\ScrollToTopButton.jsx`
- [x] `frontend/src\components\common\SearchFilter.jsx`
- [x] `frontend/src\components\common\Select.jsx`
- [ ] `frontend/src\components\common\SpaceBackground.jsx`
- [ ] `frontend/src\components\common\StatusBadge.jsx`
- [x] `frontend/src\components\common\Textarea.jsx`
- [x] `frontend/src\components\common\WorkflowTimeline.jsx`
- [ ] `frontend/src\components\layout\AdminLayout.jsx`
- [ ] `frontend/src\components\layout\DashboardLayout.jsx`
- [ ] `frontend/src\components\layout\Footer.jsx`
- [ ] `frontend/src\components\layout\MobileBottomNav.jsx`
- [x] `frontend/src\components\layout\Navbar.jsx`
- [ ] `frontend/src\components\layout\PublicLayout.jsx`
- [ ] `frontend/src\components\layout\Sidebar.jsx`
- [ ] `frontend/src\components\modals\NotificationPreferencesModal.jsx`
- [ ] `frontend/src\components\modals\ProfileCompletionModal.jsx`
- [x] `frontend/src\hooks\useAuth.js`
- [x] `frontend/src\hooks\useDebounce.js`
- [x] `frontend/src\hooks\useSocket.js`
- [ ] `frontend/src\i18n\adminEvidenceTranslations.js`
- [ ] `frontend/src\i18n\adminManagementTranslations.js`
- [ ] `frontend/src\i18n\imageProcessingTranslations.js`
- [ ] `frontend/src\i18n\LanguageContext.jsx`
- [ ] `frontend/src\i18n\realtimeNotificationTranslations.js`
- [ ] `frontend/src\i18n\recoveryTranslations.js`
- [ ] `frontend/src\i18n\translations.js`
- [ ] `frontend/src\i18n\uiResidualTranslations.js`
- [x] `frontend/src\main.jsx`
- [ ] `frontend/src\pages\admin\AdminDashboard.jsx`
- [ ] `frontend/src\pages\admin\AdminLogs.jsx`
- [ ] `frontend/src\pages\admin\AIFeedbackReview.jsx`
- [ ] `frontend/src\pages\admin\Analytics.jsx`
- [ ] `frontend/src\pages\admin\Feedback.jsx`
- [ ] `frontend/src\pages\admin\LocationKnowledge.jsx`
- [ ] `frontend/src\pages\admin\ManageCategories.jsx`
- [ ] `frontend/src\pages\admin\ManageClaims.jsx`
- [ ] `frontend/src\pages\admin\ManageFoundItems.jsx`
- [ ] `frontend/src\pages\admin\ManageLostItems.jsx`
- [ ] `frontend/src\pages\admin\ManageMatches.jsx`
- [ ] `frontend/src\pages\admin\ManageUsers.jsx`
- [ ] `frontend/src\pages\admin\SiteSettings.jsx`
- [ ] `frontend/src\pages\protected\VerifyResolution.jsx`
- [ ] `frontend/src\pages\public\About.jsx`
- [ ] `frontend/src\pages\public\Contact.jsx`
- [ ] `frontend/src\pages\public\ForgotPassword.jsx`
- [x] `frontend/src\pages\public\FoundItemDetail.jsx`
- [x] `frontend/src\pages\public\FoundItems.jsx`
- [ ] `frontend/src\pages\public\Home.jsx`
- [x] `frontend/src\pages\public\Login.jsx`
- [x] `frontend/src\pages\public\LostItemDetail.jsx`
- [x] `frontend/src\pages\public\LostItems.jsx`
- [ ] `frontend/src\pages\public\Register.jsx`
- [ ] `frontend/src\pages\public\ResetPassword.jsx`
- [x] `frontend/src\pages\public\SearchItems.jsx`
- [ ] `frontend/src\pages\public\VerifyEmail.jsx`
- [ ] `frontend/src\pages\user\Dashboard.jsx`
- [ ] `frontend/src\pages\user\EditFoundItem.jsx`
- [ ] `frontend/src\pages\user\EditLostItem.jsx`
- [ ] `frontend/src\pages\user\MyClaims.jsx`
- [ ] `frontend/src\pages\user\MyFoundItems.jsx`
- [ ] `frontend/src\pages\user\MyLostItems.jsx`
- [ ] `frontend/src\pages\user\MyMatches.jsx`
- [ ] `frontend/src\pages\user\Notifications.jsx`
- [ ] `frontend/src\pages\user\Profile.jsx`
- [ ] `frontend/src\pages\user\ReportFound.jsx`
- [ ] `frontend/src\pages\user\ReportLost.jsx`
- [x] `frontend/src\redux\slices\adminSlice.js`
- [x] `frontend/src\redux\slices\authSlice.js`
- [x] `frontend/src\redux\slices\categorySlice.js`
- [x] `frontend/src\redux\slices\claimSlice.js`
- [x] `frontend/src\redux\slices\foundItemSlice.js`
- [x] `frontend/src\redux\slices\lostItemSlice.js`
- [ ] `frontend/src\redux\slices\matchSlice.js`
- [ ] `frontend/src\redux\slices\notificationSlice.js`
- [ ] `frontend/src\redux\slices\themeSlice.js`
- [x] `frontend/src\redux\store.js`
- [x] `frontend/src\routes\AdminRoute.jsx`
- [x] `frontend/src\routes\ProtectedRoute.jsx`
- [x] `frontend/src\services\adminService.js`
- [x] `frontend/src\services\aiFeedbackService.js`
- [x] `frontend/src\services\aiService.js`
- [x] `frontend/src\services\api.js`
- [x] `frontend/src\services\authService.js`
- [x] `frontend/src\services\categoryService.js`
- [x] `frontend/src\services\claimService.js`
- [ ] `frontend/src\services\feedbackService.js`
- [ ] `frontend/src\services\foundItemService.js`
- [ ] `frontend/src\services\locationKnowledgeService.js`
- [ ] `frontend/src\services\lostItemService.js`
- [ ] `frontend/src\services\matchService.js`
- [ ] `frontend/src\services\notificationService.js`
- [ ] `frontend/src\services\settingService.js`
- [x] `frontend/src\services\socketService.js`
- [ ] `frontend/src\services\statsService.js`
- [x] `frontend/src\utils\accessibilityPreferences.js`
- [x] `frontend/src\utils\assistantHistory.js`
- [x] `frontend/src\utils\constants.js`
- [x] `frontend/src\utils\formatDate.js`
- [x] `frontend/src\utils\helpers.js`
- [x] `frontend/src\utils\imageRedaction.js`
- [x] `frontend/src\utils\imageTransform.js`
- [x] `frontend/src\utils\internalNavigation.js`
- [x] `frontend/src\utils\lazyWithRetry.js`
- [x] `frontend/src\utils\pushNotifications.js`
- [x] `frontend/src\utils\savedSearches.js`
- [ ] `frontend/src\utils\validators.js`

## Reviewed privileged surfaces outside the application-code checklist

The deployment/CI pass fully read and reviewed `docker-compose.yml`, `backend/Dockerfile`, `frontend/vercel.json`, `.github/workflows/ci.yml`, and `.github/workflows/deploy.yml`. Root `Dockerfile`, `railway.json`, and `vercel.json` are absent. These build and deployment controls are recorded in `finding-discovery.md`; they are not application-code checklist rows and therefore are not marked `[x]` here.

The second privileged-surface pass fully read and reviewed `.github/workflows/security.yml`, `.dockerignore`, `frontend/Dockerfile`, `frontend/nginx.conf`, and `backend/.dockerignore`. `backend/railway.json` is absent. Results and deferred supporting-file checks are recorded in `finding-discovery.md`; no application-code checklist state was changed for this pass.
