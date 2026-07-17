// /backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ===== HELPER: Get Current Season =====
function getCurrentSeason() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return parseInt(`${year}${month.toString().padStart(2, '0')}`);
}

// ===== HELPER: Sanitize input =====
function sanitizeInput(str) {
  if (!str) return '';
  return str.replace(/[<>]/g, '').trim();
}

// ===== ✅ FIX: Use static default season =====
const DEFAULT_SEASON = getCurrentSeason();

// ============================================================
// ✅ HELPER: Get Upgrade Cost based on Rarity and Level
// ============================================================
function getUpgradeCost(rarity, level) {
  const baseCosts = {
    'Common': 10,
    'Uncommon': 40,
    'Rare': 85,
    'Epic': 200,
    'Legendary': 450
  };
  
  const base = baseCosts[rarity] || 10;
  const multiplier = 1.3; // 30% increase per level
  
  if (level >= 10) return 0;
  return Math.round(base * Math.pow(multiplier, level - 1));
}

// ============================================================
// ✅ HELPER: Get Power Increase based on Level
// ============================================================
function getPowerIncrease(level) {
  const increases = {
    1: 1,
    2: 1,
    3: 2,
    4: 2,
    5: 2,
    6: 3,
    7: 3,
    8: 4,
    9: 4,
    10: 5
  };
  return increases[level] || 5;
}

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [20, 'Username must be less than 20 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
    set: sanitizeInput
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'],
    set: (v) => v.toLowerCase().trim()
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  role: {
    type: String,
    enum: ['player', 'admin'],
    default: 'player',
    set: (v) => v === 'admin' ? 'admin' : 'player'
  },
  
  // ===== LIFETIME STATS =====
  stats: {
    gamesPlayed: { type: Number, default: 0, min: 0 },
    gamesWon: { type: Number, default: 0, min: 0 },
    totalQuestions: { type: Number, default: 0, min: 0 },
    winStreak: { type: Number, default: 0, min: 0 }
  },
  
  // ===== SEASON STATS =====
  seasonStats: {
    currentSeason: { 
      type: Number, 
      default: DEFAULT_SEASON,
      min: 1 
    },
    seasonWins: { type: Number, default: 0, min: 0 },
    seasonPlayed: { type: Number, default: 0, min: 0 },
    seasonStreak: { type: Number, default: 0, min: 0 }
  },
  
  // ===== SEASON HISTORY =====
  seasonHistory: [{
    season: { type: Number, required: true, min: 1 },
    wins: { type: Number, default: 0, min: 0 },
    streak: { type: Number, default: 0, min: 0 },
    played: { type: Number, default: 0, min: 0 },
    rank: { type: Number, default: null, min: 1 },
    isWinner: { type: Boolean, default: false },
    endedAt: { type: Date, default: Date.now }
  }],
  
  // ============================================================
  // ✅ GEMS (Currency for Card Upgrades)
  // ============================================================
  gems: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // ===== SHARDS =====
  shards: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // ===== PURCHASED ITEMS =====
  purchasedItems: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'ShopItem',
    default: []
  },
  
  // ============================================================
  // ✅ NEW: PAYMENT TRANSACTION HISTORY
  // ============================================================
  transactionHistory: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  }],
  
  // ============================================================
  // ✅ UPDATED: SEASON PASS WITH PAYMENT INFO
  // ============================================================
  seasonPass: {
    active: {
      type: Boolean,
      default: false
    },
    seasonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SeasonPass',
      default: null
    },
    purchasedAt: {
      type: Date,
      default: null
    },
    expiresAt: {
      type: Date,
      default: null
    },
    currentTier: {
      type: Number,
      default: 1,
      min: 1,
      max: 100
    },
    correctGuesses: {
      type: Number,
      default: 0,
      min: 0
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    unlockedTiers: [{
      tier: {
        type: Number,
        required: true,
        min: 1,
        max: 100
      },
      unlockedAt: {
        type: Date,
        default: Date.now
      }
    }],
    claimedRewards: [{
      tier: {
        type: Number,
        required: true,
        min: 1,
        max: 100
      },
      rewardIndex: {
        type: Number,
        required: true
      },
      claimedAt: {
        type: Date,
        default: Date.now
      }
    }],
    isCompleted: {
      type: Boolean,
      default: false
    },
    completedAt: {
      type: Date,
      default: null
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  },
  
  // ===== ACHIEVEMENTS =====
  totalGuesses: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  animeGuesses: { 
    type: Map, 
    of: Number, 
    default: {},
    set: (v) => {
      const sanitized = new Map();
      if (v instanceof Map) {
        for (const [key, value] of v) {
          sanitized.set(sanitizeInput(key), Math.max(0, value));
        }
        return sanitized;
      }
      return v;
    }
  },
  achievements: {
    banners: [{
      bannerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Banner',
        required: true 
      },
      unlockedAt: { 
        type: Date, 
        default: Date.now 
      },
      isEquipped: { 
        type: Boolean, 
        default: false 
      }
    }],
    titles: [{
      titleId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Title',
        required: true 
      },
      unlockedAt: { 
        type: Date, 
        default: Date.now 
      },
      isEquipped: { 
        type: Boolean, 
        default: false 
      }
    }],
    profilePhotos: [{
      photoId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'ProfilePhoto',
        required: true 
      },
      unlockedAt: { 
        type: Date, 
        default: Date.now 
      },
      isEquipped: { 
        type: Boolean, 
        default: false 
      }
    }],
    profileBackgrounds: [{
      backgroundId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'ProfileBackground',
        required: true 
      },
      unlockedAt: { 
        type: Date, 
        default: Date.now 
      },
      isEquipped: { 
        type: Boolean, 
        default: false 
      }
    }]
  },
  equipped: {
    banner: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Banner', 
      default: null 
    },
    title: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Title', 
      default: null 
    },
    profilePhoto: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'ProfilePhoto', 
      default: null 
    },
    profileBackground: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'ProfileBackground', 
      default: null 
    }
  },

  // ============================================================
  // ===== 🃏 CARD COLLECTION (For Card Battles) =====
  // ============================================================
  cards: [{
    characterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Character',
      required: true
    },
    characterName: {
      type: String,
      required: true
    },
    basePower: {
      type: Number,
      required: true,
      min: 0.5,
      max: 100
    },
    currentPower: {
      type: Number,
      required: true,
      min: 0.5,
      max: 200
    },
    level: {
      type: Number,
      default: 1,
      min: 1,
      max: 10
    },
    element: {
      type: String,
      enum: ['Fire', 'Water', 'Wind', 'Earth'],
      default: 'Fire'
    },
    rarity: {
      type: String,
      enum: ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'],
      default: 'Common'
    },
    image: {
      type: String,
      default: ''
    },
    unlockedAt: {
      type: Date,
      default: Date.now
    },
    stolenFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    stolenAt: {
      type: Date,
      default: null
    }
  }],

  // ============================================================
  // ===== ⚔️ WAR CARD (Selected for Clan Wars) =====
  // ============================================================
  warCard: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Character',
    default: null
  },

  // ============================================================
  // ===== 🏆 MATCH STATS =====
  // ============================================================
  matchStats: {
    matchesPlayed: { type: Number, default: 0 },
    matchesWon: { type: Number, default: 0 },
    matchesLost: { type: Number, default: 0 },
    cardsStolen: { type: Number, default: 0 },
    cardsLost: { type: Number, default: 0 },
    totalRoundsWon: { type: Number, default: 0 },
    gemsEarned: { type: Number, default: 0 }
  },

  // ============================================================
  // ===== 🛡️ CLAN SYSTEM =====
  // ============================================================
  clanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clan',
    default: null
  },

  // ============================================================
  // ===== 🔗 REFERRAL SYSTEM =====
  // ============================================================
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true,
    trim: true
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  referrals: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  referralStats: {
    totalReferrals: { type: Number, default: 0, min: 0 },
    shardsEarned: { type: Number, default: 0, min: 0 },
    completedReferrals: { type: Number, default: 0, min: 0 }
  },

  // ============================================================
  // ===== 🛡️ DEVICE FINGERPRINT =====
  // ============================================================
  deviceFingerprint: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  ipAddress: {
    type: String,
    default: null
  },

  // ============================================================
  // ✅ BLUR GAME STATS (NEW)
  // ============================================================
  blurGameStats: {
    gamesPlayed: {
      type: Number,
      default: 0,
      min: 0
    },
    gamesWon: {
      type: Number,
      default: 0,
      min: 0
    },
    bestTime: {
      type: Number,
      default: null,
      min: 0
    },
    totalCardsWon: {
      type: Number,
      default: 0,
      min: 0
    }
  },

  // ===== SECURITY =====
  lastLogin: {
    type: Date,
    default: null
  },
  failedLoginAttempts: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  },
  lockedUntil: {
    type: Date,
    default: null
  },
  passwordChangedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: {
    transform: (doc, ret) => {
      delete ret.password;
      delete ret.__v;
      delete ret.failedLoginAttempts;
      delete ret.lockedUntil;
      delete ret.passwordChangedAt;
      return ret;
    }
  },
  toObject: {
    transform: (doc, ret) => {
      delete ret.password;
      delete ret.__v;
      delete ret.failedLoginAttempts;
      delete ret.lockedUntil;
      delete ret.passwordChangedAt;
      return ret;
    }
  }
});

// ===== INDEXES =====
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ 'seasonStats.currentSeason': 1 });
userSchema.index({ 'seasonStats.seasonWins': -1 });
userSchema.index({ 'seasonStats.seasonStreak': -1 });
userSchema.index({ 'seasonStats.seasonPlayed': -1 });
userSchema.index({ 'seasonHistory.season': -1 });
userSchema.index({ referralCode: 1 });
userSchema.index({ referredBy: 1 });
userSchema.index({ deviceFingerprint: 1 });
// ✅ Card indexes
userSchema.index({ 'cards.characterId': 1 });
userSchema.index({ 'cards.currentPower': -1 });
userSchema.index({ 'cards.level': -1 });
// ✅ Clan index
userSchema.index({ clanId: 1 });
// ✅ War card index
userSchema.index({ warCard: 1 });
// ✅ Season Pass index
userSchema.index({ 'seasonPass.seasonId': 1 });
userSchema.index({ 'seasonPass.currentTier': -1 });
userSchema.index({ 'seasonPass.active': 1 });
userSchema.index({ 'seasonPass.expiresAt': 1 });
// ✅ Profile Background index
userSchema.index({ 'equipped.profileBackground': 1 });
userSchema.index({ 'achievements.profileBackgrounds.backgroundId': 1 });
// ✅ Transaction history index
userSchema.index({ 'transactionHistory': 1 });
// ✅ Blur Game index
userSchema.index({ 'blurGameStats.gamesPlayed': -1 });
userSchema.index({ 'blurGameStats.gamesWon': -1 });

// ===== PRE-SAVE: HASH PASSWORD =====
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    this.passwordChangedAt = new Date();
    next();
  } catch (error) {
    next(error);
  }
});

// ===== PRE-SAVE: SANITIZE USERNAME & SET SEASON =====
userSchema.pre('save', function(next) {
  if (this.username) {
    this.username = sanitizeInput(this.username);
  }
  if (this.email) {
    this.email = this.email.toLowerCase().trim();
  }
  
  if (!this.seasonStats) {
    this.seasonStats = {
      currentSeason: DEFAULT_SEASON,
      seasonWins: 0,
      seasonPlayed: 0,
      seasonStreak: 0
    };
  } else if (!this.seasonStats.currentSeason) {
    this.seasonStats.currentSeason = DEFAULT_SEASON;
  }
  
  // Ensure seasonPass has default values
  if (!this.seasonPass) {
    this.seasonPass = {
      active: false,
      seasonId: null,
      purchasedAt: null,
      expiresAt: null,
      currentTier: 1,
      correctGuesses: 0,
      progress: 0,
      unlockedTiers: [],
      claimedRewards: [],
      isCompleted: false,
      completedAt: null,
      joinedAt: new Date()
    };
  }
  
  // Ensure blurGameStats has default values
  if (!this.blurGameStats) {
    this.blurGameStats = {
      gamesPlayed: 0,
      gamesWon: 0,
      bestTime: null,
      totalCardsWon: 0
    };
  }
  
  this.updatedAt = new Date();
  next();
});

// ===== METHODS =====
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.isLocked = function() {
  if (!this.lockedUntil) return false;
  return new Date() < this.lockedUntil;
};

userSchema.methods.incrementFailedAttempts = async function() {
  this.failedLoginAttempts += 1;
  if (this.failedLoginAttempts >= 10) {
    this.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
  }
  await this.save();
};

userSchema.methods.resetFailedAttempts = async function() {
  this.failedLoginAttempts = 0;
  this.lockedUntil = null;
  this.lastLogin = new Date();
  await this.save();
};

// ============================================================
// ✅ PAYMENT & SHARD METHODS
// ============================================================

// Add shards to user
userSchema.methods.addShards = function(amount) {
  if (amount < 0) return { success: false, message: 'Amount must be positive' };
  this.shards += amount;
  return { success: true, message: `Added ${amount} shards`, newBalance: this.shards };
};

// Remove shards from user
userSchema.methods.removeShards = function(amount) {
  if (amount < 0) return { success: false, message: 'Amount must be positive' };
  if (this.shards < amount) {
    return { success: false, message: 'Insufficient shards' };
  }
  this.shards -= amount;
  return { success: true, message: `Removed ${amount} shards`, newBalance: this.shards };
};

// Check if user has enough shards
userSchema.methods.hasEnoughShards = function(amount) {
  return this.shards >= amount;
};

// Add transaction to history
userSchema.methods.addTransaction = function(transactionId) {
  if (!this.transactionHistory) {
    this.transactionHistory = [];
  }
  this.transactionHistory.push(transactionId);
  return this;
};

// Get transaction history
userSchema.methods.getTransactionHistory = async function() {
  const Transaction = mongoose.model('Transaction');
  return await Transaction.find({
    _id: { $in: this.transactionHistory }
  }).sort({ createdAt: -1 });
};

// Get pending transactions
userSchema.methods.getPendingTransactions = async function() {
  const Transaction = mongoose.model('Transaction');
  return await Transaction.find({
    _id: { $in: this.transactionHistory },
    status: 'pending'
  }).sort({ createdAt: -1 });
};

// ============================================================
// ✅ SEASON PASS METHODS (UPDATED)
// ============================================================

// Activate season pass
userSchema.methods.activateSeasonPass = function(seasonId, durationDays = 30) {
  this.seasonPass.active = true;
  this.seasonPass.seasonId = seasonId;
  this.seasonPass.purchasedAt = new Date();
  this.seasonPass.expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
  this.seasonPass.currentTier = 1;
  this.seasonPass.correctGuesses = 0;
  this.seasonPass.progress = 0;
  this.seasonPass.unlockedTiers = [];
  this.seasonPass.claimedRewards = [];
  this.seasonPass.isCompleted = false;
  this.seasonPass.completedAt = null;
  this.seasonPass.joinedAt = new Date();
  
  return { 
    success: true, 
    message: 'Season pass activated!',
    expiresAt: this.seasonPass.expiresAt
  };
};

// Check if season pass is active
userSchema.methods.isSeasonPassActive = function() {
  if (!this.seasonPass.active) return false;
  if (!this.seasonPass.expiresAt) return false;
  return new Date() < this.seasonPass.expiresAt;
};

// Check if season pass is expired
userSchema.methods.isSeasonPassExpired = function() {
  if (!this.seasonPass.expiresAt) return true;
  return new Date() >= this.seasonPass.expiresAt;
};

// Get season pass status
userSchema.methods.getSeasonPassStatus = function() {
  const isActive = this.isSeasonPassActive();
  const isExpired = this.isSeasonPassExpired();
  
  return {
    active: isActive,
    expired: isExpired,
    expiresAt: this.seasonPass.expiresAt,
    currentTier: this.seasonPass.currentTier,
    progress: this.seasonPass.progress,
    isCompleted: this.seasonPass.isCompleted,
    daysRemaining: isActive ? Math.ceil((this.seasonPass.expiresAt - new Date()) / (1000 * 60 * 60 * 24)) : 0
  };
};

userSchema.methods.addCorrectGuess = function(seasonPass) {
  if (!this.isSeasonPassActive()) {
    return { success: false, message: 'Season pass is not active' };
  }
  
  this.seasonPass.correctGuesses += 1;
  
  const newTier = Math.floor(this.seasonPass.correctGuesses / seasonPass.correctGuessesPerTier) + 1;
  const finalTier = Math.min(newTier, seasonPass.totalTiers);
  
  const tierAdvanced = finalTier > this.seasonPass.currentTier;
  
  this.seasonPass.currentTier = finalTier;
  this.seasonPass.progress = seasonPass.getProgressToNextTier ? 
    seasonPass.getProgressToNextTier(this.seasonPass.correctGuesses) : 
    Math.round((this.seasonPass.correctGuesses % seasonPass.correctGuessesPerTier) / seasonPass.correctGuessesPerTier * 100);
  
  if (finalTier >= seasonPass.totalTiers && !this.seasonPass.isCompleted) {
    this.seasonPass.isCompleted = true;
    this.seasonPass.completedAt = new Date();
  }
  
  if (tierAdvanced) {
    for (let i = this.seasonPass.currentTier; i <= finalTier; i++) {
      const alreadyUnlocked = this.seasonPass.unlockedTiers.some(t => t.tier === i);
      if (!alreadyUnlocked) {
        this.seasonPass.unlockedTiers.push({ tier: i, unlockedAt: new Date() });
      }
    }
  }
  
  return {
    success: true,
    newTier: this.seasonPass.currentTier,
    tierAdvanced,
    progress: this.seasonPass.progress,
    isCompleted: this.seasonPass.isCompleted,
    correctGuesses: this.seasonPass.correctGuesses
  };
};

userSchema.methods.canClaimTierReward = function(tier, rewardIndex) {
  if (!this.isSeasonPassActive()) return false;
  
  const isUnlocked = this.seasonPass.unlockedTiers.some(t => t.tier === tier);
  if (!isUnlocked) return false;
  
  const alreadyClaimed = this.seasonPass.claimedRewards.some(
    r => r.tier === tier && r.rewardIndex === rewardIndex
  );
  
  return !alreadyClaimed;
};

userSchema.methods.claimReward = function(tier, rewardIndex) {
  if (!this.canClaimTierReward(tier, rewardIndex)) {
    return { success: false, message: 'Cannot claim this reward' };
  }
  
  this.seasonPass.claimedRewards.push({
    tier,
    rewardIndex,
    claimedAt: new Date()
  });
  
  return { success: true };
};

userSchema.methods.getUnlockedTiers = function() {
  return this.seasonPass.unlockedTiers.map(t => t.tier);
};

userSchema.methods.getClaimedRewards = function() {
  return this.seasonPass.claimedRewards;
};

userSchema.methods.isTierUnlocked = function(tier) {
  return this.seasonPass.unlockedTiers.some(t => t.tier === tier);
};

// ============================================================
// ✅ BLUR GAME METHODS (NEW)
// ============================================================

// Add blur game stat
userSchema.methods.addBlurGameStat = function(type, value = 1) {
  if (!this.blurGameStats) {
    this.blurGameStats = {
      gamesPlayed: 0,
      gamesWon: 0,
      bestTime: null,
      totalCardsWon: 0
    };
  }
  
  if (type === 'played') {
    this.blurGameStats.gamesPlayed += value;
  } else if (type === 'won') {
    this.blurGameStats.gamesWon += value;
  } else if (type === 'cardWon') {
    this.blurGameStats.totalCardsWon += value;
  } else if (type === 'bestTime') {
    if (!this.blurGameStats.bestTime || value < this.blurGameStats.bestTime) {
      this.blurGameStats.bestTime = value;
    }
  }
  
  return this;
};

// Get blur game stats
userSchema.methods.getBlurGameStats = function() {
  const stats = this.blurGameStats || {
    gamesPlayed: 0,
    gamesWon: 0,
    bestTime: null,
    totalCardsWon: 0
  };
  
  const winRate = stats.gamesPlayed > 0 
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) 
    : 0;
  
  return {
    ...stats,
    winRate
  };
};

// ============================================================
// ✅ WAR CARD METHODS
// ============================================================

userSchema.methods.selectWarCard = function(cardId) {
  const ownsCard = this.cards.some(c => 
    c.characterId.toString() === cardId.toString()
  );
  
  if (!ownsCard) {
    return { success: false, message: 'You don\'t own this card' };
  }
  
  this.warCard = cardId;
  return { success: true, message: 'War card selected!' };
};

userSchema.methods.getWarCard = function() {
  if (!this.warCard) return null;
  return this.cards.find(c => 
    c.characterId.toString() === this.warCard.toString()
  );
};

userSchema.methods.clearWarCard = function() {
  this.warCard = null;
  return { success: true, message: 'War card cleared' };
};

userSchema.methods.hasWarCard = function() {
  return this.warCard !== null;
};

// ============================================================
// ✅ CARD COLLECTION METHODS
// ============================================================
userSchema.methods.addCard = function(character) {
  const exists = this.cards.some(c => 
    c.characterId.toString() === character._id.toString()
  );
  
  if (exists) return false;
  
  this.cards.push({
    characterId: character._id,
    characterName: character.name,
    basePower: character.basePower || character.powerLevel || 25,
    currentPower: character.basePower || character.powerLevel || 25,
    level: 1,
    element: character.element || 'Fire',
    rarity: character.rarity || 'Common',
    image: character.image || '',
    unlockedAt: new Date()
  });
  
  return true;
};

userSchema.methods.removeCard = function(characterId) {
  const index = this.cards.findIndex(c => 
    c.characterId.toString() === characterId.toString()
  );
  
  if (index === -1) return false;
  
  this.cards.splice(index, 1);
  return true;
};

userSchema.methods.getCardById = function(characterId) {
  return this.cards.find(c => 
    c.characterId.toString() === characterId.toString()
  );
};

userSchema.methods.getCardByIndex = function(index) {
  if (index < 0 || index >= this.cards.length) return null;
  return this.cards[index];
};

userSchema.methods.getTopCards = function(limit = 10) {
  return this.cards
    .sort((a, b) => b.currentPower - a.currentPower)
    .slice(0, limit);
};

userSchema.methods.upgradeCard = function(characterId) {
  const card = this.cards.find(c => 
    c.characterId.toString() === characterId.toString()
  );
  
  if (!card) return { success: false, message: 'Card not found' };
  if (card.level >= 10) return { success: false, message: 'Card already at max level' };
  
  const rarity = card.rarity || 'Common';
  const upgradeCost = getUpgradeCost(rarity, card.level);
  
  if (this.gems < upgradeCost) {
    return { 
      success: false, 
      message: `Need ${upgradeCost} gems, have ${this.gems}`,
      gemsNeeded: upgradeCost,
      gemsAvailable: this.gems
    };
  }
  
  this.gems -= upgradeCost;
  card.level += 1;
  
  const powerIncrease = getPowerIncrease(card.level);
  card.currentPower += powerIncrease;
  
  return { 
    success: true, 
    message: `Card upgraded to level ${card.level}!`,
    newLevel: card.level,
    newPower: card.currentPower,
    powerIncrease: powerIncrease,
    gemsSpent: upgradeCost,
    gemsRemaining: this.gems,
    rarity: rarity
  };
};

// ============================================================
// ✅ GEMS METHODS
// ============================================================
userSchema.methods.addGems = function(amount) {
  if (amount < 0) return false;
  this.gems += amount;
  return true;
};

userSchema.methods.removeGems = function(amount) {
  if (amount < 0 || this.gems < amount) return false;
  this.gems -= amount;
  return true;
};

// ============================================================
// ✅ PROFILE BACKGROUND METHODS
// ============================================================

// Check if user owns a background
userSchema.methods.hasProfileBackground = function(backgroundId) {
  return this.achievements.profileBackgrounds.some(bg => 
    bg.backgroundId.toString() === backgroundId.toString()
  );
};

// Add background to user's collection
userSchema.methods.addProfileBackground = function(backgroundId) {
  if (this.hasProfileBackground(backgroundId)) {
    return { success: false, message: 'Already owns this background' };
  }
  
  this.achievements.profileBackgrounds.push({
    backgroundId: backgroundId,
    unlockedAt: new Date(),
    isEquipped: false
  });
  
  return { success: true, message: 'Background unlocked!' };
};

// Equip a background
userSchema.methods.equipProfileBackground = function(backgroundId) {
  if (!this.hasProfileBackground(backgroundId)) {
    return { success: false, message: 'You don\'t own this background' };
  }
  
  // Unequip all backgrounds
  this.achievements.profileBackgrounds.forEach(bg => {
    bg.isEquipped = false;
  });
  
  // Equip the selected one
  const bg = this.achievements.profileBackgrounds.find(b => 
    b.backgroundId.toString() === backgroundId.toString()
  );
  if (bg) {
    bg.isEquipped = true;
  }
  
  this.equipped.profileBackground = backgroundId;
  
  return { success: true, message: 'Background equipped!' };
};

// Unequip background (use default)
userSchema.methods.unequipProfileBackground = function() {
  this.achievements.profileBackgrounds.forEach(bg => {
    bg.isEquipped = false;
  });
  this.equipped.profileBackground = null;
  
  return { success: true, message: 'Background unequipped!' };
};

// Get equipped background
userSchema.methods.getEquippedProfileBackground = async function() {
  if (!this.equipped.profileBackground) {
    const ProfileBackground = mongoose.model('ProfileBackground');
    return await ProfileBackground.getDefaultBackground();
  }
  
  const ProfileBackground = mongoose.model('ProfileBackground');
  const bg = await ProfileBackground.findById(this.equipped.profileBackground);
  if (!bg || !bg.isActive) {
    return await ProfileBackground.getDefaultBackground();
  }
  return bg;
};

// ============================================================
// ✅ REFERRAL METHODS
// ============================================================
userSchema.methods.generateReferralCode = function() {
  if (this.referralCode) return this.referralCode;
  
  const prefix = this.username.slice(0, 4).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  this.referralCode = `${prefix}-${random}`;
  return this.referralCode;
};

userSchema.methods.getReferralStats = function() {
  return {
    totalReferrals: this.referralStats?.totalReferrals || 0,
    shardsEarned: this.referralStats?.shardsEarned || 0,
    completedReferrals: this.referralStats?.completedReferrals || 0
  };
};

// ============================================================
// ✅ STATICS
// ============================================================
userSchema.statics.findByUsernameOrEmail = function(identifier) {
  const sanitized = sanitizeInput(identifier);
  return this.findOne({
    $or: [
      { username: { $regex: new RegExp(`^${sanitized}$`, 'i') } },
      { email: sanitized.toLowerCase() }
    ]
  });
};

userSchema.statics.findBySeason = function(season) {
  return this.find({ 'seasonStats.currentSeason': season });
};

userSchema.statics.getSeasonLeaderboard = function(season, limit = 50) {
  return this.find({ 'seasonStats.currentSeason': season })
    .select('username seasonStats shards gems equipped.profilePhoto purchasedItems')
    .populate('equipped.profilePhoto', 'imageUrl')
    .sort({ 
      'seasonStats.seasonStreak': -1,
      'seasonStats.seasonWins': -1,
      'seasonStats.seasonPlayed': -1
    })
    .limit(limit);
};

userSchema.statics.findByReferralCode = function(code) {
  return this.findOne({ referralCode: code.toUpperCase().trim() });
};

userSchema.statics.getTopReferrers = function(limit = 10) {
  return this.find({
    'referralStats.totalReferrals': { $gt: 0 }
  })
  .select('username referralStats')
  .sort({
    'referralStats.totalReferrals': -1,
    'referralStats.shardsEarned': -1
  })
  .limit(limit);
};

userSchema.statics.findByDeviceFingerprint = function(fingerprint) {
  return this.findOne({ deviceFingerprint: fingerprint });
};

userSchema.statics.isDeviceRegistered = async function(fingerprint) {
  if (!fingerprint) return false;
  const user = await this.findOne({ deviceFingerprint: fingerprint });
  return !!user;
};

// ============================================================
// ✅ SEASON PASS STATICS
// ============================================================
userSchema.statics.getSeasonPassLeaderboard = async function(seasonId, limit = 50) {
  return this.find({ 
    'seasonPass.seasonId': seasonId,
    'seasonPass.active': true
  })
  .select('username seasonPass.currentTier seasonPass.correctGuesses seasonPass.isCompleted')
  .sort({ 
    'seasonPass.currentTier': -1,
    'seasonPass.correctGuesses': -1
  })
  .limit(limit);
};

userSchema.statics.getSeasonPassProgress = async function(userId, seasonId) {
  const user = await this.findById(userId)
    .select('seasonPass')
    .populate('seasonPass.seasonId');
  
  if (!user) return null;
  
  return user.seasonPass;
};

userSchema.statics.getActiveSeasonPassUsers = async function(seasonId) {
  return this.find({
    'seasonPass.seasonId': seasonId,
    'seasonPass.active': true,
    'seasonPass.expiresAt': { $gt: new Date() }
  }).select('username email seasonPass');
};

// ============================================================
// ✅ BLUR GAME STATICS (NEW)
// ============================================================

// Get blur game leaderboard
userSchema.statics.getBlurGameLeaderboard = function(limit = 50) {
  return this.find({
    'blurGameStats.gamesPlayed': { $gt: 0 }
  })
  .select('username blurGameStats')
  .sort({
    'blurGameStats.gamesWon': -1,
    'blurGameStats.winRate': -1,
    'blurGameStats.bestTime': 1
  })
  .limit(limit);
};

// Get blur game global stats
userSchema.statics.getBlurGameGlobalStats = async function() {
  const result = await this.aggregate([
    {
      $group: {
        _id: null,
        totalGamesPlayed: { $sum: '$blurGameStats.gamesPlayed' },
        totalGamesWon: { $sum: '$blurGameStats.gamesWon' },
        totalCardsWon: { $sum: '$blurGameStats.totalCardsWon' },
        players: { $sum: 1 }
      }
    }
  ]);
  
  return result[0] || {
    totalGamesPlayed: 0,
    totalGamesWon: 0,
    totalCardsWon: 0,
    players: 0
  };
};

module.exports = mongoose.model('User', userSchema);