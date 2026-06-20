// ============================================
// Claim Request Model
// Users claim found items; admins approve/reject
// ============================================

import mongoose from 'mongoose';

const claimRequestSchema = new mongoose.Schema(
  {
    claimantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Claimant ID is required'],
      index: true,
    },
    foundItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoundItem',
      index: true,
      default: null,
    },
    lostItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LostItem',
      index: true,
      default: null,
    },
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
      default: null,
    },
    proofDescription: {
      type: String,
      required: [true, 'Proof description is required'],
      trim: true,
      minlength: [10, 'Proof description must be at least 10 characters'],
      maxlength: [2000, 'Proof description cannot exceed 2000 characters'],
    },
    proofImages: {
      type: [
        {
          url: { type: String, required: true },
          publicId: { type: String, default: '' },
        },
      ],
      validate: {
        validator: (arr) => arr.length <= 3,
        message: 'Maximum 3 proof images allowed',
      },
      default: [],
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'approved', 'rejected'],
        message: 'Status must be pending, approved, or rejected',
      },
      default: 'pending',
      index: true,
    },
    adminRemark: {
      type: String,
      default: '',
      maxlength: [1000, 'Remark cannot exceed 1000 characters'],
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    isContactShared: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Require exactly one of foundItemId or lostItemId
claimRequestSchema.pre('validate', function(next) {
  if (!this.foundItemId && !this.lostItemId) {
    this.invalidate('foundItemId', 'Either foundItemId or lostItemId is required');
  } else if (this.foundItemId && this.lostItemId) {
    this.invalidate('foundItemId', 'Cannot provide both foundItemId and lostItemId');
  }
  next();
});

// ── Indexes ─────────────────────────────────────────────────────────────
claimRequestSchema.index({ claimantId: 1, foundItemId: 1 });
claimRequestSchema.index({ status: 1, createdAt: -1 });
claimRequestSchema.index({ createdAt: -1 });

const ClaimRequest = mongoose.model('ClaimRequest', claimRequestSchema);
export default ClaimRequest;
