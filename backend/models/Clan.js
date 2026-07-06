const mongoose = require('mongoose');

const clanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 30
  },
  description: {
    type: String,
    required: true,
    maxlength: 200 // 30 words approx
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  shards: {
    type: Number,
    default: 0
  },
  totalMembers: {
    type: Number,
    default: 1
  },
  maxMembers: {
    type: Number,
    default: 20
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

clanSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Clan', clanSchema);