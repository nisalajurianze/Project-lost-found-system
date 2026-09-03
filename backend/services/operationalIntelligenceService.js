const cleanBucket = (entry) => ({
  label: String(entry?._id || 'Unknown').trim().slice(0, 180) || 'Unknown',
  count: Math.max(0, Number(entry?.count) || 0),
});

export const mergeBuckets = (...groups) => {
  const totals = new Map();
  for (const entry of groups.flat()) {
    const bucket = cleanBucket(entry);
    const key = bucket.label.toLocaleLowerCase('en-US');
    totals.set(key, { label: bucket.label, count: (totals.get(key)?.count || 0) + bucket.count });
  }
  return [...totals.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).slice(0, 8);
};

export const mergeHourBuckets = (...groups) => {
  const ranges = [
    { label: '00:00-05:59', from: 0, to: 5 },
    { label: '06:00-11:59', from: 6, to: 11 },
    { label: '12:00-17:59', from: 12, to: 17 },
    { label: '18:00-23:59', from: 18, to: 23 },
  ];
  return ranges.map((range) => ({
    label: range.label,
    count: groups.flat().filter((entry) => Number(entry?._id) >= range.from && Number(entry?._id) <= range.to)
      .reduce((sum, entry) => sum + clampCount(entry?.count), 0),
  })).sort((left, right) => right.count - left.count);
};

const clampCount = (value) => Math.max(0, Math.floor(Number(value) || 0));
const roundOne = (value) => Math.round(Number(value) * 10) / 10;

export const wilsonInterval = (successesValue, totalValue, z = 1.96) => {
  const total = clampCount(totalValue);
  const successes = Math.min(total, clampCount(successesValue));
  if (!total) return { lower: 0, upper: 0 };
  const proportion = successes / total;
  const denominator = 1 + (z ** 2) / total;
  const centre = proportion + (z ** 2) / (2 * total);
  const margin = z * Math.sqrt((proportion * (1 - proportion) + (z ** 2) / (4 * total)) / total);
  return {
    lower: Math.max(0, Math.min(100, roundOne(((centre - margin) / denominator) * 100))),
    upper: Math.max(0, Math.min(100, roundOne(((centre + margin) / denominator) * 100))),
  };
};

const cohortLabel = (entry) => {
  const id = entry?._id;
  if (id && typeof id === 'object') return String(id.canonicalName || id.label || id.id || '').trim().slice(0, 180);
  return String(id || entry?.label || '').trim().slice(0, 180);
};

export const buildOutcomeCohorts = (entries = [], { minimumSample = 10, limit = 8 } = {}) => entries
  .map((entry) => {
    const label = cohortLabel(entry);
    const sampleSize = clampCount(entry?.sampleSize ?? entry?.total);
    const recovered = Math.min(sampleSize, clampCount(entry?.recovered));
    const observedRecoveryRate = sampleSize ? roundOne((recovered / sampleSize) * 100) : 0;
    const smoothedRecoveryRate = roundOne(((recovered + 1) / (sampleSize + 2)) * 100);
    const interval = wilsonInterval(recovered, sampleSize);
    const averageRecoveryHours = Number.isFinite(Number(entry?.averageRecoveryHours))
      ? roundOne(entry.averageRecoveryHours)
      : null;
    const recoveryDurationSample = clampCount(entry?.recoveryDurationSample ?? recovered);
    return {
      label,
      sampleSize,
      recovered,
      observedRecoveryRate,
      smoothedRecoveryRate,
      interval95: interval,
      averageRecoveryHours,
      recoveryDurationSample,
      eligible: Boolean(label) && sampleSize >= minimumSample,
    };
  })
  .filter((entry) => entry.label)
  .sort((left, right) => Number(right.eligible) - Number(left.eligible)
    || right.interval95.lower - left.interval95.lower
    || right.sampleSize - left.sampleSize
    || left.label.localeCompare(right.label))
  .slice(0, Math.max(1, limit));

export const buildOperationalIntelligence = ({
  summary,
  operations,
  newLost24 = 0,
  newFound24 = 0,
  approvedClaims30 = 0,
  locations = [],
  categories = [],
  times = [],
  averageRecoveryHours = null,
  recoverySampleSize = 0,
  categoryOutcomeCohorts = [],
  locationOutcomeCohorts = [],
  predictionMinimumSample = 10,
  predictionLookbackDays = 365,
}) => {
  const totalReports = Number(summary?.totalLostItems || 0) + Number(summary?.totalFoundItems || 0);
  const recoveries = Number(summary?.successfulRecoveries || 0);
  const recoveryRate = Number(summary?.totalLostItems || 0) > 0
    ? Math.round((recoveries / Number(summary.totalLostItems)) * 100)
    : 0;
  const dailyBriefItems = [
    {
      type: 'reports-created-24h',
      params: { lost: clampCount(newLost24), found: clampCount(newFound24) },
      message: `${newLost24} lost and ${newFound24} found reports were created in the last 24 hours.`,
    },
    {
      type: 'claims-pending-overdue',
      params: { pending: clampCount(operations?.pendingClaims), overdue: clampCount(operations?.overdueClaims) },
      message: `${operations?.pendingClaims || 0} claims are pending; ${operations?.overdueClaims || 0} are older than 48 hours.`,
    },
    {
      type: 'strong-matches-review',
      params: { count: clampCount(operations?.strongSuggestedMatches) },
      message: `${operations?.strongSuggestedMatches || 0} strong match suggestions await human review.`,
    },
    {
      type: 'privacy-review',
      params: { count: clampCount(operations?.privacyReviewItems) },
      message: `${operations?.privacyReviewItems || 0} image analyses require privacy/moderation review.`,
    },
  ];
  const dailyBrief = dailyBriefItems.map((item) => item.message);

  const recommendations = [];
  const dataSufficient = totalReports >= 20;
  if (!dataSufficient) {
    recommendations.push({
      type: 'insufficient-data',
      confidence: 'insufficient',
      params: { minimumSample: 20 },
      message: 'Operational recommendations are withheld until at least 20 reports exist. Continue collecting verified outcomes.',
    });
  } else {
    if (locations[0]?.count >= 3) recommendations.push({
      type: 'hotspot-prevention', confidence: 'low',
      params: { label: locations[0].label, count: locations[0].count },
      message: `${locations[0].label} is the highest-volume recent location (${locations[0].count} reports). Consider a verified handover point, reminder sign or targeted awareness message.`,
    });
    if (categories[0]?.count >= 3) recommendations.push({
      type: 'category-awareness', confidence: 'low',
      params: { label: categories[0].label, count: categories[0].count },
      message: `${categories[0].label} is the most common recent category (${categories[0].count} reports). Publish category-specific prevention and identification guidance.`,
    });
    if ((operations?.overdueClaims || 0) > 0) recommendations.push({
      type: 'review-capacity', confidence: 'high',
      params: { count: clampCount(operations.overdueClaims) },
      message: `${operations.overdueClaims} claims are overdue. Prioritise human review before adding new automated recommendations.`,
    });
    if (!recommendations.length) recommendations.push({
      type: 'stable-operations', confidence: 'low',
      params: {},
      message: 'No strong operational intervention is indicated by the current aggregate data. Continue monitoring verified outcomes.',
    });
  }

  const categoryEvidence = buildOutcomeCohorts(categoryOutcomeCohorts, { minimumSample: predictionMinimumSample });
  const locationEvidence = buildOutcomeCohorts(locationOutcomeCohorts, { minimumSample: predictionMinimumSample });
  const eligibleCategory = categoryEvidence.filter((entry) => entry.eligible);
  const eligibleLocation = locationEvidence.filter((entry) => entry.eligible);
  const predictiveDataSufficient = eligibleCategory.length > 0 || eligibleLocation.length > 0;

  return {
    generatedAt: new Date().toISOString(),
    policy: 'aggregate-advisory-only',
    dailyBrief,
    dailyBriefItems,
    recovery: {
      totalReports,
      recoveries,
      recoveryRate,
      averageRecoveryHours: Number.isFinite(Number(averageRecoveryHours)) ? roundOne(averageRecoveryHours) : null,
      sampleSize: Number(recoverySampleSize) || 0,
      approvedClaimsLast30Days: Number(approvedClaims30) || 0,
    },
    hotspots: { locations, categories, times },
    recommendations: {
      classification: 'experimental-advisory-not-fact',
      dataSufficient,
      minimumSample: 20,
      items: recommendations,
    },
    predictions: {
      classification: 'historical-aggregate-observation-not-individual-prediction',
      policy: 'verified-outcomes-only-no-user-profiling',
      dataSufficient: predictiveDataSufficient,
      minimumSample: predictionMinimumSample,
      lookbackDays: predictionLookbackDays,
      categoryCohorts: categoryEvidence,
      locationCohorts: locationEvidence,
      noticeCode: predictiveDataSufficient ? 'available' : 'insufficient',
      noticeParams: { minimumSample: predictionMinimumSample },
      notice: predictiveDataSufficient
        ? 'These ranges describe historical aggregate outcomes and do not predict or decide any individual report.'
        : `Historical cohort guidance is withheld until at least ${predictionMinimumSample} verified lost-report outcomes exist in a category or governed location cohort.`,
    },
    groundedNarrative: buildGroundedAdminNarrative({
      recovery: { totalReports, recoveries, recoveryRate },
      hotspots: { locations, categories, times },
      operations,
    }),
  };
};

export const buildGroundedAdminNarrative = ({ recovery = {}, hotspots = {}, operations = {} } = {}) => {
  const statements = [];
  const evidence = [];
  if (hotspots.locations?.[0]?.count > 0) {
    statements.push(`${hotspots.locations[0].label} has the highest recent report volume with ${hotspots.locations[0].count} reports.`);
    evidence.push({ metric: 'top-location', value: hotspots.locations[0] });
  }
  if (hotspots.categories?.[0]?.count > 0) {
    statements.push(`${hotspots.categories[0].label} is the most common recent category with ${hotspots.categories[0].count} reports.`);
    evidence.push({ metric: 'top-category', value: hotspots.categories[0] });
  }
  if (hotspots.times?.[0]?.count > 0) {
    statements.push(`${hotspots.times[0].label} is the highest-volume reported time band with ${hotspots.times[0].count} reports.`);
    evidence.push({ metric: 'top-time-band', value: hotspots.times[0] });
  }
  statements.push(`${Number(recovery.recoveries) || 0} of ${Number(recovery.totalReports) || 0} reports are recorded as recovered; the current aggregate recovery rate is ${Number(recovery.recoveryRate) || 0}%.`);
  evidence.push({ metric: 'recovery', value: { recovered: Number(recovery.recoveries) || 0, total: Number(recovery.totalReports) || 0, rate: Number(recovery.recoveryRate) || 0 } });
  if (Number(operations.overdueClaims) > 0) {
    statements.push(`${operations.overdueClaims} claims are overdue and require human review.`);
    evidence.push({ metric: 'overdue-claims', value: Number(operations.overdueClaims) });
  }
  return {
    statements,
    evidence,
    classification: 'deterministic-grounded-aggregate-explanation',
    limitations: 'Describes aggregate records only; it does not infer causes, profile users, or make individual predictions.',
  };
};

export const answerAdminAnalyticsQuestion = (intelligence = {}, question = '') => {
  const text = String(question).normalize('NFKC').toLocaleLowerCase('en-US');
  const narrative = intelligence.groundedNarrative || buildGroundedAdminNarrative({ recovery: intelligence.recovery, hotspots: intelligence.hotspots });
  const indexes = /location|place|where|thana|இட/u.test(text) ? ['top-location']
    : /categor|item|what|mona|வகை/u.test(text) ? ['top-category']
      : /time|when|wela|நேர/u.test(text) ? ['top-time-band']
        : /recover|return|success|hamuna|மீட/u.test(text) ? ['recovery']
          : [];
  const evidence = indexes.length ? narrative.evidence.filter((entry) => indexes.includes(entry.metric)) : narrative.evidence;
  const statements = indexes.length
    ? narrative.statements.filter((_statement, index) => indexes.includes(narrative.evidence[index]?.metric))
    : narrative.statements;
  return { answer: statements.join(' ') || 'There is not enough aggregate evidence to answer that question yet.', evidence, classification: narrative.classification, limitations: narrative.limitations };
};
