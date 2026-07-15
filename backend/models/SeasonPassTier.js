const mongoose = require('mongoose');

const seasonPassTierSchema = new mongoose.Schema({
  seasonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SeasonPass',
    required: true,
    index: true
  },
  tier: {
    type: Number,
    required: true,
    min: 1,
    max: 100
  },
  rewards: [{
    type: {
      type: String,
      enum: ['shards', 'gems', 'card', 'title', 'banner', 'profilePhoto', 'background'],
      required: true
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'rewards.type',
      default: null
    },
    itemName: {
      type: String,
      default: null
    },
    amount: {
      type: Number,
      default: null
    },
    message: {
      type: String,
      default: null
    },
    isClaimed: {
      type: Boolean,
      default: false
    }
  }],
  isUnlocked: {
    type: Boolean,
    default: false
  },
  unlockedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: {
    transform: (doc, ret) => {
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    transform: (doc, ret) => {
      delete ret.__v;
      return ret;
    }
  }
});

seasonPassTierSchema.index({ seasonId: 1, tier: 1 }, { unique: true });
seasonPassTierSchema.index({ seasonId: 1, isUnlocked: 1 });

seasonPassTierSchema.methods.unlockTier = async function() {
  if (this.isUnlocked) return this;
  
  this.isUnlocked = true;
  this.unlockedAt = new Date();
  await this.save();
  
  return this;
};

seasonPassTierSchema.methods.claimReward = async function(rewardIndex) {
  if (!this.isUnlocked) {
    throw new Error('Tier is not unlocked yet');
  }
  
  if (rewardIndex >= this.rewards.length) {
    throw new Error('Invalid reward index');
  }
  
  if (this.rewards[rewardIndex].isClaimed) {
    throw new Error('Reward already claimed');
  }
  
  this.rewards[rewardIndex].isClaimed = true;
  await this.save();
  
  return this.rewards[rewardIndex];
};

seasonPassTierSchema.methods.hasUnclaimedRewards = function() {
  return this.rewards.some(r => !r.isClaimed);
};

seasonPassTierSchema.methods.getUnclaimedRewards = function() {
  return this.rewards.filter(r => !r.isClaimed);
};

seasonPassTierSchema.methods.getAllRewardsClaimed = function() {
  return this.rewards.every(r => r.isClaimed);
};

seasonPassTierSchema.statics.getTiersForSeason = async function(seasonId) {
  return this.find({ seasonId }).sort({ tier: 1 });
};

seasonPassTierSchema.statics.getTierByNumber = async function(seasonId, tier) {
  return this.findOne({ seasonId, tier });
};

seasonPassTierSchema.statics.getUnlockedTiers = async function(seasonId) {
  return this.find({ seasonId, isUnlocked: true }).sort({ tier: 1 });
};

seasonPassTierSchema.statics.getLockedTiers = async function(seasonId) {
  return this.find({ seasonId, isUnlocked: false }).sort({ tier: 1 });
};

seasonPassTierSchema.statics.getTiersWithUnclaimedRewards = async function(seasonId) {
  const tiers = await this.find({ seasonId, isUnlocked: true });
  return tiers.filter(t => t.hasUnclaimedRewards());
};

seasonPassTierSchema.statics.getProgressStats = async function(seasonId) {
  const total = await this.countDocuments({ seasonId });
  const unlocked = await this.countDocuments({ seasonId, isUnlocked: true });
  const claimed = await this.countDocuments({ 
    seasonId, 
    isUnlocked: true,
    'rewards.isClaimed': true
  });
  
  return {
    total,
    unlocked,
    claimed,
    progress: total > 0 ? Math.round((unlocked / total) * 100) : 0
  };
};

seasonPassTierSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('SeasonPassTier', seasonPassTierSchema);