import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { buildEmbeddingOperation, knowledgeDocument } from '../scripts/migrateAIPlatform.js';
import { VECTOR_DIMENSIONS, embeddingVersion } from '../services/semanticSearchService.js';

test('AI migration builds deterministic idempotent embedding upserts', () => {
  const targetId = new mongoose.Types.ObjectId();
  const first = buildEmbeddingOperation({ targetType: 'LostItem', targetId, document: 'blue bag main canteen' });
  const second = buildEmbeddingOperation({ targetType: 'LostItem', targetId, document: 'blue bag main canteen' });
  assert.deepEqual(first.updateOne.filter, { targetType: 'LostItem', targetId, targetVersion: embeddingVersion });
  assert.equal(first.updateOne.upsert, true);
  assert.equal(first.updateOne.update.$set.documentChecksum, second.updateOne.update.$set.documentChecksum);
  assert.equal(first.updateOne.update.$set.vector.length, VECTOR_DIMENSIONS);
});

test('AI migration embeds approved knowledge translations without private metadata', () => {
  const document = knowledgeDocument({
    title: 'Library rules', answer: 'Return found items to the authorised desk.', aliases: ['libry'],
    translations: { ta: { title: 'நூலக விதிகள்', answer: 'அங்கீகரிக்கப்பட்ட அலுவலகத்தில் ஒப்படைக்கவும்.' } },
    createdBy: 'private-user-id',
  });
  assert.match(document, /Library rules/u);
  assert.match(document, /நூலக விதிகள்/u);
  assert.doesNotMatch(document, /private-user-id/u);
});

test('AI migration command is dry-run by default and requires explicit apply confirmation', async () => {
  const source = await import('node:fs/promises').then((fs) => fs.readFile(new URL('../scripts/migrateAIPlatform.js', import.meta.url), 'utf8'));
  assert.match(source, /process\.argv\.includes\('--apply'\)/u);
  assert.match(source, /CONFIRM_AI_MIGRATION/u);
  assert.match(source, /writesPerformed: false/u);
});
