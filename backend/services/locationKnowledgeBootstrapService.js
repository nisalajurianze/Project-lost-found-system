import LocationKnowledge from '../models/LocationKnowledge.js';
import { setApprovedLocationKnowledge } from './locationIntelligenceService.js';

const ACTIVE_STATUSES = ['map-source-verified', 'field-verified', 'university-approved'];

const refreshApprovedLocations = async () => {
  const records = await LocationKnowledge.find({ isActive: true, verificationStatus: { $in: ACTIVE_STATUSES } }).lean();
  setApprovedLocationKnowledge(records.map((entry) => ({
    id: `knowledge-${entry._id}`,
    canonicalName: entry.canonicalName,
    names: entry.names || {},
    aliases: entry.aliases || [],
    area: entry.area,
    parentId: entry.parentId || undefined,
    verificationStatus: entry.verificationStatus,
    sensitivity: entry.sensitivity,
    coordinates: entry.sensitivity === 'public' ? entry.coordinates : undefined,
    sourceType: entry.sourceType,
    lastVerifiedAt: entry.lastVerifiedAt,
  })));
  return records.length;
};

export { ACTIVE_STATUSES, refreshApprovedLocations };
