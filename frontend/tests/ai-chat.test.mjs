import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(frontend, 'src/components/common/AIChatbot.jsx'), 'utf8');

test('assistant uses a mobile full-screen accessible dialog and desktop side panel', () => {
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /fixed inset-0/);
  assert.match(source, /sm:inset-y-4/);
  assert.doesNotMatch(source, /height:\s*['"]500px/);
  assert.doesNotMatch(source, /sm:w-\[400px\]/);
});

test('assistant exposes structured results, explanations and pagination', () => {
  assert.match(source, /AssistantResultCard/);
  assert.match(source, /assistant\.whyAppeared/);
  assert.match(source, /assistant\.showMore/);
  assert.match(source, /message\.meta\.notice/);
  assert.match(source, /item\.claimUrl/);
  assert.match(source, /detail\.thisMine/);
});

test('assistant supports live announcements, focus management and multilingual voice selection', () => {
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /event\.key === 'Escape'/);
  assert.match(source, /si-LK/);
  assert.match(source, /ta-LK/);
  assert.match(source, /min-h-11/);
});

test('assistant follows the mobile visual viewport when the on-screen keyboard opens', () => {
  assert.match(source, /window\.visualViewport/);
  assert.match(source, /viewport\?\.addEventListener\('resize', syncViewport\)/);
  assert.match(source, /offsetTop/);
  assert.match(source, /height: `\$\{mobileViewport\.height\}px`/);
});

test('assistant creates a reviewable report draft and hands it to the shared wizard', () => {
  const wizard = fs.readFileSync(path.join(frontend, 'src/components/common/ReportItemWizard.jsx'), 'utf8');
  assert.match(source, /ReportDraftCard/);
  assert.match(source, /lf-assistant-report-draft/);
  assert.match(source, /assistant\.humanReview/);
  assert.match(source, /assistant\.openDraft/);
  assert.match(wizard, /sessionStorage\.getItem\('lf-assistant-report-draft'\)/);
  assert.match(wizard, /assistantDraft\?\.reportType === mode/);
});
