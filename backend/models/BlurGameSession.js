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
    type: Number, // Time in seconds
    default: null
  },
  wonCard: {
    type: Boolean,
    default: false
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

// Get user's total games played
blurGameSessionSchema.statics.getTotalGamesPlayed = async function(userId) {
  return await this.countDocuments({ userId: userId, isCompleted: true });
};

// Get user's total games won
blurGameSessionSchema.statics.getTotalGamesWon = async function(userId) {
  return await this.countDocuments({ userId: userId, isCompleted: true, isCorrect: true });
};

// Get user's total cards won
blurGameSessionSchema.statics.getTotalCardsWon = async function(userId) {
  return await this.countDocuments({ userId: userId, wonCard: true });
};

// Get user's best time (fastest correct guess)
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

// Get today's daily challenge character
blurGameSessionSchema.statics.getDailyChallenge = async function() {
  // Get today's date (start of day)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get a random character with image (seeded by date)
  const Character = mongoose.model('Character');
  const characters = await Character.find({ image: { $ne: '' } });
  
  if (characters.length === 0) return null;
  
  // Use date as seed for consistent daily character
  const dateString = today.toISOString().split('T')[0];
  const seed = dateString.split('-').join('');
  const randomIndex = parseInt(seed.slice(-2)) % characters.length;
  
  return characters[randomIndex];
};

// Check if user already completed today's challenge
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

// Check if the game is still active (not expired)
blurGameSessionSchema.methods.isActive = function() {
  if (this.isCompleted) return false;
  
  // Game expires after 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this.createdAt > fiveMinutesAgo;
};

// Get time remaining in seconds
blurGameSessionSchema.methods.getTimeRemaining = function() {
  if (this.isCompleted) return 0;
  
  const fiveMinutes = 5 * 60; // 5 minutes in seconds
  const elapsed = Math.floor((Date.now() - this.createdAt.getTime()) / 1000);
  return Math.max(0, fiveMinutes - elapsed);
};

// Get blur percentage based on time elapsed
blurGameSessionSchema.methods.getBlurPercentage = function() {
  if (this.isCompleted) return 0;
  
  const elapsed = Math.floor((Date.now() - this.createdAt.getTime()) / 1000);
  const totalTime = 90; // 90 seconds total blur time
  
  // Calculate blur: starts at 99% blur, decreases to 0% over 90 seconds
  const blurAmount = Math.max(0, 99 - (elapsed / totalTime) * 99);
  return Math.min(99, Math.round(blurAmount));
};

// Check if guess is correct (with tolerance)
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
  
  // Exact match
  if (normalizedGuess === normalizedName) return true;
  
  // Check if guess is a substring of the name
  if (normalizedName.includes(normalizedGuess) && normalizedGuess.length >= 3) {
    return true;
  }
  
  // Check if all words in guess are in the name
  const guessWords = normalizedGuess.split(' ');
  const nameWords = normalizedName.split(' ');
  const allWordsMatch = guessWords.every(word => nameWords.includes(word));
  if (allWordsMatch && guessWords.length > 0) {
    return true;
  }
  
  return false;
};

// Mark game as completed with result
blurGameSessionSchema.methods.completeGame = async function(guess, timeTaken) {
  this.isCorrect = this.checkGuess(guess);
  this.guessedAt = new Date();
  this.timeTaken = timeTaken || Math.floor((Date.now() - this.createdAt.getTime()) / 1000);
  this.isCompleted = true;
  
  // Only win card if guessed correctly within 30 seconds
  if (this.isCorrect && this.timeTaken <= 30) {
    this.wonCard = true;
  }
  
  await this.save();
  return this;
};

// ============================================================
// VIRTUALS
// ============================================================

// Virtual for time taken in minutes
blurGameSessionSchema.virtual('timeTakenMinutes').get(function() {
  if (!this.timeTaken) return null;
  return (this.timeTaken / 60).toFixed(2);
});

// Virtual for formatted time
blurGameSessionSchema.virtual('formattedTime').get(function() {
  if (!this.timeTaken) return '--';
  
  const minutes = Math.floor(this.timeTaken / 60);
  const seconds = this.timeTaken % 60;
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
});

// Virtual for blur level at completion
blurGameSessionSchema.virtual('blurAtCompletion').get(function() {
  if (!this.isCompleted) return null;
  
  const elapsed = Math.floor((this.guessedAt - this.createdAt) / 1000);
  const totalTime = 90;
  const blurAmount = Math.max(0, 99 - (elapsed / totalTime) * 99);
  return Math.min(99, Math.round(blurAmount));
});

// Ensure virtuals are included in JSON output
blurGameSessionSchema.set('toJSON', { virtuals: true });
blurGameSessionSchema.set('toObject', { virtuals: true });

const BlurGameSession = mongoose.model('BlurGameSession', blurGameSessionSchema);

module.exports = BlurGameSession;