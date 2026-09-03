import {
  expandKeywords,
  inferIntent,
  resolveConversationStyle,
} from '../services/chatSearchService.js';
import { buildConversationalReportDraft } from '../services/conversationalReportService.js';
import { inspectAIInput } from '../services/aiSafetyService.js';
import goldenCases from './goldenCases.js';

const evaluateCase = (entry) => {
  const failures = [];
  if (entry.capability === 'conversation') {
    const style = resolveConversationStyle(entry.input, entry.history || []);
    const intent = inferIntent(entry.input);
    if (style !== entry.expected.style) failures.push(`style expected ${entry.expected.style}, received ${style}`);
    if (intent !== entry.expected.intent) failures.push(`intent expected ${entry.expected.intent}, received ${intent}`);
  } else if (entry.capability === 'keywords') {
    const terms = expandKeywords(entry.input, 40);
    for (const term of entry.expectedTerms || []) if (!terms.includes(term)) failures.push(`missing term ${term}`);
  } else if (entry.capability === 'draft') {
    const draft = buildConversationalReportDraft({ message: entry.input, intent: entry.intent, now: new Date('2026-09-03T12:00:00Z') });
    if (!draft) failures.push('draft was not created');
    for (const [field, expected] of Object.entries(entry.expectedFields || {})) {
      if (draft?.fields?.[field] !== expected) failures.push(`${field} expected ${expected}, received ${draft?.fields?.[field] || ''}`);
    }
  } else if (entry.capability === 'safety') {
    const result = inspectAIInput(entry.input);
    if (result.safe !== entry.expectedSafe) failures.push(`safe expected ${entry.expectedSafe}, received ${result.safe}`);
    if (entry.expectedIssue && !result.issues.includes(entry.expectedIssue)) failures.push(`missing issue ${entry.expectedIssue}`);
    if (entry.mustRedact && result.redactedText.includes(entry.mustRedact)) failures.push('private value was not redacted');
  } else {
    failures.push(`unsupported capability ${entry.capability}`);
  }
  return { id: entry.id, capability: entry.capability, language: entry.language, passed: failures.length === 0, failures };
};

const runGoldenEvals = (cases = goldenCases) => {
  const results = cases.map(evaluateCase);
  const byCapability = {};
  const byLanguage = {};
  for (const result of results) {
    for (const [bucket, key] of [[byCapability, result.capability], [byLanguage, result.language]]) {
      bucket[key] ||= { total: 0, passed: 0, failed: 0 };
      bucket[key].total += 1;
      bucket[key][result.passed ? 'passed' : 'failed'] += 1;
    }
  }
  const passed = results.filter((result) => result.passed).length;
  return {
    datasetVersion: 'golden-v1',
    total: results.length,
    passed,
    failed: results.length - passed,
    passRate: results.length ? Math.round((passed / results.length) * 1000) / 10 : 0,
    byCapability,
    byLanguage,
    results,
  };
};

export { evaluateCase, runGoldenEvals };
