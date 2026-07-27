import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(frontend, relative), 'utf8');

test('report creation uses a review-first four-step workflow with recoverable drafts', () => {
  const wizard = read('src/components/common/ReportItemWizard.jsx');
  assert.match(wizard, /report\.stepPhoto/);
  assert.match(wizard, /report\.stepDetails/);
  assert.match(wizard, /report\.stepLocation/);
  assert.match(wizard, /report\.stepPrivacy/);
  assert.match(wizard, /localStorage\.setItem/);
  assert.match(wizard, /role="alert"/);
  assert.match(wizard, /AISuggestionReview/);
  assert.match(wizard, /LocationAssistant/);
  assert.doesNotMatch(wizard, /Fields auto-filled by AI!/);
  assert.doesNotMatch(wizard, /setInterval[\s\S]{0,200}100/);
});


test('create and edit reports share the same guided workflow and preserve existing images', () => {
  const wizard = read('src/components/common/ReportItemWizard.jsx');
  const editLost = read('src/pages/user/EditLostItem.jsx');
  const editFound = read('src/pages/user/EditFoundItem.jsx');
  assert.match(editLost, /ReportItemWizard mode="lost" itemId=\{id\}/);
  assert.match(editFound, /ReportItemWizard mode="found" itemId=\{id\}/);
  assert.match(wizard, /existingImages/);
  assert.match(wizard, /deletedImages/);
  assert.match(wizard, /updateLostReport/);
  assert.match(wizard, /updateFoundReport/);
  assert.match(wizard, /report\.saveChanges/);
});

test('AI suggestions remain individually reviewable and disclose privacy findings', () => {
  const review = read('src/components/common/AISuggestionReview.jsx');
  assert.match(review, /report\.applyAll/);
  assert.match(review, /onApplyField/);
  assert.match(review, /privacy/i);
  assert.match(review, /confidence/i);
});


test('claim workflow is a secure five-step review flow with correct private-image handling', () => {
  const claim = read('src/components/common/ClaimModal.jsx');
  assert.match(claim, /claim\.stepConfirm/);
  assert.match(claim, /claim\.stepOwnership/);
  assert.match(claim, /claim\.stepEvidence/);
  assert.match(claim, /claim\.stepVerification/);
  assert.match(claim, /claim\.stepReview/);
  assert.match(claim, /verificationAnswers/);
  assert.match(claim, /proofImages', image/);
  assert.match(claim, /onChange=\{setImages\}/);
  assert.match(claim, /claim\.humanDecisionDesc/);
  assert.doesNotMatch(claim, /image\.file/);
  assert.doesNotMatch(claim, /setImages=\{setImages\}/);
});

test('matching UI explains evidence and states that similarity is not proof', () => {
  const explanation = read('src/components/common/MatchExplanation.jsx');
  assert.match(explanation, /dimensionScores/);
  assert.match(explanation, /match\.ownershipNotice/);
  assert.match(explanation, /match\.whySuggested/);
});

test('modal and select use native semantics with keyboard focus management', () => {
  const modal = read('src/components/common/Modal.jsx');
  const select = read('src/components/common/Select.jsx');
  assert.match(modal, /role="dialog"/);
  assert.match(modal, /aria-modal="true"/);
  assert.match(modal, /event\.key === 'Escape'/);
  assert.match(modal, /previousFocusRef/);
  assert.match(modal, /event\.key !== 'Tab'/);
  assert.match(select, /<select/);
  assert.doesNotMatch(select, /role="listbox"/);
  assert.match(select, /aria-invalid/);
});

test('global UI exposes readable typography, skip navigation and reduced motion', () => {
  const css = [read('src/index.css'), read('src/styles/accessibility.css')].join('\n');
  const app = read('src/App.jsx');
  assert.match(css, /font-size:\s*16px/);
  assert.doesNotMatch(css, /font-size:\s*13\.8px/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /\.skip-link/);
  assert.match(app, /nav\.skip/);
});

test('mobile navigation is task-first and avoids assistant collisions', () => {
  const nav = read('src/components/layout/MobileBottomNav.jsx');
  const chatbot = read('src/components/common/AIChatbot.jsx');
  const scroll = read('src/components/common/ScrollToTopButton.jsx');
  assert.match(nav, /common\.report/);
  assert.match(nav, /nav\.lostAction/);
  assert.match(nav, /nav\.foundAction/);
  assert.match(nav, /assistantOpen/);
  assert.match(chatbot, /lf:assistant-state/);
  assert.match(scroll, /assistantOpen/);
  assert.match(scroll, /mobile-bottom-nav-height/);
});
