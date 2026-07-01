const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ===== HELPER: Sanitize input =====
function sanitizeInput(str) {
  if (!str) return '';
  return str.replace(/[<>]/g, '').trim();
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
    currentSeason: { type: Number, default: 1, min: 1 },
    seasonWins: { type: Number, default: 0, min: 0 },
    seasonPlayed: { type: Number, default: 0, min: 0 },
    seasonStreak: { type: Number, default: 0, min: 0 }
  },
  // ===== SEASON HISTORY =====
  seasonHistory: [{
    season: { type: Number, required: true, min: 1 },
    wins: { type: Number, default: 0, min: 0 },
    streak: { type: Number, default: 0, min: 0 },
    rank: { type: Number, default: null, min: 1 },
    isWinner: { type: Boolean, default: false }
  }],
  // ===== SHARDS =====
  shards: {
    type: Number,
    default: 0,
    min: 0
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

// ===== PRE-SAVE: SANITIZE USERNAME =====
userSchema.pre('save', function(next) {
  if (this.username) {
    this.username = sanitizeInput(this.username);
  }
  if (this.email) {
    this.email = this.email.toLowerCase().trim();
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

module.exports = mongoose.model('User', userSchema);