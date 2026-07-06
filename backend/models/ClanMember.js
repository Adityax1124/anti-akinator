const mongoose = require('mongoose');

const clanMemberSchema = new mongoose.Schema({
  clanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clan',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  role: {
    type: String,
    enum: ['leader', 'co-leader', 'elder', 'member'],
    default: 'member'
  },
  diamondsDonated: {
    type: Number,
    default: 0
  },
  diamondsRequested: {
    type: Number,
    default: 0
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ClanMember', clanMemberSchema);