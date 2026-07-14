const mongoose = require('mongoose');

// ============================================================
// ✅ NOTIFICATION MODEL
// ============================================================
const notificationSchema = new mongoose.Schema({
  // ===== USER =====
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // ===== NOTIFICATION TYPE =====
  type: {
    type: String,
    enum: [
      // War related
      'war_victory',        // Clan won the war
      'war_defeat',         // Clan lost the war
      'war_draw',           // Clan tied the war
      'war_started',        // Leader started a war
      'war_reminder',       // Battle day reminder
      'war_searching',      // Searching for opponent
      'war_found',          // Opponent found!
      'war_ending_soon',    // War ending in 1 hour
      'war_card_ready',     // Player selected their war card
      
      // Chest related
      'chest_available',    // New chest available
      'chest_opened',       // Chest was opened
      
      // General
      'system',
      'announcement'
    ],
    required: true
  },

  // ===== CONTENT =====
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },

  // ===== ICON / EMOJI =====
  icon: {
    type: String,
    default: '🔔'
  },

  // ===== COLOR =====
  color: {
    type: String,
    enum: ['blue', 'green', 'red', 'yellow', 'purple', 'gray'],
    default: 'blue'
  },

  // ===== DATA (Flexible) =====
  data: {
    warId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClanWar',
      default: null
    },
    clanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clan',
      default: null
    },
    chestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TreasureChest',
      default: null
    },
    opponentName: {
      type: String,
      default: null
    },
    score: {
      type: String,
      default: null
    },
    rewardType: {
      type: String,
      enum: ['card', 'gems', null],
      default: null
    },
    rewardAmount: {
      type: Number,
      default: null
    },
    cardName: {
      type: String,
      default: null
    },
    cardRarity: {
      type: String,
      default: null
    },
    // Extra flexible data
    extra: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },

  // ===== STATUS =====
  isRead: {
    type: Boolean,
    default: false
  },
  isClaimed: {
    type: Boolean,
    default: false // For chest notifications
  },

  // ===== PRIORITY =====
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },

  // ===== TIMESTAMPS =====
  createdAt: {
    type: Date,
    default: Date.now
  },
  readAt: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    default: null // Optional: notification expires after X days
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
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, isClaimed: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired

// ============================================================
// ✅ METHODS
// ============================================================

// Mark notification as read
notificationSchema.methods.markAsRead = async function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    await this.save();
  }
  return this;
};

// Mark notification as claimed (for chest)
notificationSchema.methods.markAsClaimed = async function() {
  this.isClaimed = true;
  await this.save();
  return this;
};

// Check if notification is expired
notificationSchema.methods.isExpired = function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

// Get notification action button text
notificationSchema.methods.getActionText = function() {
  const actions = {
    'war_victory': '🎁 Claim Reward',
    'chest_available': '📦 Open Chest',
    'war_started': '⚔️ View War',
    'war_reminder': '⚔️ Go to War',
    'war_found': '⚔️ View War',
    'war_ending_soon': '⚔️ Go to War',
    'war_defeat': '📊 View Results',
    'war_draw': '📊 View Results'
  };
  return actions[this.type] || '📖 View';
};

// Get notification action link
notificationSchema.methods.getActionLink = function() {
  const links = {
    'war_victory': `/notifications`,
    'chest_available': `/notifications`,
    'war_started': `/clan/war`,
    'war_reminder': `/clan/war`,
    'war_found': `/clan/war`,
    'war_ending_soon': `/clan/war`,
    'war_defeat': `/clan/war/history`,
    'war_draw': `/clan/war/history`
  };
  return links[this.type] || '#';
};

// ============================================================
// ✅ STATICS
// ============================================================

// Get all notifications for a user
notificationSchema.statics.getForUser = async function(userId, limit = 50, offset = 0) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit);
};

// Get unread notifications for a user
notificationSchema.statics.getUnreadForUser = async function(userId) {
  return this.find({
    userId,
    isRead: false
  }).sort({ createdAt: -1 });
};

// Get unread count for a user
notificationSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({
    userId,
    isRead: false
  });
};

// Get unclaimed notifications for a user (chest rewards)
notificationSchema.statics.getUnclaimedForUser = async function(userId) {
  return this.find({
    userId,
    isClaimed: false,
    type: { $in: ['war_victory', 'chest_available'] }
  }).sort({ createdAt: -1 });
};

// Get unclaimed count for a user
notificationSchema.statics.getUnclaimedCount = async function(userId) {
  return this.countDocuments({
    userId,
    isClaimed: false,
    type: { $in: ['war_victory', 'chest_available'] }
  });
};

// Mark all as read for a user
notificationSchema.statics.markAllAsRead = async function(userId) {
  return this.updateMany(
    { userId, isRead: false },
    { 
      isRead: true,
      readAt: new Date()
    }
  );
};

// Delete all read notifications for a user
notificationSchema.statics.clearRead = async function(userId) {
  return this.deleteMany({
    userId,
    isRead: true
  });
};

// Delete all notifications for a user (older than X days)
notificationSchema.statics.clearOld = async function(userId, days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return this.deleteMany({
    userId,
    createdAt: { $lt: cutoffDate }
  });
};

// ============================================================
// ✅ STATIC: Create Notification with Type
// ============================================================
notificationSchema.statics.createNotification = async function(data) {
  const {
    userId,
    type,
    title,
    message,
    icon,
    color,
    data: extraData,
    priority,
    expiresAt
  } = data;

  const notification = new this({
    userId,
    type,
    title,
    message,
    icon: icon || getDefaultIcon(type),
    color: color || getDefaultColor(type),
    data: extraData || {},
    priority: priority || 'medium',
    expiresAt: expiresAt || null
  });

  await notification.save();
  return notification;
};

// ============================================================
// ✅ HELPER: Get Default Icon by Type
// ============================================================
function getDefaultIcon(type) {
  const icons = {
    'war_victory': '🏆',
    'war_defeat': '💀',
    'war_draw': '🤝',
    'war_started': '⚔️',
    'war_reminder': '⏰',
    'war_searching': '🔍',
    'war_found': '🎯',
    'war_ending_soon': '⏳',
    'war_card_ready': '🃏',
    'chest_available': '🎁',
    'chest_opened': '📦',
    'system': '🔔',
    'announcement': '📢'
  };
  return icons[type] || '🔔';
}

// ============================================================
// ✅ HELPER: Get Default Color by Type
// ============================================================
function getDefaultColor(type) {
  const colors = {
    'war_victory': 'green',
    'war_defeat': 'red',
    'war_draw': 'yellow',
    'war_started': 'blue',
    'war_reminder': 'yellow',
    'war_searching': 'blue',
    'war_found': 'green',
    'war_ending_soon': 'red',
    'war_card_ready': 'purple',
    'chest_available': 'gold',
    'chest_opened': 'purple',
    'system': 'gray',
    'announcement': 'blue'
  };
  return colors[type] || 'blue';
}

// ============================================================
// ✅ STATIC: Helper to Create War Notifications
// ============================================================

// Create victory notifications for all winning clan members
notificationSchema.statics.createWarVictoryNotifications = async function(war, winningClan, opponentName, score) {
  const members = winningClan === 'clan1' ? war.clan1Members : war.clan2Members;
  const notifications = [];

  for (const member of members) {
    const notif = await this.createNotification({
      userId: member.userId,
      type: 'war_victory',
      title: '🏆 War Victory!',
      message: `Your clan won the war against ${opponentName}! Score: ${score}. Check your notifications for your reward! 🎁`,
      icon: '🏆',
      color: 'green',
      data: {
        warId: war._id,
        clanId: winningClan === 'clan1' ? war.clan1Id : war.clan2Id,
        opponentName: opponentName,
        score: score
      },
      priority: 'high'
    });
    notifications.push(notif);
  }

  return notifications;
};

// Create defeat notifications for all losing clan members
notificationSchema.statics.createWarDefeatNotifications = async function(war, losingClan, opponentName, score) {
  const members = losingClan === 'clan1' ? war.clan1Members : war.clan2Members;
  const notifications = [];

  for (const member of members) {
    const notif = await this.createNotification({
      userId: member.userId,
      type: 'war_defeat',
      title: '💀 War Lost',
      message: `Your clan lost to ${opponentName}. Score: ${score}. Better luck next time! 💪`,
      icon: '💀',
      color: 'red',
      data: {
        warId: war._id,
        clanId: losingClan === 'clan1' ? war.clan1Id : war.clan2Id,
        opponentName: opponentName,
        score: score
      },
      priority: 'high'
    });
    notifications.push(notif);
  }

  return notifications;
};

// Create chest available notifications
notificationSchema.statics.createChestAvailableNotification = async function(userId, chestId, warId) {
  return this.createNotification({
    userId: userId,
    type: 'chest_available',
    title: '🎁 New Treasure Chest!',
    message: 'You earned a treasure chest from the war! Open it now to claim your reward!',
    icon: '🎁',
    color: 'gold',
    data: {
      chestId: chestId,
      warId: warId
    },
    priority: 'high'
  });
};

// Create war start notification
notificationSchema.statics.createWarStartNotification = async function(userId, clanName) {
  return this.createNotification({
    userId: userId,
    type: 'war_started',
    title: '⚔️ War Started!',
    message: `Your leader started a war for ${clanName}! Searching for opponent...`,
    icon: '⚔️',
    color: 'blue',
    data: {},
    priority: 'medium'
  });
};

// Create war found notification
notificationSchema.statics.createWarFoundNotification = async function(userId, opponentName) {
  return this.createNotification({
    userId: userId,
    type: 'war_found',
    title: '🎯 Opponent Found!',
    message: `Your clan will battle against ${opponentName}! Preparation phase begins now!`,
    icon: '🎯',
    color: 'green',
    data: {
      opponentName: opponentName
    },
    priority: 'high'
  });
};

// Create war reminder notification
notificationSchema.statics.createWarReminderNotification = async function(userId, opponentName) {
  return this.createNotification({
    userId: userId,
    type: 'war_reminder',
    title: '⏰ Battle Day!',
    message: `The war against ${opponentName} has started! Use your attack now!`,
    icon: '⏰',
    color: 'yellow',
    data: {
      opponentName: opponentName
    },
    priority: 'high'
  });
};

// Create war ending soon notification
notificationSchema.statics.createWarEndingSoonNotification = async function(userId, opponentName, score) {
  return this.createNotification({
    userId: userId,
    type: 'war_ending_soon',
    title: '⏳ War Ending Soon!',
    message: `The war against ${opponentName} ends in 1 hour! Current score: ${score}`,
    icon: '⏳',
    color: 'red',
    data: {
      opponentName: opponentName,
      score: score
    },
    priority: 'high'
  });
};

module.exports = mongoose.model('Notification', notificationSchema);