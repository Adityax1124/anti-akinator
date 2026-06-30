const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['player', 'admin'],
    default: 'player'
  },
  // ===== LIFETIME STATS =====
  stats: {
    gamesPlayed: { type: Number, default: 0 },
    gamesWon: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    winStreak: { type: Number, default: 0 }
  },
  // ===== SEASON STATS =====
  seasonStats: {
    currentSeason: { type: Number, default: 1 },
    seasonWins: { type: Number, default: 0 },
    seasonPlayed: { type: Number, default: 0 },
    seasonStreak: { type: Number, default: 0 }
  },
  // ===== SEASON HISTORY =====
  seasonHistory: [{
    season: { type: Number, required: true },
    wins: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    rank: { type: Number, default: null },
    isWinner: { type: Boolean, default: false }
  }],
  // ===== SHARDS (Game Currency) =====
  shards: {
    type: Number,
    default: 0
  },
  // ===== ACHIEVEMENTS =====
  totalGuesses: { type: Number, default: 0 },
  animeGuesses: { type: Map, of: Number, default: {} },
  achievements: {
    banners: [{
      bannerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Banner' },
      unlockedAt: { type: Date, default: Date.now },
      isEquipped: { type: Boolean, default: false }
    }],
    titles: [{
      titleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Title' },
      unlockedAt: { type: Date, default: Date.now },
      isEquipped: { type: Boolean, default: false }
    }],
    profilePhotos: [{
      photoId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProfilePhoto' },
      unlockedAt: { type: Date, default: Date.now },
      isEquipped: { type: Boolean, default: false }
    }]
  },
  equipped: {
    banner: { type: mongoose.Schema.Types.ObjectId, ref: 'Banner', default: null },
    title: { type: mongoose.Schema.Types.ObjectId, ref: 'Title', default: null },
    profilePhoto: { type: mongoose.Schema.Types.ObjectId, ref: 'ProfilePhoto', default: null }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);