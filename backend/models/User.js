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
// This ensures all users start with the same season
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
  // ===== SEASON STATS (FIXED) =====
  // ✅ Use static default instead of dynamic function
  seasonStats: {
    currentSeason: { 
      type: Number, 
      default: DEFAULT_SEASON,  // ✅ STATIC default
      min: 1 
    },
    seasonWins: { type: Number, default: 0, min: 0 },
    seasonPlayed: { type: Number, default: 0, min: 0 },
    seasonStreak: { type: Number, default: 0, min: 0 }
  },
  // ===== SEASON HISTORY (FIXED - more detailed) =====
  seasonHistory: [{
    season: { type: Number, required: true, min: 1 },
    wins: { type: Number, default: 0, min: 0 },
    streak: { type: Number, default: 0, min: 0 },
    played: { type: Number, default: 0, min: 0 },  // ✅ NEW: Track games played that season
    rank: { type: Number, default: null, min: 1 },
    isWinner: { type: Boolean, default: false },
    endedAt: { type: Date, default: Date.now }  // ✅ NEW: When season ended
  }],
  // ===== SHARDS =====
  shards: {
    type: Number,
    default: 0,
    min: 0
  },
  // ===== PURCHASED ITEMS (SHOP SYSTEM) =====
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

  // =============================================
  // ===== 🔗 REFERRAL SYSTEM =====
  // =============================================
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

  // =============================================
  // ===== 🛡️ DEVICE FINGERPRINT (Anti-Spam) =====
  // =============================================
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
  // ===== CACHE BUSTING =====
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
// ===== REFERRAL INDEXES =====
userSchema.index({ referralCode: 1 });
userSchema.index({ referredBy: 1 });
// ===== DEVICE FINGERPRINT INDEX =====
userSchema.index({ deviceFingerprint: 1 });

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
  
  // ===== ✅ FIX: Ensure seasonStats.currentSeason is set =====
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
  
  // ===== UPDATE UPDATEDAT =====
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

// ===== ✅ NEW: Get users by season =====
userSchema.statics.findBySeason = function(season) {
  return this.find({ 'seasonStats.currentSeason': season });
};

// ===== ✅ NEW: Get season leaderboard =====
userSchema.statics.getSeasonLeaderboard = function(season, limit = 50) {
  return this.find({ 'seasonStats.currentSeason': season })
    .select('username seasonStats shards equipped.profilePhoto purchasedItems')
    .populate('equipped.profilePhoto', 'imageUrl')
    .sort({ 
      'seasonStats.seasonStreak': -1,
      'seasonStats.seasonWins': -1,
      'seasonStats.seasonPlayed': -1
    })
    .limit(limit);
};

// ===== ✅ NEW: Find by referral code =====
userSchema.statics.findByReferralCode = function(code) {
  return this.findOne({ referralCode: code.toUpperCase().trim() });
};

// ===== ✅ NEW: Get top referrers =====
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

// ===== ✅ NEW: Find by device fingerprint =====
userSchema.statics.findByDeviceFingerprint = function(fingerprint) {
  return this.findOne({ deviceFingerprint: fingerprint });
};

// ===== ✅ NEW: Check if device is already registered =====
userSchema.statics.isDeviceRegistered = async function(fingerprint) {
  if (!fingerprint) return false;
  const user = await this.findOne({ deviceFingerprint: fingerprint });
  return !!user;
};

module.exports = mongoose.model('User', userSchema);