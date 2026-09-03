import DuplicateReviewCluster from '../models/DuplicateReviewCluster.js';
import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { paginate } from '../utils/pagination.js';

const listDuplicateReviews = asyncHandler(async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  const totalDocs = await DuplicateReviewCluster.countDocuments(filter);
  const pagination = paginate(req.query, totalDocs);
  const clusters = await DuplicateReviewCluster.find(filter)
    .sort({ riskScore: -1, createdAt: -1 })
    .skip(pagination.skip)
    .limit(pagination.limit)
    .lean();
  return ApiResponse.ok({
    clusters,
    pagination,
    policy: 'Signals are advisory. An administrator must review them; the system never auto-bans users or auto-deletes reports.',
  }, 'Duplicate review clusters retrieved.').send(res);
});

const reviewDuplicateCluster = asyncHandler(async (req, res) => {
  const status = String(req.body?.status || '');
  if (!['dismissed', 'confirmed-duplicate'].includes(status)) throw ApiError.badRequest('Status must be dismissed or confirmed-duplicate.');
  const cluster = await DuplicateReviewCluster.findById(req.params.id);
  if (!cluster) throw ApiError.notFound('Duplicate review cluster not found.');
  cluster.status = status;
  cluster.reviewedBy = req.user._id;
  cluster.reviewedAt = new Date();
  cluster.reviewNote = String(req.body?.reviewNote || '').slice(0, 1000);
  await cluster.save();
  return ApiResponse.ok(cluster, 'Duplicate review decision recorded. No automatic account action was taken.').send(res);
});

export { listDuplicateReviews, reviewDuplicateCluster };
