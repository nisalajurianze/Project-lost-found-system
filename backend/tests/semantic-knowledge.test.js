import test from 'node:test';
import assert from 'node:assert/strict';
import AIEmbeddingRecord from '../models/AIEmbeddingRecord.js';
import AIKnowledgeArticle from '../models/AIKnowledgeArticle.js';
import { correctSearchText } from '../services/spellingCorrectionService.js';
import { SYSTEM_ARTICLES, isKnowledgeQuery, rankKnowledgeArticles } from '../services/knowledgeAssistantService.js';
import { createSemanticEmbedding, rerankHybridCandidate, semanticSimilarity, VECTOR_DIMENSIONS } from '../services/semanticSearchService.js';
import { resolveLocation } from '../services/locationIntelligenceService.js';

test('approved spelling corrections fix common campus typos but preserve identifiers', () => {
  const result = correctSearchText('blue bag cateen laga libry ID-SEU-2026-44');
  assert.match(result.corrected, /canteen/);
  assert.match(result.corrected, /library/);
  assert.match(result.corrected, /ID-SEU-2026-44/);
  assert.equal(result.corrections.filter(({ applied }) => applied).length, 2);
});

test('semantic embedding is bounded and links multilingual related items', () => {
  const vector = createSemanticEmbedding('kalu phone eka library laga');
  assert.equal(vector.length, VECTOR_DIMENSIONS);
  const related = semanticSimilarity('நீல மொபைல் நூலகம்', { itemName: 'Blue phone', category: 'Electronics', foundLocation: 'Main library' });
  const unrelated = semanticSimilarity('நீல மொபைல் நூலகம்', { itemName: 'Brown wallet', category: 'Accessories', foundLocation: 'Sports ground' });
  assert.ok(related > unrelated);
  const reranked = rerankHybridCandidate({ itemName: 'Mobile phone', foundLocation: 'Library' }, 'phone near library', { score: 50, reasons: [] });
  assert.ok(reranked.semanticScore > 0);
});

test('embedding records are versioned uniquely per target', () => {
  const index = AIEmbeddingRecord.schema.indexes().find(([keys, options]) => keys.targetType === 1 && keys.targetId === 1 && keys.targetVersion === 1 && options.unique);
  assert.ok(index);
});

test('approved knowledge answers retain source citations and language style', () => {
  assert.equal(isKnowledgeQuery('Which faculties are at Oluvil campus?'), true);
  const ranked = rankKnowledgeArticles('FAS campus eka koheda', SYSTEM_ARTICLES, 'singlish');
  assert.ok(ranked.length > 0);
  assert.match(ranked[0].answer, /Sammanthurai/);
  assert.match(ranked[0].citation.url, /^https:\/\/www\.seu\.ac\.lk\//);
  const governanceIndex = AIKnowledgeArticle.schema.indexes().find(([keys]) => keys.type === 1 && keys.status === 1 && keys.visibility === 1);
  assert.ok(governanceIndex);
});

test('campus aliases resolve faculties and protect imprecise hostel locations', () => {
  assert.equal(resolveLocation('FMC block').best?.canonicalName, 'SEUSL Faculty of Management and Commerce');
  const hostel = resolveLocation('student hostal');
  assert.equal(hostel.best?.sensitivity, 'zone-only');
});
