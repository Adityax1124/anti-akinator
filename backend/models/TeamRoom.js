const mongoose = require('mongoose');

const teamRoomSchema = new mongoose.Schema({
  roomCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  players: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: {
      type: String,
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  maxPlayers: {
    type: Number,
    default: 4,
    min: 2,
    max: 4
  },
  status: {
    type: String,
    enum: ['waiting', 'playing', 'finished'],
    default: 'waiting'
  },
  gameData: {
    characterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Character',
      default: null
    },
    questions: [{
      question: { type: String },
      answer: { type: String },
      askedBy: { type: String },
      timestamp: { type: Date, default: Date.now }
    }],
    totalQuestions: { type: Number, default: 0 },
    maxQuestions: { type: Number, default: 10 },
    guesses: [{
      guess: { type: String },
      isCorrect: { type: Boolean },
      guessedBy: { type: String },
      timestamp: { type: Date, default: Date.now }
    }],
    isGuessed: { type: Boolean, default: false },
    characterName: { type: String },
    characterImage: { type: String }
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 60 * 60 * 1000) // 1 hour expiry
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Auto-delete expired rooms
teamRoomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('TeamRoom', teamRoomSchema);