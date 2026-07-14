const mongoose = require('mongoose');

// ============================================================
// ✅ CLAN WAR HISTORY MODEL
// ============================================================
const clanWarHistorySchema = new mongoose.Schema({
  // ===== CLAN INFORMATION =====
  clanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clan',
    required: true,
    index: true
  },
  clanName: {
    type: String,
    required: true
  },
  
  // ===== OPPONENT INFORMATION =====
  opponentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clan',
    required: true
  },
  opponentName: {
    type: String,
    required: true
  },

  // ===== WAR REFERENCE =====
  warId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClanWar',
    required: true
  },

  // ===== SCORES =====
  clanScore: {
    type: Number,
    required: true,
    min: 0,
    max: 10
  },
  opponentScore: {
    type: Number,
    required: true,
    min: 0,
    max: 10
  },

  // ===== RESULT =====
  result: {
    type: String,
    enum: ['win', 'loss', 'draw'],
    required: true
  },

  // ===== WAR STATS =====
  totalMembers: {
    type: Number,
    default: 10
  },
  attacksUsed: {
    type: Number,
    default: 0
  },
  attacksRemaining: {
    type: Number,
    default: 10
  },

  // ===== MVP (Most Valuable Player) =====
  mvp: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: {
      type: String
    },
    wins: {
      type: Number,
      default: 0
    }
  },

  // ===== WAR DURATION =====
  startedAt: {
    type: Date,
    required: true
  },
  endedAt: {
    type: Date,
    required: true
  },
  preparationDuration: {
    type: Number, // in hours
    default: 12
  },
  battleDuration: {
    type: Number, // in hours
    default: 12
  },

  // ===== REWARDS =====
  rewardsGiven: {
    type: Boolean,
    default: false
  },
  rewardDate: {
    type: Date,
    default: null
  },

  // ===== TIMESTAMPS =====
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: {
    transform: (doc, ret) => {
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    transform: (doc, ret) => {
      delete ret.__v;
      return ret;
    }
  }
});

// ============================================================
// ✅ INDEXES
// ============================================================
clanWarHistorySchema.index({ clanId: 1, createdAt: -1 });
clanWarHistorySchema.index({ clanId: 1, result: 1 });
clanWarHistorySchema.index({ opponentId: 1 });
clanWarHistorySchema.index({ warId: 1 });
clanWarHistorySchema.index({ createdAt: -1 });
clanWarHistorySchema.index({ 'mvp.userId': 1 });

// ============================================================
// ✅ METHODS
// ============================================================

// Check if clan won
clanWarHistorySchema.methods.isWin = function() {
  return this.result === 'win';
};

// Check if clan lost
clanWarHistorySchema.methods.isLoss = function() {
  return this.result === 'loss';
};

// Check if draw
clanWarHistorySchema.methods.isDraw = function() {
  return this.result === 'draw';
};

// Get score difference
clanWarHistorySchema.methods.getScoreDifference = function() {
  return this.clanScore - this.opponentScore;
};

// Get win rate
clanWarHistorySchema.methods.getWinRate = function() {
  // This is instance-specific, usually calculated in statics
  return this.isWin() ? 1 : 0;
};

// ============================================================
// ✅ STATICS
// ============================================================

// Get all history for a clan
clanWarHistorySchema.statics.getHistoryForClan = async function(clanId, limit = 50) {
  return this.find({ clanId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Get win/loss/draw counts for a clan
clanWarHistorySchema.statics.getRecordForClan = async function(clanId) {
  const [wins, losses, draws] = await Promise.all([
    this.countDocuments({ clanId, result: 'win' }),
    this.countDocuments({ clanId, result: 'loss' }),
    this.countDocuments({ clanId, result: 'draw' })
  ]);
  
  const total = wins + losses + draws;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  
  return {
    wins,
    losses,
    draws,
    total,
    winRate
  };
};

// Get recent wars for a clan (last 10)
clanWarHistorySchema.statics.getRecentWars = async function(clanId, limit = 10) {
  return this.find({ clanId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('opponentId', 'name')
    .populate('mvp.userId', 'username');
};

// Get clan's current win streak
clanWarHistorySchema.statics.getWinStreak = async function(clanId) {
  const history = await this.find({ clanId })
    .sort({ createdAt: -1 })
    .limit(20);
  
  let streak = 0;
  for (const war of history) {
    if (war.result === 'win') {
      streak++;
    } else if (war.result === 'loss') {
      break;
    }
    // Draw breaks streak
    if (war.result === 'draw') break;
  }
  
  return streak;
};

// Get all time leaderboard (top clans by wins)
clanWarHistorySchema.statics.getLeaderboard = async function(limit = 20) {
  return this.aggregate([
    {
      $match: { result: 'win' }
    },
    {
      $group: {
        _id: '$clanId',
        clanName: { $first: '$clanName' },
        totalWins: { $sum: 1 },
        totalWars: { $sum: 1 },
        totalScore: { $sum: '$clanScore' },
        totalOpponentScore: { $sum: '$opponentScore' }
      }
    },
    {
      $lookup: {
        from: 'clans',
        localField: '_id',
        foreignField: '_id',
        as: 'clanData'
      }
    },
    {
      $addFields: {
        clanData: { $arrayElemAt: ['$clanData', 0] },
        winRate: {
          $multiply: [
            { $divide: ['$totalWins', '$totalWars'] },
            100
          ]
        },
        totalMembers: { $ifNull: ['$clanData.totalMembers', 0] }
      }
    },
    {
      $project: {
        clanId: '$_id',
        clanName: 1,
        totalWins: 1,
        totalWars: 1,
        winRate: { $round: ['$winRate', 1] },
        totalScore: 1,
        totalOpponentScore: 1,
        totalMembers: 1,
        clanEmblem: '$clanData.emblem'
      }
    },
    {
      $sort: { totalWins: -1, winRate: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

// Get MVP leaderboard
clanWarHistorySchema.statics.getMVPLeaderboard = async function(limit = 10) {
  return this.aggregate([
    {
      $match: { 'mvp.userId': { $ne: null } }
    },
    {
      $group: {
        _id: '$mvp.userId',
        username: { $first: '$mvp.username' },
        totalWins: { $sum: '$mvp.wins' },
        warCount: { $sum: 1 }
      }
    },
    {
      $sort: { totalWins: -1 }
    },
    {
      $limit: limit
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'userData'
      }
    },
    {
      $addFields: {
        username: { $ifNull: ['$username', { $arrayElemAt: ['$userData.username', 0] }] }
      }
    },
    {
      $project: {
        userId: '$_id',
        username: 1,
        totalWins: 1,
        warCount: 1
      }
    }
  ]);
};

// Get monthly leaderboard
clanWarHistorySchema.statics.getMonthlyLeaderboard = async function(month, year, limit = 20) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        result: 'win'
      }
    },
    {
      $group: {
        _id: '$clanId',
        clanName: { $first: '$clanName' },
        monthlyWins: { $sum: 1 },
        totalScore: { $sum: '$clanScore' }
      }
    },
    {
      $lookup: {
        from: 'clans',
        localField: '_id',
        foreignField: '_id',
        as: 'clanData'
      }
    },
    {
      $addFields: {
        clanData: { $arrayElemAt: ['$clanData', 0] }
      }
    },
    {
      $project: {
        clanId: '$_id',
        clanName: 1,
        monthlyWins: 1,
        totalScore: 1,
        totalMembers: '$clanData.totalMembers'
      }
    },
    {
      $sort: { monthlyWins: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

// ============================================================
// ✅ PRE-SAVE: Validate scores
// ============================================================
clanWarHistorySchema.pre('save', function(next) {
  // Ensure scores are between 0-10
  if (this.clanScore < 0) this.clanScore = 0;
  if (this.clanScore > 10) this.clanScore = 10;
  if (this.opponentScore < 0) this.opponentScore = 0;
  if (this.opponentScore > 10) this.opponentScore = 10;
  
  // Auto-determine result if not set
  if (!this.result) {
    if (this.clanScore > this.opponentScore) {
      this.result = 'win';
    } else if (this.clanScore < this.opponentScore) {
      this.result = 'loss';
    } else {
      this.result = 'draw';
    }
  }
  
  next();
});

module.exports = mongoose.model('ClanWarHistory', clanWarHistorySchema);