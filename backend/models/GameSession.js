const mongoose = require('mongoose');

const gameSessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  character: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Character',
    required: true
  },
  questions: [{
    question: String,
    answer: String,
    confidence: Number,
    timestamp: { type: Date, default: Date.now }
  }],
  status: {
    type: String,
    enum: ['active', 'won', 'lost', 'abandoned'],
    default: 'active'
  },
  totalQuestions: {
    type: Number,
    default: 0
  },
  guesses: [{
    guess: String,
    isCorrect: Boolean,
    timestamp: { type: Date, default: Date.now }
  }],
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date
  }
});

module.exports = mongoose.model('GameSession', gameSessionSchema);