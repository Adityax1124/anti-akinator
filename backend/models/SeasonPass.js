const mongoose = require('mongoose');

// ============================================================
// ✅ SEASON PASS MODEL
// ============================================================
const seasonPassSchema = new mongoose.Schema({
  // ===== BASIC INFO =====
  name: {
    type: String,
    required: true,
    default: 'Season Pass'
  },
  description: {
    type: String,
    default: 'Progress through tiers by making correct guesses!'
  },
  
  // ===== SEASON INFO =====
  seasonNumber: {
    type: Number,
    required: true,
    unique: true,
    min: 1
  },
  seasonName: {
    type: String,
    required: true
  },
  
  // ===== TIMELINE =====
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  
  // ===== TIERS =====
  totalTiers: {
    type: Number,
    default: 100,
    min: 1,
    max: 100
  },
  correctGuessesPerTier: {
    type: Number,
    default: 2,
    min: 1,
    description: 'Number of correct guesses needed to advance 1 tier'
  },
  
  // ===== STATUS (MANUAL CONTROL) =====
  isActive: {
    type: Boolean,
    default: false  // ✅ Admin will manually activate
  },
  isPublished: {
    type: Boolean,
    default: false  // ✅ Admin will manually publish
  },
  
  // ===== REWARDS CONFIGURATION =====
  tierRewards: [{
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
        refPath: 'tierRewards.rewards.type',
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
      }
    }]
  }],

  // ===== BONUS REWARDS =====
  completionRewards: [{
    type: {
      type: String,
      enum: ['shards', 'gems', 'card', 'title', 'banner', 'profilePhoto', 'background'],
      required: true
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'completionRewards.type',
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
    }
  }],

  // ===== STATS =====
  totalPlayers: {
    type: Number,
    default: 0
  },
  playersCompleted: {
    type: Number,
    default: 0
  },

  // ===== TIMESTAMPS =====
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

// ============================================================
// ✅ INDEXES
// ============================================================
seasonPassSchema.index({ seasonNumber: 1 });
seasonPassSchema.index({ isActive: 1 });
seasonPassSchema.index({ startDate: 1, endDate: 1 });
seasonPassSchema.index({ 'tierRewards.tier': 1 });

// ============================================================
// ✅ METHODS
// ============================================================

// Check if season pass is active (for users)
seasonPassSchema.methods.isActiveSeason = function() {
  const now = new Date();
  return this.isActive && 
         this.isPublished &&
         now >= this.startDate &&
         now <= this.endDate;
};

// Check if season pass has started
seasonPassSchema.methods.hasStarted = function() {
  return new Date() >= this.startDate;
};

// Check if season pass has ended
seasonPassSchema.methods.hasEnded = function() {
  return new Date() > this.endDate;
};

// Get time remaining
seasonPassSchema.methods.getTimeRemaining = function() {
  if (this.hasEnded()) return 0;
  return Math.max(0, this.endDate - new Date());
};

// Get time remaining in days/hours
seasonPassSchema.methods.getTimeRemainingFormatted = function() {
  const ms = this.getTimeRemaining();
  if (ms === 0) return 'Ended';
  
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  
  if (days > 0) {
    return `${days}d ${hours}h remaining`;
  }
  return `${hours}h remaining`;
};

// Get rewards for a specific tier
seasonPassSchema.methods.getTierRewards = function(tier) {
  const tierData = this.tierRewards.find(tr => tr.tier === tier);
  return tierData ? tierData.rewards : [];
};

// Get total correct guesses needed for a tier
seasonPassSchema.methods.getGuessesNeededForTier = function(tier) {
  return tier * this.correctGuessesPerTier;
};

// Get tier from correct guesses
seasonPassSchema.methods.getTierFromGuesses = function(correctGuesses) {
  const tier = Math.floor(correctGuesses / this.correctGuessesPerTier) + 1;
  return Math.min(tier, this.totalTiers);
};

// Get progress to next tier
seasonPassSchema.methods.getProgressToNextTier = function(correctGuesses) {
  const currentTier = this.getTierFromGuesses(correctGuesses);
  if (currentTier >= this.totalTiers) return 100;
  
  const guessesForCurrentTier = (currentTier - 1) * this.correctGuessesPerTier;
  const guessesForNextTier = currentTier * this.correctGuessesPerTier;
  const progress = ((correctGuesses - guessesForCurrentTier) / this.correctGuessesPerTier) * 100;
  
  return Math.min(100, Math.max(0, progress));
};

// ============================================================
// ✅ ADMIN METHODS (Manual Season Control)
// ============================================================

// Activate a season (deactivates all others)
seasonPassSchema.statics.activateSeason = async function(seasonNumber) {
  // Deactivate all other seasons
  await this.updateMany(
    { isActive: true },
    { isActive: false }
  );
  
  // Activate the selected season
  const season = await this.findOne({ seasonNumber });
  if (!season) {
    throw new Error('Season not found');
  }
  
  season.isActive = true;
  season.isPublished = true;
  await season.save();
  
  return season;
};

// Deactivate a season
seasonPassSchema.statics.deactivateSeason = async function(seasonNumber) {
  const season = await this.findOne({ seasonNumber });
  if (!season) {
    throw new Error('Season not found');
  }
  
  season.isActive = false;
  await season.save();
  
  return season;
};

// Get currently active season (admin/global)
seasonPassSchema.statics.getActiveSeasonAdmin = async function() {
  return this.findOne({ isActive: true, isPublished: true });
};

// Check if a season number exists
seasonPassSchema.statics.seasonExists = async function(seasonNumber) {
  const count = await this.countDocuments({ seasonNumber });
  return count > 0;
};

// Get all seasons with status
seasonPassSchema.statics.getAllSeasonsWithStatus = async function() {
  const seasons = await this.find({ isPublished: true })
    .sort({ seasonNumber: -1 });
  
  return seasons.map(season => ({
    ...season.toObject(),
    status: season.isActive ? '🟢 Active' : '🔴 Inactive',
    isCurrent: season.isActive
  }));
};

// ============================================================
// ✅ STATICS
// ============================================================

// Get active season pass (for users - only if active)
seasonPassSchema.statics.getActiveSeason = async function() {
  const now = new Date();
  return this.findOne({
    isActive: true,
    isPublished: true,
    startDate: { $lte: now },
    endDate: { $gte: now }
  }).sort({ seasonNumber: -1 });
};

// Get latest season pass (even if ended)
seasonPassSchema.statics.getLatestSeason = async function() {
  return this.findOne({ isPublished: true })
    .sort({ seasonNumber: -1 });
};

// Get season pass by season number
seasonPassSchema.statics.getBySeasonNumber = async function(seasonNumber) {
  return this.findOne({ seasonNumber });
};

// Get all published seasons
seasonPassSchema.statics.getAllPublished = async function() {
  return this.find({ isPublished: true })
    .sort({ seasonNumber: -1 });
};

// ============================================================
// ✅ PRE-SAVE: Update timestamps
// ============================================================
seasonPassSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Auto-set name if not provided
  if (!this.name || this.name === 'Season Pass') {
    this.name = `Season ${this.seasonNumber}`;
  }
  
  next();
});

module.exports = mongoose.model('SeasonPass', seasonPassSchema);