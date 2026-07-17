// /backend/models/Promotion.js
const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  username: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },

  // Platform Selection
  platform: {
    type: String,
    enum: ['youtube', 'instagram', 'tiktok', 'facebook', 'other'],
    required: true
  },

  // Video Details
  videoLink: {
    type: String,
    required: true,
    trim: true
  },
  videoTitle: {
    type: String,
    required: true,
    trim: true
  },
  videoDescription: {
    type: String,
    default: '',
    trim: true
  },

  // Reward Selections
  desiredProfilePhoto: {
    type: String,
    required: true,
    trim: true,
    comment: 'Character name for animated profile photo reward'
  },
  desiredBanner: {
    type: String,
    required: true,
    trim: true,
    comment: 'Character name for animated banner reward'
  },
  desiredTitle: {
    type: String,
    required: true,
    trim: true,
    comment: 'Desired title name (will be made legendary)'
  },

  // Milestone Tracking
  milestones: {
    views10k: {
      achieved: {
        type: Boolean,
        default: false
      },
      verifiedAt: {
        type: Date,
        default: null
      },
      rewardGiven: {
        type: Boolean,
        default: false
      },
      rewardGivenAt: {
        type: Date,
        default: null
      }
    },
    views50k: {
      achieved: {
        type: Boolean,
        default: false
      },
      verifiedAt: {
        type: Date,
        default: null
      },
      rewardGiven: {
        type: Boolean,
        default: false
      },
      rewardGivenAt: {
        type: Date,
        default: null
      }
    },
    views100k: {
      achieved: {
        type: Boolean,
        default: false
      },
      verifiedAt: {
        type: Date,
        default: null
      },
      rewardGiven: {
        type: Boolean,
        default: false
      },
      rewardGivenAt: {
        type: Date,
        default: null
      }
    }
  },

  // Admin Notes
  adminNotes: {
    type: String,
    default: ''
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending'
  },

  // Admin who verified
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Timestamps
  submittedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for faster queries
promotionSchema.index({ userId: 1, status: 1 });
promotionSchema.index({ status: 1, submittedAt: -1 });
promotionSchema.index({ 'milestones.views10k.achieved': 1 });
promotionSchema.index({ 'milestones.views50k.achieved': 1 });
promotionSchema.index({ 'milestones.views100k.achieved': 1 });

// Virtual: Check if any milestone is achieved
promotionSchema.virtual('hasAchievements').get(function() {
  return this.milestones.views10k.achieved || 
         this.milestones.views50k.achieved || 
         this.milestones.views100k.achieved;
});

// Virtual: Get all achieved milestones
promotionSchema.virtual('achievedMilestones').get(function() {
  const achieved = [];
  if (this.milestones.views10k.achieved) achieved.push('10k');
  if (this.milestones.views50k.achieved) achieved.push('50k');
  if (this.milestones.views100k.achieved) achieved.push('100k');
  return achieved;
});

// Virtual: Get all rewarded milestones
promotionSchema.virtual('rewardedMilestones').get(function() {
  const rewarded = [];
  if (this.milestones.views10k.rewardGiven) rewarded.push('10k');
  if (this.milestones.views50k.rewardGiven) rewarded.push('50k');
  if (this.milestones.views100k.rewardGiven) rewarded.push('100k');
  return rewarded;
});

// Ensure virtuals are included in JSON output
promotionSchema.set('toJSON', { virtuals: true });
promotionSchema.set('toObject', { virtuals: true });

const Promotion = mongoose.model('Promotion', promotionSchema);

module.exports = Promotion;