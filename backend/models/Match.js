const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  // Match identifier
  matchCode: {
    type: String,
    unique: true,
    required: true,
    uppercase: true,
    trim: true
  },
  
  // Match type: 'private' or 'quick'
  matchType: {
    type: String,
    enum: ['private', 'quick'],
    default: 'private'
  },
  
  // Players
  player1: {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    team: [{
      characterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Character' },
      characterName: String,
      powerLevel: Number,
      image: String,
      cardId: { type: String, required: true },
      used: { type: Boolean, default: false },
      won: { type: Boolean, default: null },
      roundUsed: { type: Number, default: null },
      level: { type: Number, default: 1 },
      element: { type: String, enum: ['Fire', 'Water', 'Wind', 'Earth'], default: 'Fire' },
      rarity: { type: String, enum: ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'], default: 'Common' }
    }],
    currentScore: { type: Number, default: 0 },
    selectedCardIndex: { type: Number, default: null },
    confirmedCardIndex: { type: Number, default: null },
    cardsWon: [{
      characterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Character' },
      characterName: String,
      powerLevel: Number,
      image: String,
      stolenFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      stolenFromUsername: String,
      wonAt: { type: Date, default: Date.now }
    }],
    cardsLost: [{
      characterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Character' },
      characterName: String,
      powerLevel: Number,
      image: String,
      lostTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      lostToUsername: String,
      lostAt: { type: Date, default: Date.now }
    }]
  },
  
  player2: {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    username: { type: String, default: null },
    team: [{
      characterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Character' },
      characterName: String,
      powerLevel: Number,
      image: String,
      cardId: { type: String, required: true },
      used: { type: Boolean, default: false },
      won: { type: Boolean, default: null },
      roundUsed: { type: Number, default: null },
      level: { type: Number, default: 1 },
      element: { type: String, enum: ['Fire', 'Water', 'Wind', 'Earth'], default: 'Fire' },
      rarity: { type: String, enum: ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'], default: 'Common' }
    }],
    currentScore: { type: Number, default: 0 },
    selectedCardIndex: { type: Number, default: null },
    confirmedCardIndex: { type: Number, default: null },
    cardsWon: [{
      characterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Character' },
      characterName: String,
      powerLevel: Number,
      image: String,
      stolenFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      stolenFromUsername: String,
      wonAt: { type: Date, default: Date.now }
    }],
    cardsLost: [{
      characterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Character' },
      characterName: String,
      powerLevel: Number,
      image: String,
      lostTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      lostToUsername: String,
      lostAt: { type: Date, default: Date.now }
    }]
  },

  // Match state
  status: {
    type: String,
    enum: ['waiting', 'selecting', 'revealing', 'round_result', 'selecting_reward', 'finished', 'abandoned'],
    default: 'waiting'
  },
  
  currentRound: { type: Number, default: 1, min: 1, max: 10 },
  maxRounds: { type: Number, default: 10 },
  
  // Round tracking
  roundStates: [{
    round: Number,
    player1CardIndex: { type: Number, default: null },
    player2CardIndex: { type: Number, default: null },
    winner: { type: String, enum: ['player1', 'player2', 'draw'], default: null },
    player1Power: { type: Number, default: null },
    player2Power: { type: Number, default: null },
    revealed: { type: Boolean, default: false },
    player1Element: { type: String, enum: ['Fire', 'Water', 'Wind', 'Earth'], default: null },
    player2Element: { type: String, enum: ['Fire', 'Water', 'Wind', 'Earth'], default: null }
  }],

  // Winner
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  winnerUsername: { type: String, default: null },
  winnerSide: { type: String, enum: ['player1', 'player2', null], default: null },
  loserSide: { type: String, enum: ['player1', 'player2', null], default: null },
  
  // Forfeit fields
  forfeit: {
    type: Boolean,
    default: false
  },
  forfeitBy: {
    type: String,
    enum: ['player1', 'player2', null],
    default: null
  },
  
  finalScore: {
    player1: { type: Number, default: 0 },
    player2: { type: Number, default: 0 }
  },

  gemRewards: {
    winner: { type: Number, default: 20 },
    loser: { type: Number, default: 5 },
    draw: { type: Number, default: 10 },
    duplicateBonus: { type: Number, default: 20 }
  },

  // Stolen card info
  stolenCard: {
    characterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Character' },
    characterName: String,
    powerLevel: Number,
    image: String,
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    fromUsername: String,
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    toUsername: String,
    stolenAt: { type: Date, default: Date.now }
  },

  availableCardsToSteal: {
    type: Array,
    default: []
  },

  // Timers
  selectionDeadline: { type: Date, default: null },
  roundStartTime: { type: Date, default: null },
  
  // Game log
  gameLog: [{
    type: { type: String, enum: ['info', 'selection', 'reveal', 'winner', 'stolen', 'gem', 'forfeit'] },
    message: String,
    timestamp: { type: Date, default: Date.now }
  }],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// ===== INDEXES =====
matchSchema.index({ matchCode: 1 });
matchSchema.index({ status: 1 });
matchSchema.index({ 'player1.user': 1 });
matchSchema.index({ 'player2.user': 1 });
matchSchema.index({ createdAt: -1 });
matchSchema.index({ forfeit: 1 });
matchSchema.index({ matchType: 1 });

// ✅ NEW: TTL index for auto-deletion after 24 hours (all matches)
matchSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

// ✅ NEW: TTL index for auto-deletion after 5 minutes for waiting matches only
matchSchema.index(
  { createdAt: 1 },
  { 
    expireAfterSeconds: 300, // 5 minutes
    partialFilterExpression: { status: 'waiting' }
  }
);

// ===== METHODS =====
matchSchema.methods.addLog = function(type, message) {
  this.gameLog.push({ type, message, timestamp: new Date() });
  return this;
};

matchSchema.methods.getPlayerByUserId = function(userId) {
  const userIdStr = userId.toString();
  if (this.player1.user?.toString() === userIdStr) return 'player1';
  if (this.player2.user?.toString() === userIdStr) return 'player2';
  return null;
};

matchSchema.methods.getPlayerData = function(userId) {
  const side = this.getPlayerByUserId(userId);
  if (!side) return null;
  return side === 'player1' ? this.player1 : this.player2;
};

matchSchema.methods.getOpponentData = function(userId) {
  const side = this.getPlayerByUserId(userId);
  if (!side) return null;
  return side === 'player1' ? this.player2 : this.player1;
};

matchSchema.methods.isBothConfirmed = function() {
  return this.player1.confirmedCardIndex !== null && 
         this.player2.confirmedCardIndex !== null;
};

matchSchema.methods.isPlayerConfirmed = function(userId) {
  const side = this.getPlayerByUserId(userId);
  if (!side) return false;
  return side === 'player1' ? 
    this.player1.confirmedCardIndex !== null : 
    this.player2.confirmedCardIndex !== null;
};

matchSchema.methods.getElementAdvantage = function(element1, element2) {
  const advantages = {
    'Fire': 'Wind',
    'Wind': 'Earth',
    'Earth': 'Water',
    'Water': 'Fire'
  };
  
  if (advantages[element1] === element2) return 1.2;
  if (advantages[element2] === element1) return 0.8;
  return 1.0;
};

matchSchema.methods.calculateEffectivePower = function(card, opponentElement) {
  const basePower = card.powerLevel || 25;
  const element = card.element || 'Fire';
  const advantage = this.getElementAdvantage(element, opponentElement);
  return Math.round(basePower * advantage * 10) / 10;
};

matchSchema.methods.getGemRewards = function(side) {
  const rewards = this.gemRewards || { winner: 20, loser: 5, draw: 10 };
  
  if (side === 'winner') return rewards.winner;
  if (side === 'loser') return rewards.loser;
  if (side === 'draw') return rewards.draw;
  return 0;
};

// ✅ NEW: Check if match is cancellable
matchSchema.methods.isCancellable = function() {
  return ['waiting', 'selecting'].includes(this.status);
};

// ✅ NEW: Check if match is active
matchSchema.methods.isActive = function() {
  return ['waiting', 'selecting', 'revealing', 'round_result', 'selecting_reward'].includes(this.status);
};

module.exports = mongoose.model('Match', matchSchema);