import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(frontend, relative), 'utf8');

test('item details separate owner evidence from AI advisory quality and show recovery timeline', () => {
  const lost = read('src/pages/public/LostItemDetail.jsx');
  const found = read('src/pages/public/FoundItemDetail.jsx');
  const evidence = read('src/components/common/ItemEvidenceSummary.jsx');
  assert.match(lost, /WorkflowTimeline type="item"/);
  assert.match(found, /WorkflowTimeline type="item"/);
  assert.match(lost, /ItemEvidenceSummary/);
  assert.match(found, /ItemEvidenceSummary/);
  assert.match(evidence, /Owner-provided characteristics|evidence\.owner/);
  assert.match(evidence, /Advisory only|evidence\.advisory/);
});

test('claim cards show human review and handover progress and mobile actions avoid bottom navigation', () => {
  const claim = read('src/components/cards/ClaimCard.jsx');
  const timeline = read('src/components/common/WorkflowTimeline.jsx');
  const css = [read('src/index.css'), read('src/styles/accessibility.css')].join('\n');
  assert.match(claim, /WorkflowTimeline type="claim"/);
  assert.match(timeline, /key: 'handover'/);
  assert.match(timeline, /workflow\.rejected/);
  assert.match(css, /mobile-sticky-claim/);
  assert.match(css, /--mobile-bottom-nav-height/);
});
