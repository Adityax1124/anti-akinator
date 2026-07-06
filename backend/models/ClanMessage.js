const mongoose = require('mongoose');

const clanMessageSchema = new mongoose.Schema({
  clanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clan',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  type: {
    type: String,
    enum: ['chat', 'donation', 'request', 'system'],
    default: 'chat'
  },
  diamondAmount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ClanMessage', clanMessageSchema);