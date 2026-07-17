// /backend/models/BlurGameSession.js
const mongoose = require('mongoose');

const blurGameSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  characterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Character',
    required: [true, 'Character ID is required']
  },
  characterName: {
    type: String,
    required: [true, 'Character name is required'],
    trim: true
  },
  anime: {
    type: String,
    required: [true, 'Anime name is required'],
    trim: true
  },
  imageUrl: {
    type: String,
    required: [true, 'Image URL is required']
  },
  isCompleted: {
    type: Boolean,
    default: false,
    index: true
  },
  isCorrect: {
    type: Boolean,
    default: false
  },
  guessedAt: {
    type: Date,
    default: null
  },
  timeTaken: {
    type: Number,
    default: null
  },
  wonCard: {
    type: Boolean,
    default: false
  },
  wrongGuesses: {
    type: Number,
    default: 0
  },
  maxGuesses: {
    type: Number,
    default: 3
  },
  guessedNames: {
    type: [String],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for faster queries
blurGameSessionSchema.index({ userId: 1, createdAt: -1 });
blurGameSessionSchema.index({ userId: 1, isCompleted: 1 });
blurGameSessionSchema.index({ createdAt: 1 });

// ============================================================
// STATIC METHODS
// ============================================================

blurGameSessionSchema.statics.getTotalGamesPlayed = async function(userId) {
  return await this.countDocuments({ userId: userId, isCompleted: true });
};

blurGameSessionSchema.statics.getTotalGamesWon = async function(userId) {
  return await this.countDocuments({ userId: userId, isCompleted: true, isCorrect: true });
};

blurGameSessionSchema.statics.getTotalCardsWon = async function(userId) {
  return await this.countDocuments({ userId: userId, wonCard: true });
};

blurGameSessionSchema.statics.getBestTime = async function(userId) {
  const best = await this.findOne({ 
    userId: userId, 
    isCorrect: true,
    timeTaken: { $ne: null }
  })
  .sort({ timeTaken: 1 })
  .select('timeTaken');
  
  return best ? best.timeTaken : null;
};

blurGameSessionSchema.statics.getDailyChallenge = async function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const Character = mongoose.model('Character');
  const characters = await Character.find({ image: { $ne: '' } });
  
  if (characters.length === 0) return null;
  
  const dateString = today.toISOString().split('T')[0];
  const seed = dateString.split('-').join('');
  const randomIndex = parseInt(seed.slice(-2)) % characters.length;
  
  return characters[randomIndex];
};

blurGameSessionSchema.statics.hasCompletedToday = async function(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const game = await this.findOne({
    userId: userId,
    createdAt: { $gte: today },
    isCompleted: true
  });
  
  return !!game;
};

// ============================================================
// INSTANCE METHODS
// ============================================================

blurGameSessionSchema.methods.isActive = function() {
  if (this.isCompleted) return false;
  
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this.createdAt > fiveMinutesAgo;
};

blurGameSessionSchema.methods.getTimeRemaining = function() {
  if (this.isCompleted) return 0;
  
  const fiveMinutes = 5 * 60;
  const elapsed = Math.floor((Date.now() - this.createdAt.getTime()) / 1000);
  return Math.max(0, fiveMinutes - elapsed);
};

blurGameSessionSchema.methods.getBlurPercentage = function() {
  if (this.isCompleted) return 0;
  
  const elapsed = Math.floor((Date.now() - this.createdAt.getTime()) / 1000);
  const totalTime = 90;
  
  const blurAmount = Math.max(0, 99 - (elapsed / totalTime) * 99);
  return Math.min(99, Math.round(blurAmount));
};

// ✅ EXACT MATCH ONLY - No partial matching
blurGameSessionSchema.methods.checkGuess = function(guess) {
  const normalize = (str) => {
    if (!str) return '';
    return str.toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };
  
  const normalizedGuess = normalize(guess);
  const normalizedName = normalize(this.characterName);
  
  return normalizedGuess === normalizedName;
};

blurGameSessionSchema.methods.hasGuessed = function(guess) {
  const normalize = (str) => {
    if (!str) return '';
    return str.toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };
  
  const normalizedGuess = normalize(guess);
  return this.guessedNames.some(name => normalize(name) === normalizedGuess);
};

blurGameSessionSchema.methods.getRemainingGuesses = function() {
  return Math.max(0, this.maxGuesses - this.wrongGuesses);
};

// ✅ RENAMED to avoid conflict with virtual
blurGameSessionSchema.methods.hasExceededMaxGuesses = function() {
  return this.wrongGuesses >= this.maxGuesses;
};

blurGameSessionSchema.methods.completeGame = async function(guess, timeTaken) {
  this.isCorrect = this.checkGuess(guess);
  this.guessedAt = new Date();
  this.timeTaken = timeTaken || Math.floor((Date.now() - this.createdAt.getTime()) / 1000);
  this.isCompleted = true;
  
  if (this.isCorrect && this.timeTaken <= 30) {
    this.wonCard = true;
  }
  
  await this.save();
  return this;
};

blurGameSessionSchema.methods.addWrongGuess = async function(guess) {
  this.wrongGuesses += 1;
  this.guessedNames.push(guess);
  await this.save();
  return this;
};

// ============================================================
// VIRTUALS
// ============================================================

blurGameSessionSchema.virtual('timeTakenMinutes').get(function() {
  if (!this.timeTaken) return null;
  return (this.timeTaken / 60).toFixed(2);
});

blurGameSessionSchema.virtual('formattedTime').get(function() {
  if (!this.timeTaken) return '--';
  
  const minutes = Math.floor(this.timeTaken / 60);
  const seconds = this.timeTaken % 60;
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
});

blurGameSessionSchema.virtual('blurAtCompletion').get(function() {
  if (!this.isCompleted) return null;
  
  const elapsed = Math.floor((this.guessedAt - this.createdAt) / 1000);
  const totalTime = 90;
  const blurAmount = Math.max(0, 99 - (elapsed / totalTime) * 99);
  return Math.min(99, Math.round(blurAmount));
});

blurGameSessionSchema.virtual('remainingGuesses').get(function() {
  return Math.max(0, this.maxGuesses - this.wrongGuesses);
});

// ✅ Renamed virtual to avoid conflict
blurGameSessionSchema.virtual('isMaxGuessesReached').get(function() {
  return this.wrongGuesses >= this.maxGuesses;
});

blurGameSessionSchema.set('toJSON', { virtuals: true });
blurGameSessionSchema.set('toObject', { virtuals: true });

const BlurGameSession = mongoose.model('BlurGameSession', blurGameSessionSchema);

module.exports = BlurGameSession;