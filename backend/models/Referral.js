const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  // The user who referred (the referrer)
  referrer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // The user who was referred (the friend)
  referredUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Referral code used
  code: {
    type: String,
    required: true,
    uppercase: true
  },
  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'registered', 'completed'],
    default: 'pending'
  },
  // Rewards claimed status
  referrerRewards: {
    firstGuess: { type: Boolean, default: false }
  },
  referredUserRewards: {
    welcomeBonus: { type: Boolean, default: false }
  },
  // Timestamps
  registeredAt: { type: Date },
  firstGuessAt: { type: Date },
  completedAt: { type: Date },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for efficient queries
referralSchema.index({ referrer: 1, referredUser: 1 });
referralSchema.index({ code: 1 });
referralSchema.index({ status: 1 });
referralSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Referral', referralSchema);