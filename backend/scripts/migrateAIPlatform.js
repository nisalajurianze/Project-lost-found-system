import 'dotenv/config';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import connectDB, { closeDB } from '../config/db.js';
import User from '../models/User.js';
import LostItem from '../models/LostItem.js';
import FoundItem from '../models/FoundItem.js';
import ImageAnalysis from '../models/ImageAnalysis.js';
import AIKnowledgeArticle from '../models/AIKnowledgeArticle.js';
import AIEmbeddingRecord from '../models/AIEmbeddingRecord.js';
import AssistantSession from '../models/AssistantSession.js';
import AssistantSubmission from '../models/AssistantSubmission.js';
import AssistantHandoff from '../models/AssistantHandoff.js';
import PosterAsset from '../models/PosterAsset.js';
import DuplicateReviewCluster from '../models/DuplicateReviewCluster.js';
import AIEvaluationDatasetSnapshot from '../models/AIEvaluationDatasetSnapshot.js';
import AIExperiment from '../models/AIExperiment.js';
import { VECTOR_DIMENSIONS, buildSearchDocument, createSemanticEmbedding, embeddingVersion } from '../services/semanticSearchService.js';

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const BATCH_SIZE = Math.max(10, Math.min(500, Number(process.env.AI_MIGRATION_BATCH_SIZE) || 100));

const knowledgeDocument = (article) => [
  article.title,
  article.answer,
  ...(article.aliases || []),
  ...Object.values(article.translations || {}).flatMap((translation) => [translation?.title, translation?.answer]),
].filter(Boolean).join(' ');

const buildEmbeddingOperation = ({ targetType, targetId, document }) => ({
  updateOne: {
    filter: { targetType, targetId, targetVersion: embeddingVersion },
    update: {
      $set: {
        documentChecksum: sha256(document),
        model: embeddingVersion,
        dimensions: VECTOR_DIMENSIONS,
        vector: createSemanticEmbedding(document),
        status: 'ready',
        lastErrorCode: '',
        generatedAt: new Date(),
      },
    },
    upsert: true,
  },
});

const backfillCollection = async ({ Model, targetType, query, projector = buildSearchDocument }) => {
  let processed = 0;
  let lastId = null;
  while (true) {
    const pageQuery = lastId ? { ...query, _id: { $gt: lastId } } : query;
    const records = await Model.find(pageQuery).sort({ _id: 1 }).limit(BATCH_SIZE).lean();
    if (!records.length) break;
    const operations = records
      .map((record) => ({ record, document: projector(record) }))
      .filter(({ document }) => document.trim())
      .map(({ record, document }) => buildEmbeddingOperation({ targetType, targetId: record._id, document }));
    if (operations.length) await AIEmbeddingRecord.bulkWrite(operations, { ordered: false });
    processed += records.length;
    lastId = records.at(-1)._id;
    console.log(`[ai-migration] ${targetType}: ${processed} source records processed`);
  }
  return processed;
};

const migrationSummary = async () => ({
  usersMissingSmartPreferences: await User.countDocuments({ $or: [
    { 'notificationPreferences.smartMatchesEnabled': { $exists: false } },
    { 'notificationPreferences.minimumMatchConfidence': { $exists: false } },
    { 'notificationPreferences.quietHours.timezone': { $exists: false } },
  ] }),
  legacyImageAnalyses: await ImageAnalysis.countDocuments({ $or: [
    { analysisVersion: { $ne: 'vision-v3' } },
    { qualityScores: { $exists: false } },
    { accessibilityCaption: { $exists: false } },
  ] }),
  activeLostReports: await LostItem.countDocuments({ isDeleted: { $ne: true }, isArchived: { $ne: true }, status: { $in: ['pending', 'matched', 'in_progress'] } }),
  activeFoundReports: await FoundItem.countDocuments({ isDeleted: { $ne: true }, isArchived: { $ne: true }, status: { $in: ['available', 'matched', 'in_progress'] } }),
  approvedKnowledgeArticles: await AIKnowledgeArticle.countDocuments({ status: 'approved' }),
});

const applyMigration = async () => {
  const preferenceDefaults = [
    ['notificationPreferences.smartMatchesEnabled', true],
    ['notificationPreferences.minimumMatchConfidence', 75],
    ['notificationPreferences.quietHours.enabled', false],
    ['notificationPreferences.quietHours.start', '22:00'],
    ['notificationPreferences.quietHours.end', '07:00'],
    ['notificationPreferences.quietHours.timezone', 'Asia/Colombo'],
  ];
  for (const [field, value] of preferenceDefaults) {
    await User.updateMany({ [field]: { $exists: false } }, { $set: { [field]: value } });
  }

  await ImageAnalysis.updateMany({ analysisVersion: { $ne: 'vision-v3' } }, { $set: { analysisVersion: 'vision-v3' } });
  await ImageAnalysis.updateMany({ qualityScores: { $exists: false } }, { $set: { qualityScores: { blur: 0, exposure: 0, resolution: 0, occlusion: 0, guidance: [] } } });
  await ImageAnalysis.updateMany({ accessibilityCaption: { $exists: false } }, { $set: { accessibilityCaption: { draft: '', approved: '', language: 'en', status: 'draft' } } });

  const embedded = {
    LostItem: await backfillCollection({
      Model: LostItem,
      targetType: 'LostItem',
      query: { isDeleted: { $ne: true }, isArchived: { $ne: true }, status: { $in: ['pending', 'matched', 'in_progress'] } },
    }),
    FoundItem: await backfillCollection({
      Model: FoundItem,
      targetType: 'FoundItem',
      query: { isDeleted: { $ne: true }, isArchived: { $ne: true }, status: { $in: ['available', 'matched', 'in_progress'] } },
    }),
    AIKnowledgeArticle: await backfillCollection({
      Model: AIKnowledgeArticle,
      targetType: 'AIKnowledgeArticle',
      query: { status: 'approved' },
      projector: knowledgeDocument,
    }),
  };

  await Promise.all([
    User.createIndexes(), LostItem.createIndexes(), FoundItem.createIndexes(), ImageAnalysis.createIndexes(),
    AIKnowledgeArticle.createIndexes(), AIEmbeddingRecord.createIndexes(), AssistantSession.createIndexes(),
    AssistantSubmission.createIndexes(), AssistantHandoff.createIndexes(), PosterAsset.createIndexes(),
    DuplicateReviewCluster.createIndexes(), AIEvaluationDatasetSnapshot.createIndexes(), AIExperiment.createIndexes(),
  ]);
  return embedded;
};

const run = async () => {
  const apply = process.argv.includes('--apply');
  if (apply && process.env.CONFIRM_AI_MIGRATION !== 'YES') {
    throw new Error('Set CONFIRM_AI_MIGRATION=YES and take a verified backup before using --apply.');
  }
  await connectDB();
  try {
    const before = await migrationSummary();
    if (!apply) {
      console.log(JSON.stringify({ mode: 'dry-run', writesPerformed: false, batchSize: BATCH_SIZE, before }, null, 2));
      return;
    }
    const embedded = await applyMigration();
    const after = await migrationSummary();
    console.log(JSON.stringify({ mode: 'apply', writesPerformed: true, embedded, before, after }, null, 2));
  } finally {
    await closeDB();
  }
};

const isDirectRun = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isDirectRun) run().catch(async (error) => {
  console.error('[ai-migration] failed:', error.message);
  await closeDB().catch(() => undefined);
  process.exit(1);
});

export { applyMigration, backfillCollection, buildEmbeddingOperation, knowledgeDocument, migrationSummary };
