import locations from '../data/seuslLocations.js';

const normalise = (value) => String(value || '')
  .normalize('NFKC')
  .toLocaleLowerCase('en-US')
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim();

const tokenSet = (value) => new Set(normalise(value).split(/\s+/).filter((token) => token.length > 1));
const overlap = (left, right) => {
  if (!left.size || !right.size) return 0;
  const matches = [...left].filter((token) => right.has(token)).length;
  return matches / Math.max(1, Math.min(left.size, right.size));
};

let approvedLocationKnowledge = [];

const indexLocation = (location) => ({
  ...location,
  searchable: [location.canonicalName, location.area, ...Object.values(location.names || {}), ...(location.aliases || [])]
    .map(normalise)
    .filter(Boolean),
});

const setApprovedLocationKnowledge = (records = []) => {
  approvedLocationKnowledge = Array.isArray(records) ? records.filter((record) => record?.id && record?.canonicalName) : [];
};

const indexedLocations = () => {
  const byId = new Map();
  [...locations, ...approvedLocationKnowledge].forEach((location) => byId.set(location.id, indexLocation(location)));
  return [...byId.values()];
};

const resolveLocation = (value) => {
  const input = normalise(value);
  if (!input) return { input: '', matches: [], best: null, confidence: 0 };
  const inputTokens = tokenSet(input);
  const matches = indexedLocations().map((location) => {
    let score = 0;
    for (const alias of location.searchable) {
      if (input === alias) score = Math.max(score, 1);
      else if (input.includes(alias)) {
        const specificity = Math.min(0.28, (alias.length / Math.max(1, input.length)) * 0.28);
        score = Math.max(score, 0.68 + specificity);
      } else if (alias.includes(input)) {
        const specificity = Math.min(0.2, (input.length / Math.max(1, alias.length)) * 0.2);
        score = Math.max(score, 0.62 + specificity);
      } else score = Math.max(score, overlap(inputTokens, tokenSet(alias)) * 0.82);
    }
    return { location, score };
  }).filter(({ score }) => score >= 0.35).sort((a, b) => b.score - a.score).slice(0, 3);
  return { input, matches, best: matches[0]?.location || null, confidence: Math.round((matches[0]?.score || 0) * 100) };
};

const compareLocations = (left, right) => {
  const leftResolved = resolveLocation(left);
  const rightResolved = resolveLocation(right);
  if (!leftResolved.input || !rightResolved.input) return { score: 0, explanation: 'Location evidence is incomplete.', left: leftResolved, right: rightResolved };

  if (leftResolved.best && rightResolved.best) {
    if (leftResolved.best.id === rightResolved.best.id) {
      return { score: 1, explanation: `Both reports resolve to ${leftResolved.best.canonicalName}.`, left: leftResolved, right: rightResolved };
    }
    if (leftResolved.best.parentId && leftResolved.best.parentId === rightResolved.best.parentId) {
      return { score: 0.82, explanation: 'Both reports refer to locations within the same campus area.', left: leftResolved, right: rightResolved };
    }
    if (leftResolved.best.area === rightResolved.best.area) {
      return { score: 0.72, explanation: `Both locations are within ${leftResolved.best.area}.`, left: leftResolved, right: rightResolved };
    }
  }

  const lexical = overlap(tokenSet(left), tokenSet(right));
  return {
    score: Math.min(0.65, lexical),
    explanation: lexical >= 0.45 ? 'The written location descriptions overlap.' : 'The locations are not clearly connected in verified knowledge.',
    left: leftResolved,
    right: rightResolved,
  };
};

const locationIntelligenceView = (resolved) => resolved?.best ? {
  id: resolved.best.id,
  canonicalName: resolved.best.canonicalName,
  area: resolved.best.area,
  verificationStatus: resolved.best.verificationStatus,
  sensitivity: resolved.best.sensitivity,
  confidence: resolved.confidence,
} : null;

const publicLocationView = (resolved) => {
  const view = locationIntelligenceView(resolved);
  if (!view) return null;
  if (view.sensitivity === 'restricted') {
    return {
      area: 'Restricted university area',
      verificationStatus: view.verificationStatus,
      sensitivity: view.sensitivity,
      confidence: view.confidence,
      precision: 'withheld',
    };
  }
  if (view.sensitivity === 'zone-only') {
    return {
      area: view.area || 'University area',
      verificationStatus: view.verificationStatus,
      sensitivity: view.sensitivity,
      confidence: view.confidence,
      precision: 'approximate',
    };
  }
  return { ...view, precision: 'exact-public' };
};

export { compareLocations, locationIntelligenceView, normalise as normalizeLocation, publicLocationView, resolveLocation, setApprovedLocationKnowledge };
