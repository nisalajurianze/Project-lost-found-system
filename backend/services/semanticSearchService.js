import crypto from 'node:crypto';
import { expandKeywords, normalizeText } from './chatSearchService.js';

const VECTOR_DIMENSIONS = 128;
const embeddingVersion = 'local-semantic-hash-v1';
const indexFor = (token) => crypto.createHash('sha256').update(token).digest().readUInt32BE(0) % VECTOR_DIMENSIONS;
const tokensFor = (value) => {
  const normalized = normalizeText(value);
  const words = normalized.split(' ').filter((token) => token.length > 1);
  const concepts = expandKeywords(value, 40);
  const trigrams = [];
  for (const word of words) {
    const padded = `^${word}$`;
    for (let index = 0; index <= padded.length - 3; index += 1) trigrams.push(`3:${padded.slice(index, index + 3)}`);
  }
  return [...words.map((word) => `w:${word}`), ...concepts.map((term) => `c:${term}`), ...trigrams];
};

const createSemanticEmbedding = (value) => {
  const vector = Array(VECTOR_DIMENSIONS).fill(0);
  for (const token of tokensFor(value)) vector[indexFor(token)] += token.startsWith('c:') ? 2 : token.startsWith('w:') ? 1.5 : 0.35;
  const magnitude = Math.sqrt(vector.reduce((sum, number) => sum + number ** 2, 0));
  return magnitude ? vector.map((number) => Number((number / magnitude).toFixed(6))) : vector;
};

const cosineSimilarity = (left, right) => {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return 0;
  return Math.max(0, Math.min(1, left.reduce((sum, number, index) => sum + number * (Number(right[index]) || 0), 0)));
};

const buildSearchDocument = (item) => [
  item?.itemName, item?.category, item?.description, item?.brand, item?.model,
  ...(item?.colors || []), ...(item?.uniqueFeatures || []), ...(item?.tags || []), ...(item?.aiKeywords || []),
  item?.lostLocation || item?.foundLocation,
].filter(Boolean).join(' ');

const semanticSimilarity = (query, item) => cosineSimilarity(createSemanticEmbedding(query), createSemanticEmbedding(buildSearchDocument(item)));

const rerankHybridCandidate = (item, query, lexicalResult) => {
  const semantic = semanticSimilarity(query, item);
  const lexical = Math.max(0, Math.min(100, Number(lexicalResult?.score) || 0));
  const score = Math.max(1, Math.min(99, Math.round(lexical * 0.72 + semantic * 100 * 0.28)));
  const reasons = [...(lexicalResult?.reasons || [])];
  if (semantic >= 0.45) reasons.push('Meaning is semantically related');
  return { score, semanticScore: Math.round(semantic * 100), lexicalScore: lexical, reasons: [...new Set(reasons)].slice(0, 5) };
};

export { VECTOR_DIMENSIONS, buildSearchDocument, cosineSimilarity, createSemanticEmbedding, embeddingVersion, rerankHybridCandidate, semanticSimilarity };
