const mongoose = require('mongoose');

// ============================================================
// ✅ CLAN WAR MODEL
// ============================================================
const clanWarSchema = new mongoose.Schema({
  // ===== CLAN 1 (The clan that started the war) =====
  clan1Id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clan',
    required: true
  },

  // ===== CLAN 2 (The opponent - null until matched) =====
  clan2Id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clan',
    default: null
  },

  // ===== CLAN 1 MEMBERS (10 selected by leader) =====
  clan1Members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    selectedCard: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Character',
      default: null
    },
    hasAttacked: {
      type: Boolean,
      default: false
    },
    attackedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    battleResult: {
      type: String,
      enum: ['win', 'loss', null],
      default: null
    }
  }],

  // ===== CLAN 2 MEMBERS (10 selected by leader) =====
  clan2Members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    selectedCard: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Character',
      default: null
    },
    hasAttacked: {
      type: Boolean,
      default: false
    },
    attackedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    battleResult: {
      type: String,
      enum: ['win', 'loss', null],
      default: null
    }
  }],

  // ===== WAR STATUS =====
  status: {
    type: String,
    enum: ['searching', 'preparation', 'battle', 'completed'],
    default: 'searching'
  },

  // ===== TIMERS =====
  phaseStartTime: {
    type: Date,
    default: Date.now
  },
  preparationEndsAt: {
    type: Date,
    default: null
  },
  battleEndsAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },

  // ===== SCORES =====
  // Clan 1 wins (out of 10)
  clan1Wins: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  },
  // Clan 2 wins (out of 10)
  clan2Wins: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  },
  // Clan 1 attacks used
  clan1Attacks: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  },
  // Clan 2 attacks used
  clan2Attacks: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  },

  // ===== WINNER =====
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clan',
    default: null
  },
  winningClanScore: {
    type: Number,
    default: null
  },
  losingClanScore: {
    type: Number,
    default: null
  },

  // ===== BATTLE LOGS (For history) =====
  battleLogs: [{
    attackerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    attackerName: {
      type: String
    },
    attackerCard: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Character'
    },
    defenderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    defenderName: {
      type: String
    },
    defenderCard: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Character'
    },
    result: {
      type: String,
      enum: ['win', 'loss']
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // ===== TIMESTAMPS =====
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
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
clanWarSchema.index({ clan1Id: 1 });
clanWarSchema.index({ clan2Id: 1 });
clanWarSchema.index({ status: 1 });
clanWarSchema.index({ 'clan1Members.userId': 1 });
clanWarSchema.index({ 'clan2Members.userId': 1 });
clanWarSchema.index({ createdAt: -1 });
clanWarSchema.index({ status: 1, createdAt: 1 });

// ============================================================
// ✅ METHODS
// ============================================================

// Check if war is in searching phase
clanWarSchema.methods.isSearching = function() {
  return this.status === 'searching';
};

// Check if war is in preparation phase
clanWarSchema.methods.isPreparation = function() {
  return this.status === 'preparation';
};

// Check if war is in battle phase
clanWarSchema.methods.isBattle = function() {
  return this.status === 'battle';
};

// Check if war is completed
clanWarSchema.methods.isCompleted = function() {
  return this.status === 'completed';
};

// Get clan by userId (returns 'clan1' or 'clan2' or null)
clanWarSchema.methods.getClanByUserId = function(userId) {
  const userIdStr = userId.toString();
  
  const inClan1 = this.clan1Members.some(m => 
    m.userId.toString() === userIdStr
  );
  if (inClan1) return 'clan1';
  
  const inClan2 = this.clan2Members.some(m => 
    m.userId.toString() === userIdStr
  );
  if (inClan2) return 'clan2';
  
  return null;
};

// Get member by userId
clanWarSchema.methods.getMemberByUserId = function(userId) {
  const userIdStr = userId.toString();
  
  let member = this.clan1Members.find(m => 
    m.userId.toString() === userIdStr
  );
  if (member) return { member, clan: 'clan1' };
  
  member = this.clan2Members.find(m => 
    m.userId.toString() === userIdStr
  );
  if (member) return { member, clan: 'clan2' };
  
  return null;
};

// Check if user has attacked
clanWarSchema.methods.hasUserAttacked = function(userId) {
  const result = this.getMemberByUserId(userId);
  if (!result) return false;
  return result.member.hasAttacked;
};

// Get score display
clanWarSchema.methods.getScoreDisplay = function() {
  return {
    clan1: `${this.clan1Wins}/10`,
    clan2: `${this.clan2Wins}/10`,
    clan1Attacks: `${this.clan1Attacks}/10`,
    clan2Attacks: `${this.clan2Attacks}/10`
  };
};

// Get winner display
clanWarSchema.methods.getWinnerDisplay = function() {
  if (!this.winner) return null;
  
  if (this.winner.toString() === this.clan1Id.toString()) {
    return 'clan1';
  }
  return 'clan2';
};

// Check if all attacks are done
clanWarSchema.methods.isAllAttacksDone = function() {
  const clan1Done = this.clan1Members.every(m => m.hasAttacked);
  const clan2Done = this.clan2Members.every(m => m.hasAttacked);
  return clan1Done && clan2Done;
};

// Get remaining attacks
clanWarSchema.methods.getRemainingAttacks = function(clan) {
  if (clan === 'clan1') {
    return this.clan1Members.filter(m => !m.hasAttacked).length;
  } else if (clan === 'clan2') {
    return this.clan2Members.filter(m => !m.hasAttacked).length;
  }
  return 0;
};

// ============================================================
// ✅ STATICS
// ============================================================

// Find active war for clan
clanWarSchema.statics.findActiveWarForClan = async function(clanId) {
  return this.findOne({
    $or: [
      { clan1Id: clanId },
      { clan2Id: clanId }
    ],
    status: { $in: ['searching', 'preparation', 'battle'] }
  });
};

// Find searching wars (for matchmaking)
clanWarSchema.statics.findSearchingWars = async function(excludeWarId) {
  const query = { status: 'searching' };
  if (excludeWarId) {
    query._id = { $ne: excludeWarId };
  }
  return this.find(query).sort({ createdAt: 1 });
};

// Find completed wars for clan
clanWarSchema.statics.findCompletedWarsForClan = async function(clanId, limit = 10) {
  return this.find({
    $or: [
      { clan1Id: clanId },
      { clan2Id: clanId }
    ],
    status: 'completed'
  })
  .sort({ completedAt: -1 })
  .limit(limit);
};

// Get war count for clan
clanWarSchema.statics.getWarCountForClan = async function(clanId) {
  return this.countDocuments({
    $or: [
      { clan1Id: clanId },
      { clan2Id: clanId }
    ],
    status: 'completed'
  });
};

// Get win count for clan
clanWarSchema.statics.getWinCountForClan = async function(clanId) {
  return this.countDocuments({
    winner: clanId,
    status: 'completed'
  });
};

// ============================================================
// ✅ PRE-SAVE: Update timestamps
// ============================================================
clanWarSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Auto-set winner if both clans have attacks done
  if (this.status === 'battle' && this.isAllAttacksDone()) {
    this.status = 'completed';
    this.completedAt = new Date();
    
    if (this.clan1Wins > this.clan2Wins) {
      this.winner = this.clan1Id;
      this.winningClanScore = this.clan1Wins;
      this.losingClanScore = this.clan2Wins;
    } else if (this.clan2Wins > this.clan1Wins) {
      this.winner = this.clan2Id;
      this.winningClanScore = this.clan2Wins;
      this.losingClanScore = this.clan1Wins;
    }
    // If tie, no winner (draw)
  }
  
  next();
});

module.exports = mongoose.model('ClanWar', clanWarSchema);