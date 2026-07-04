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
  // ✅ NEW - GEMS (Currency for Card Upgrades)
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
    // ✅ Base Power (from character)
    basePower: {
      type: Number,
      required: true,
      min: 0.5,
      max: 50
    },
    // ✅ Current Power (after upgrades)
    currentPower: {
      type: Number,
      required: true,
      min: 0.5,
      max: 50
    },
    // ✅ Card Level (1-10)
    level: {
      type: Number,
      default: 1,
      min: 1,
      max: 10
    },
    // ✅ Element (Fire/Water/Wind/Earth)
    element: {
      type: String,
      enum: ['Fire', 'Water', 'Wind', 'Earth'],
      default: 'Fire'
    },
    // ✅ Rarity
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
    // Track if this card is from stealing
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
  // ===== 🏆 MATCH STATS =====
  // ============================================================
  matchStats: {
    matchesPlayed: { type: Number, default: 0 },
    matchesWon: { type: Number, default: 0 },
    matchesLost: { type: Number, default: 0 },
    cardsStolen: { type: Number, default: 0 },
    cardsLost: { type: Number, default: 0 },
    totalRoundsWon: { type: Number, default: 0 },
    // ✅ Gems earned from matches
    gemsEarned: { type: Number, default: 0 }
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
// ✅ NEW: Card indexes
userSchema.index({ 'cards.characterId': 1 });
userSchema.index({ 'cards.currentPower': -1 });
userSchema.index({ 'cards.level': -1 });

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
// ✅ CARD COLLECTION METHODS (UPDATED)
// ============================================================
userSchema.methods.addCard = function(character) {
  // Check if card already exists
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

// ✅ NEW: Upgrade Card
userSchema.methods.upgradeCard = function(characterId) {
  const card = this.cards.find(c => 
    c.characterId.toString() === characterId.toString()
  );
  
  if (!card) return { success: false, message: 'Card not found' };
  if (card.level >= 10) return { success: false, message: 'Card already at max level' };
  
  // Calculate upgrade cost based on level
  const upgradeCost = getUpgradeCost(card.level);
  
  if (this.gems < upgradeCost) {
    return { success: false, message: `Need ${upgradeCost} gems, have ${this.gems}` };
  }
  
  // Deduct gems
  this.gems -= upgradeCost;
  
  // Increase level
  card.level += 1;
  
  // Calculate new power (based on level)
  const powerIncrease = getPowerIncrease(card.level);
  card.currentPower += powerIncrease;
  
  return { 
    success: true, 
    message: `Card upgraded to level ${card.level}!`,
    newLevel: card.level,
    newPower: card.currentPower,
    gemsRemaining: this.gems
  };
};

// ✅ NEW: Get Upgrade Cost
function getUpgradeCost(level) {
  const costs = {
    1: 10,
    2: 15,
    3: 20,
    4: 30,
    5: 40,
    6: 55,
    7: 70,
    8: 90,
    9: 120
  };
  return costs[level] || 120;
}

// ✅ NEW: Get Power Increase
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

// ===== REFERRAL METHODS =====
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

// ===== STATICS =====
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

module.exports = mongoose.model('User', userSchema);