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

- [ ] `backend\config\cloudinary.js`
- [ ] `backend\config\db.js`
- [ ] `backend\config\redis.js`
- [x] `backend\config\security.js`
- [ ] `backend\config\socket.js`
- [ ] `backend\controllers\adminController.js`
- [ ] `backend\controllers\aiChatController.js`
- [ ] `backend\controllers\aiController.js`
- [ ] `backend\controllers\aiFeedbackController.js`
- [x] `backend\controllers\authController.js`
- [ ] `backend\controllers\categoryController.js`
- [x] `backend\controllers\claimController.js`
- [ ] `backend\controllers\feedbackController.js`
- [ ] `backend\controllers\foundItemController.js`
- [ ] `backend\controllers\locationKnowledgeController.js`
- [ ] `backend\controllers\lostItemController.js`
- [ ] `backend\controllers\matchController.js`
- [ ] `backend\controllers\notificationController.js`
- [ ] `backend\controllers\statsController.js`
- [ ] `backend\controllers\systemSettingController.js`
- [ ] `backend\controllers\userController.js`
- [ ] `backend\cron\autoCleanCron.js`
- [ ] `backend\jobs\cleanupJob.js`
- [ ] `backend\jobs\reminderJob.js`
- [x] `backend\middlewares\authMiddleware.js`
- [ ] `backend\middlewares\cacheMiddleware.js`
- [x] `backend\middlewares\csrfMiddleware.js`
- [ ] `backend\middlewares\errorMiddleware.js`
- [x] `backend\middlewares\rateLimitMiddleware.js`
- [ ] `backend\middlewares\roleMiddleware.js`
- [ ] `backend\middlewares\sanitizeMiddleware.js`
- [ ] `backend\middlewares\uploadMiddleware.js`
- [ ] `backend\middlewares\validateMiddleware.js`
- [ ] `backend\models\AdminLog.js`
- [ ] `backend\models\AIDecisionFeedback.js`
- [ ] `backend\models\Category.js`
- [ ] `backend\models\ClaimRequest.js`
- [ ] `backend\models\Feedback.js`
- [ ] `backend\models\FoundItem.js`
- [ ] `backend\models\ImageAnalysis.js`
- [ ] `backend\models\JobLock.js`
- [ ] `backend\models\LocationKnowledge.js`
- [ ] `backend\models\LostItem.js`
- [ ] `backend\models\Match.js`
- [ ] `backend\models\Notification.js`
- [ ] `backend\models\OutboxEvent.js`
- [ ] `backend\models\RefreshSession.js`
- [ ] `backend\models\SystemSetting.js`
- [x] `backend\models\User.js`
- [ ] `backend\routes\adminRoutes.js`
- [ ] `backend\routes\aiFeedbackRoutes.js`
- [ ] `backend\routes\aiRoutes.js`
- [x] `backend\routes\authRoutes.js`
- [ ] `backend\routes\categoryRoutes.js`
- [x] `backend\routes\claimRoutes.js`
- [ ] `backend\routes\feedbackRoutes.js`
- [ ] `backend\routes\foundItemRoutes.js`
- [ ] `backend\routes\locationKnowledgeRoutes.js`
- [ ] `backend\routes\lostItemRoutes.js`
- [ ] `backend\routes\matchRoutes.js`
- [ ] `backend\routes\notificationRoutes.js`
- [ ] `backend\routes\statsRoutes.js`
- [ ] `backend\routes\systemSettingRoutes.js`
- [ ] `backend\routes\userRoutes.js`
- [ ] `backend\scripts\bootstrapAdmin.js`
- [ ] `backend\scripts\migrateProduction.js`
- [x] `backend\server.js`
- [ ] `backend\services\accountService.js`
- [ ] `backend\services\aiMatchingService.js`
- [ ] `backend\services\aiProviderService.js`
- [ ] `backend\services\chatSearchService.js`
- [ ] `backend\services\claimRiskPolicy.js`
- [ ] `backend\services\claimRiskService.js`
- [ ] `backend\services\claimVerificationService.js`
- [ ] `backend\services\cloudinaryService.js`
- [ ] `backend\services\conversationalReportService.js`
- [ ] `backend\services\emailService.js`
- [ ] `backend\services\imageAnalysisService.js`
- [ ] `backend\services\imageComparisonService.js`
- [ ] `backend\services\imagePrivacyService.js`
- [ ] `backend\services\itemProcessingService.js`
- [ ] `backend\services\itemWorkflowService.js`
- [ ] `backend\services\jobLockService.js`
- [ ] `backend\services\locationIntelligenceService.js`
- [ ] `backend\services\locationKnowledgeBootstrapService.js`
- [ ] `backend\services\matchScoringService.js`
- [ ] `backend\services\notificationPreferenceService.js`
- [ ] `backend\services\notificationService.js`
- [ ] `backend\services\operationalIntelligenceService.js`
- [ ] `backend\services\outboxService.js`
- [ ] `backend\services\reportIntelligenceService.js`
- [ ] `backend\services\reportQualityService.js`
- [x] `backend\services\sessionService.js`
- [ ] `backend\services\workflowEmailService.js`
- [ ] `backend\utils\apiError.js`
- [ ] `backend\utils\apiResponse.js`
- [ ] `backend\utils\asyncHandler.js`
- [x] `backend\utils\cookies.js`
- [ ] `backend\utils\pagination.js`
- [ ] `backend\utils\security.js`
- [x] `backend\utils\serializers.js`
- [ ] `backend\utils\validators.js`
- [ ] `frontend/public\sw.js`
- [x] `frontend/src\App.jsx`
- [ ] `frontend/src\components\admin\AdminReportModeration.jsx`
- [ ] `frontend/src\components\cards\ClaimCard.jsx`
- [ ] `frontend/src\components\cards\ItemCard.jsx`
- [ ] `frontend/src\components\cards\MatchCard.jsx`
- [ ] `frontend/src\components\cards\NotificationCard.jsx`
- [ ] `frontend/src\components\cards\StatCard.jsx`
- [ ] `frontend/src\components\charts\DashboardChart.jsx`
- [ ] `frontend/src\components\charts\MonthlyReportsChart.jsx`
- [ ] `frontend/src\components\charts\StatusPieChart.jsx`
- [ ] `frontend/src\components\common\AccessibilityPreferences.jsx`
- [x] `frontend/src\components\common\AIChatbot.jsx`
- [ ] `frontend/src\components\common\AILoadingToast.jsx`
- [ ] `frontend/src\components\common\AISuggestionReview.jsx`
- [ ] `frontend/src\components\common\Button.jsx`
- [ ] `frontend/src\components\common\ClaimModal.jsx`
- [ ] `frontend/src\components\common\ConfirmDialog.jsx`
- [ ] `frontend/src\components\common\CreatableCategorySelect.jsx`
- [ ] `frontend/src\components\common\EmptyState.jsx`
- [ ] `frontend/src\components\common\FeedbackModal.jsx`
- [ ] `frontend/src\components\common\ImagePrivacyReview.jsx`
- [x] `frontend/src\components\common\ImageUpload.jsx`
- [ ] `frontend/src\components\common\Input.jsx`
- [ ] `frontend/src\components\common\ItemAttributeFields.jsx`
- [x] `frontend/src\components\common\ItemEvidenceSummary.jsx`
- [ ] `frontend/src\components\common\LanguageSwitcher.jsx`
- [ ] `frontend/src\components\common\Loader.jsx`
- [ ] `frontend/src\components\common\LocationAssistant.jsx`
- [x] `frontend/src\components\common\MatchExplanation.jsx`
- [ ] `frontend/src\components\common\Modal.jsx`
- [ ] `frontend/src\components\common\Pagination.jsx`
- [x] `frontend/src\components\common\ReportItemWizard.jsx`
- [ ] `frontend/src\components\common\ScrollToTopButton.jsx`
- [ ] `frontend/src\components\common\SearchFilter.jsx`
- [ ] `frontend/src\components\common\Select.jsx`
- [ ] `frontend/src\components\common\SpaceBackground.jsx`
- [ ] `frontend/src\components\common\StatusBadge.jsx`
- [ ] `frontend/src\components\common\Textarea.jsx`
- [ ] `frontend/src\components\common\WorkflowTimeline.jsx`
- [ ] `frontend/src\components\layout\AdminLayout.jsx`
- [ ] `frontend/src\components\layout\DashboardLayout.jsx`
- [ ] `frontend/src\components\layout\Footer.jsx`
- [ ] `frontend/src\components\layout\MobileBottomNav.jsx`
- [ ] `frontend/src\components\layout\Navbar.jsx`
- [ ] `frontend/src\components\layout\PublicLayout.jsx`
- [ ] `frontend/src\components\layout\Sidebar.jsx`
- [ ] `frontend/src\components\modals\NotificationPreferencesModal.jsx`
- [ ] `frontend/src\components\modals\ProfileCompletionModal.jsx`
- [ ] `frontend/src\hooks\useAuth.js`
- [ ] `frontend/src\hooks\useDebounce.js`
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
- [ ] `frontend/src\pages\public\FoundItemDetail.jsx`
- [ ] `frontend/src\pages\public\FoundItems.jsx`
- [ ] `frontend/src\pages\public\Home.jsx`
- [ ] `frontend/src\pages\public\Login.jsx`
- [ ] `frontend/src\pages\public\LostItemDetail.jsx`
- [ ] `frontend/src\pages\public\LostItems.jsx`
- [ ] `frontend/src\pages\public\Register.jsx`
- [ ] `frontend/src\pages\public\ResetPassword.jsx`
- [ ] `frontend/src\pages\public\SearchItems.jsx`
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
- [ ] `frontend/src\redux\slices\adminSlice.js`
- [x] `frontend/src\redux\slices\authSlice.js`
- [ ] `frontend/src\redux\slices\categorySlice.js`
- [ ] `frontend/src\redux\slices\claimSlice.js`
- [ ] `frontend/src\redux\slices\foundItemSlice.js`
- [ ] `frontend/src\redux\slices\lostItemSlice.js`
- [ ] `frontend/src\redux\slices\matchSlice.js`
- [ ] `frontend/src\redux\slices\notificationSlice.js`
- [ ] `frontend/src\redux\slices\themeSlice.js`
- [ ] `frontend/src\redux\store.js`
- [ ] `frontend/src\routes\AdminRoute.jsx`
- [ ] `frontend/src\routes\ProtectedRoute.jsx`
- [ ] `frontend/src\services\adminService.js`
- [ ] `frontend/src\services\aiFeedbackService.js`
- [ ] `frontend/src\services\aiService.js`
- [x] `frontend/src\services\api.js`
- [x] `frontend/src\services\authService.js`
- [ ] `frontend/src\services\categoryService.js`
- [ ] `frontend/src\services\claimService.js`
- [ ] `frontend/src\services\feedbackService.js`
- [ ] `frontend/src\services\foundItemService.js`
- [ ] `frontend/src\services\locationKnowledgeService.js`
- [ ] `frontend/src\services\lostItemService.js`
- [ ] `frontend/src\services\matchService.js`
- [ ] `frontend/src\services\notificationService.js`
- [ ] `frontend/src\services\settingService.js`
- [x] `frontend/src\services\socketService.js`
- [ ] `frontend/src\services\statsService.js`
- [ ] `frontend/src\utils\accessibilityPreferences.js`
- [ ] `frontend/src\utils\assistantHistory.js`
- [ ] `frontend/src\utils\constants.js`
- [ ] `frontend/src\utils\formatDate.js`
- [ ] `frontend/src\utils\helpers.js`
- [ ] `frontend/src\utils\imageRedaction.js`
- [ ] `frontend/src\utils\imageTransform.js`
- [x] `frontend/src\utils\internalNavigation.js`
- [ ] `frontend/src\utils\lazyWithRetry.js`
- [ ] `frontend/src\utils\pushNotifications.js`
- [ ] `frontend/src\utils\savedSearches.js`
- [ ] `frontend/src\utils\validators.js`

## Reviewed privileged surfaces outside the application-code checklist

The deployment/CI pass fully read and reviewed `docker-compose.yml`, `backend/Dockerfile`, `frontend/vercel.json`, `.github/workflows/ci.yml`, and `.github/workflows/deploy.yml`. Root `Dockerfile`, `railway.json`, and `vercel.json` are absent. These build and deployment controls are recorded in `finding-discovery.md`; they are not application-code checklist rows and therefore are not marked `[x]` here.
