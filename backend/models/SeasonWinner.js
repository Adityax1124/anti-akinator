const mongoose = require('mongoose');

const seasonWinnerSchema = new mongoose.Schema({
  season: {
    type: Number,
    required: true,
    unique: true
  },
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  streak: {
    type: Number,
    required: true,
    default: 0
  },
  wins: {
    type: Number,
    required: true,
    default: 0
  },
  prize: {
    type: Number,
    default: 2000 // INR
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('SeasonWinner', seasonWinnerSchema);