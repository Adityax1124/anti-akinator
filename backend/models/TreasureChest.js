const mongoose = require('mongoose');

// ============================================================
// ✅ TREASURE CHEST MODEL
// ============================================================
const treasureChestSchema = new mongoose.Schema({
  // ===== USER =====
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // ===== WAR REFERENCE =====
  warId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClanWar',
    required: true
  },

  // ===== CLAN REFERENCE =====
  clanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clan',
    required: true
  },

  // ===== CHEST STATUS =====
  isOpened: {
    type: Boolean,
    default: false
  },

  // ===== REWARD =====
  reward: {
    type: {
      type: String,
      enum: ['card', 'gems'],
      required: true
    },
    cardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Character',
      default: null
    },
    cardName: {
      type: String,
      default: null
    },
    cardRarity: {
      type: String,
      enum: ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'],
      default: null
    },
    cardElement: {
      type: String,
      enum: ['Fire', 'Water', 'Wind', 'Earth'],
      default: null
    },
    cardImage: {
      type: String,
      default: null
    },
    cardPower: {
      type: Number,
      default: null
    },
    gemsAmount: {
      type: Number,
      default: null
    },
    wasDuplicate: {
      type: Boolean,
      default: false
    }
  },

  // ===== CHEST TYPE (For future expansion) =====
  chestType: {
    type: String,
    enum: ['war_victory', 'war_participation', 'special'],
    default: 'war_victory'
  },

  // ===== NOTIFICATION REFERENCE =====
  notificationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Notification',
    default: null
  },

  // ===== TIMESTAMPS =====
  createdAt: {
    type: Date,
    default: Date.now
  },
  openedAt: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    default: null // Optional: chest expires after X days
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
treasureChestSchema.index({ userId: 1, isOpened: 1 });
treasureChestSchema.index({ userId: 1, createdAt: -1 });
treasureChestSchema.index({ warId: 1 });
treasureChestSchema.index({ clanId: 1 });
treasureChestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired

// ============================================================
// ✅ RARITY CHANCES
// ============================================================
const RARITY_CHANCES = {
  'Common': 0.60,      // 60%
  'Uncommon': 0.25,    // 25%
  'Rare': 0.10,        // 10%
  'Epic': 0.04,        // 4%
  'Legendary': 0.01    // 1%
};

// ============================================================
// ✅ STATICS
// ============================================================

// Get all unopened chests for user
treasureChestSchema.statics.getUnopenedChests = async function(userId) {
  return this.find({
    userId,
    isOpened: false
  })
  .populate('warId', 'clan1Id clan2Id clan1Wins clan2Wins')
  .sort({ createdAt: -1 });
};

// Get all opened chests for user
treasureChestSchema.statics.getOpenedChests = async function(userId, limit = 20) {
  return this.find({
    userId,
    isOpened: true
  })
  .populate('warId', 'clan1Id clan2Id clan1Wins clan2Wins')
  .sort({ openedAt: -1 })
  .limit(limit);
};

// Get unopened chest count for user
treasureChestSchema.statics.getUnopenedCount = async function(userId) {
  return this.countDocuments({
    userId,
    isOpened: false
  });
};

// Get chests by war
treasureChestSchema.statics.getChestsByWar = async function(warId) {
  return this.find({ warId });
};

// Get chests by clan
treasureChestSchema.statics.getChestsByClan = async function(clanId) {
  return this.find({ clanId });
};

// ============================================================
// ✅ METHODS
// ============================================================

// Check if chest is expired
treasureChestSchema.methods.isExpired = function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

// Get reward display name
treasureChestSchema.methods.getRewardDisplay = function() {
  if (!this.isOpened) return 'Unopened Chest 🎁';
  
  if (this.reward.type === 'card') {
    return `🃏 ${this.reward.cardName} (${this.reward.cardRarity})`;
  } else {
    return `💎 ${this.reward.gemsAmount} Gems`;
  }
};

// Get chest rarity color
treasureChestSchema.methods.getRarityColor = function() {
  if (!this.isOpened || this.reward.type !== 'card') return '#a0a0a0';
  
  const colors = {
    'Common': '#a0a0a0',
    'Uncommon': '#4ecdc4',
    'Rare': '#4a9eff',
    'Epic': '#a855f7',
    'Legendary': '#f59e0b'
  };
  return colors[this.reward.cardRarity] || '#a0a0a0';
};

// Get chest rarity stars
treasureChestSchema.methods.getRarityStars = function() {
  if (!this.isOpened || this.reward.type !== 'card') return '';
  
  const stars = {
    'Common': '⭐',
    'Uncommon': '⭐⭐',
    'Rare': '⭐⭐⭐',
    'Epic': '⭐⭐⭐⭐',
    'Legendary': '⭐⭐⭐⭐⭐'
  };
  return stars[this.reward.cardRarity] || '';
};

// ============================================================
// ✅ HELPER: Get Random Card by Rarity
// ============================================================
treasureChestSchema.statics.getRandomRarity = function() {
  const rand = Math.random();
  let cumulative = 0;
  
  for (const [rarity, chance] of Object.entries(RARITY_CHANCES)) {
    cumulative += chance;
    if (rand <= cumulative) {
      return rarity;
    }
  }
  return 'Common';
};

// ============================================================
// ✅ HELPER: Get Random Card from Collection
// ============================================================
treasureChestSchema.statics.getRandomCard = async function(rarity) {
  const Character = mongoose.model('Character');
  
  const cards = await Character.find({ rarity });
  if (cards.length === 0) {
    // Fallback: get any card
    const allCards = await Character.find();
    if (allCards.length === 0) return null;
    return allCards[Math.floor(Math.random() * allCards.length)];
  }
  
  return cards[Math.floor(Math.random() * cards.length)];
};

// ============================================================
// ✅ HELPER: Open Chest and Award Reward
// ============================================================
treasureChestSchema.methods.openChest = async function() {
  const User = mongoose.model('User');
  const Character = mongoose.model('Character');
  
  if (this.isOpened) {
    throw new Error('Chest already opened');
  }
  
  if (this.isExpired()) {
    throw new Error('Chest has expired');
  }
  
  // Get random rarity
  const rarity = treasureChestSchema.statics.getRandomRarity();
  
  // Get random card of that rarity
  const card = await treasureChestSchema.statics.getRandomCard(rarity);
  
  if (!card) {
    // Fallback: give gems if no cards found
    this.reward = {
      type: 'gems',
      gemsAmount: 200
    };
    this.isOpened = true;
    this.openedAt = new Date();
    await this.save();
    
    // Add gems to user
    const user = await User.findById(this.userId);
    if (user) {
      user.gems = (user.gems || 0) + 200;
      await user.save();
    }
    
    return {
      success: true,
      reward: {
        type: 'gems',
        gemsAmount: 200
      }
    };
  }
  
  // Check if user already owns this card
  const user = await User.findById(this.userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  const alreadyOwns = user.cards.some(c => 
    c.characterId && c.characterId.toString() === card._id.toString()
  );
  
  if (alreadyOwns) {
    // Duplicate → give gems
    const gemsAmount = 200;
    user.gems = (user.gems || 0) + gemsAmount;
    await user.save();
    
    this.reward = {
      type: 'gems',
      gemsAmount: gemsAmount,
      wasDuplicate: true
    };
    this.isOpened = true;
    this.openedAt = new Date();
    await this.save();
    
    return {
      success: true,
      reward: {
        type: 'gems',
        gemsAmount: gemsAmount,
        wasDuplicate: true,
        duplicateCard: card.name
      }
    };
  }
  
  // New card! Add to user's collection
  user.cards.push({
    characterId: card._id,
    characterName: card.name,
    basePower: card.basePower || card.powerLevel || 25,
    currentPower: card.basePower || card.powerLevel || 25,
    level: 1,
    element: card.element || 'Fire',
    rarity: card.rarity || 'Common',
    image: card.image || '',
    unlockedAt: new Date()
  });
  
  await user.save();
  
  // Save reward to chest
  this.reward = {
    type: 'card',
    cardId: card._id,
    cardName: card.name,
    cardRarity: card.rarity || 'Common',
    cardElement: card.element || 'Fire',
    cardImage: card.image || '',
    cardPower: card.basePower || card.powerLevel || 25,
    wasDuplicate: false
  };
  this.isOpened = true;
  this.openedAt = new Date();
  await this.save();
  
  return {
    success: true,
    reward: {
      type: 'card',
      card: {
        id: card._id,
        name: card.name,
        rarity: card.rarity || 'Common',
        element: card.element || 'Fire',
        image: card.image || '',
        power: card.basePower || card.powerLevel || 25
      }
    }
  };
};

// ============================================================
// ✅ STATIC: Create Chests for War Winners
// ============================================================
treasureChestSchema.statics.createChestsForWar = async function(warId, clanId, winnerMembers) {
  const chests = [];
  
  for (const member of winnerMembers) {
    const chest = new this({
      userId: member.userId,
      warId: warId,
      clanId: clanId,
      chestType: 'war_victory',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });
    
    await chest.save();
    chests.push(chest);
  }
  
  return chests;
};

module.exports = mongoose.model('TreasureChest', treasureChestSchema);