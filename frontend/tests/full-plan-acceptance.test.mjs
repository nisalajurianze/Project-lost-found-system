import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(frontend, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('original assistant, image recognition, category intelligence and review-first auto-fill remain present', () => {
  const assistant = read('frontend/src/components/common/AIChatbot.jsx');
  const imageAnalysis = read('backend/services/imageAnalysisService.js');
  const aiController = read('backend/controllers/aiController.js');
  const wizard = read('frontend/src/components/common/ReportItemWizard.jsx');
  const review = read('frontend/src/components/common/AISuggestionReview.jsx');
  assert.match(assistant, /api\.post\('\/ai\/chat'/);
  assert.match(imageAnalysis, /suggestDetailsFromImage/);
  assert.match(imageAnalysis, /generateCategoryDetails/);
  assert.match(imageAnalysis, /categoryIcon/);
  assert.match(wizard, /ensureCategory/);
  assert.match(wizard, /AISuggestionReview/);
  assert.match(review, /onApplyField/);
  assert.match(review, /onDismiss/);
  assert.match(aiController, /Enter the item details manually/);
  assert.match(assistant, /assistant\.openSearch/);
});

test('AI governance stays advisory, privacy-safe and admin-approved-dataset-only', () => {
  const risk = read('backend/services/claimRiskService.js');
  const feedback = read('backend/models/AIDecisionFeedback.js');
  const feedbackController = read('backend/controllers/aiFeedbackController.js');
  const imageAnalysis = read('backend/services/imageAnalysisService.js');
  const notice = read('docs/public/AI_TRANSPARENCY_NOTICE.md');
  assert.doesNotMatch(risk, /status\s*=\s*['"](?:approved|rejected|suspended|banned)/i);
  assert.match(feedback, /admin-approved-dataset-only/);
  assert.match(feedback, /pending.*approved.*rejected/s);
  assert.match(feedbackController, /reviewedBy/);
  assert.match(feedbackController, /reviewedAt/);
  assert.match(imageAnalysis, /Do not identify people or expose full personal identifiers/);
  assert.match(notice, /does not identify faces, infer sensitive personal traits/i);
  assert.match(notice, /not proof|not a probability/i);
});

test('assistant and match surfaces disclose ranking reasons, confidence and ownership limits', () => {
  const assistant = read('frontend/src/components/common/AIChatbot.jsx');
  const explanation = read('frontend/src/components/common/MatchExplanation.jsx');
  const evidence = read('frontend/src/components/common/ItemEvidenceSummary.jsx');
  const controller = read('backend/controllers/aiChatController.js');
  assert.match(assistant, /assistant\.whyAppeared/);
  assert.match(assistant, /message\.meta\.notice/);
  assert.match(explanation, /dimensionScores/);
  assert.match(explanation, /match\.ownershipNotice/);
  assert.match(evidence, /evidence\.advisory/);
  assert.match(controller, /not proof of ownership/);
});

test('report create and edit retain one four-step recoverable privacy-first workflow', () => {
  const wizard = read('frontend/src/components/common/ReportItemWizard.jsx');
  const editLost = read('frontend/src/pages/user/EditLostItem.jsx');
  const editFound = read('frontend/src/pages/user/EditFoundItem.jsx');
  const upload = read('frontend/src/components/common/ImageUpload.jsx');
  for (const key of ['stepPhoto', 'stepDetails', 'stepLocation', 'stepPrivacy']) assert.match(wizard, new RegExp(`report\\.${key}`));
  assert.match(editLost, /ReportItemWizard mode="lost"/);
  assert.match(editFound, /ReportItemWizard mode="found"/);
  assert.match(wizard, /localStorage\.setItem/);
  assert.match(wizard, /navigator\.onLine/);
  assert.match(wizard, /uploadProgress/);
  assert.match(wizard, /createPrivacySafeImage/);
  assert.match(wizard, /role="alert"/);
  assert.match(wizard, /report\.descriptionHelp/);
  assert.match(upload, /FiRotateCw|uploadRotating|rotationDegrees/);
  assert.match(upload, /FiCrop|uploadCropping|cropSquare/);
});

test('claim, match and handover paths keep evidence private until human-approved workflow access', () => {
  const claim = read('frontend/src/components/common/ClaimModal.jsx');
  const card = read('frontend/src/components/cards/ClaimCard.jsx');
  const timeline = read('frontend/src/components/common/WorkflowTimeline.jsx');
  const controller = read('backend/controllers/claimController.js');
  const validators = read('backend/utils/validators.js');
  const serializers = read('backend/utils/serializers.js');
  assert.match(claim, /claim\.humanDecisionDesc/);
  assert.match(claim, /proofImages/);
  assert.match(card, /WorkflowTimeline type="claim"/);
  assert.match(timeline, /key: 'handover'/);
  assert.match(controller, /claim\.status !== 'pending'/);
  assert.match(controller, /Only the reporter or an administrator can share contact access/);
  assert.match(validators, /Cancellation reason is required/);
  assert.match(serializers, /Private ownership evidence/);
  assert.match(serializers, /const maySeeContact = owner \|\| connected \|\| admin/);
  assert.doesNotMatch(serializers, /maySeeContact[^;]*publicContact/);
  assert.doesNotMatch(read('frontend/src/components/common/ReportItemWizard.jsx'), /value: 'public'/);
  assert.doesNotMatch(read('frontend/src/pages/public/FoundItemDetail.jsx'), /contactVisibility === 'public'/);
  assert.doesNotMatch(read('frontend/src/pages/public/LostItemDetail.jsx'), /contactVisibility === 'public'/);
});

test('motion, accessibility and mobile keyboard collision safeguards remain explicit', () => {
  const assistant = read('frontend/src/components/common/AIChatbot.jsx');
  const space = read('frontend/src/components/common/SpaceBackground.jsx');
  const app = read('frontend/src/App.jsx');
  const css = `${read('frontend/src/index.css')}\n${read('frontend/src/styles/accessibility.css')}`;
  assert.match(space, /prefers-reduced-motion/);
  assert.match(space, /visibilitychange/);
  assert.match(space, /aria-hidden="true"/);
  assert.match(assistant, /window\.visualViewport/);
  assert.match(assistant, /lf:assistant-state/);
  assert.match(css, /font-size:\s*16px/);
  assert.match(css, /Noto Sans Sinhala|Noto Sans Tamil/);
  assert.match(css, /\.skip-link/);
  assert.match(app, /nav\.skip/);
});

test('location intelligence retains multilingual aliases, sensitivity, provenance and governed corrections', () => {
  const data = read('backend/data/seuslLocations.js');
  const service = read('backend/services/locationIntelligenceService.js');
  const model = read('backend/models/LocationKnowledge.js');
  const controller = read('backend/controllers/locationKnowledgeController.js');
  const aiController = read('backend/controllers/aiController.js');
  assert.match(data, /names:/);
  assert.match(data, /aliases:/);
  assert.match(service, /compareLocations/);
  assert.match(model, /coordinates/);
  assert.match(model, /approximateZone/);
  assert.match(model, /verificationStatus/);
  assert.match(model, /sourceReference/);
  assert.match(model, /lastVerifiedAt/);
  assert.match(model, /history/);
  assert.match(controller, /approved-or-updated/);
  assert.match(aiController, /needsClarification/);
  assert.match(aiController, /Private residences and restricted places are returned only as approximate zones/);
});
