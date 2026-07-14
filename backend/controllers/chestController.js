const TreasureChest = require('../models/TreasureChest');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Clan = require('../models/Clan');

// ============================================================
// ✅ GET UNOPENED CHESTS
// ============================================================
exports.getUnopenedChests = async (req, res) => {
  try {
    const userId = req.user._id;

    const chests = await TreasureChest.getUnopenedChests(userId);

    // Get chest counts by type
    const totalUnopened = chests.length;
    const warVictoryChests = chests.filter(c => c.chestType === 'war_victory').length;

    res.json({
      success: true,
      chests,
      stats: {
        totalUnopened,
        warVictoryChests,
        otherChests: totalUnopened - warVictoryChests
      }
    });

  } catch (error) {
    console.error('Get unopened chests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chests: ' + error.message
    });
  }
};

// ============================================================
// ✅ GET UNOPENED CHEST COUNT (For notification badge)
// ============================================================
exports.getUnopenedCount = async (req, res) => {
  try {
    const userId = req.user._id;

    const count = await TreasureChest.getUnopenedCount(userId);

    res.json({
      success: true,
      count
    });

  } catch (error) {
    console.error('Get unopened count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chest count: ' + error.message
    });
  }
};

// ============================================================
// ✅ GET CHEST DETAILS
// ============================================================
exports.getChestDetails = async (req, res) => {
  try {
    const userId = req.user._id;
    const { chestId } = req.params;

    const chest = await TreasureChest.findById(chestId)
      .populate('warId', 'clan1Id clan2Id clan1Wins clan2Wins status')
      .populate('clanId', 'name');

    if (!chest) {
      return res.status(404).json({
        success: false,
        message: 'Chest not found'
      });
    }

    // Check if chest belongs to user
    if (chest.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not own this chest'
      });
    }

    // Get war details
    let warDetails = null;
    if (chest.warId) {
      const clan1 = await Clan.findById(chest.warId.clan1Id);
      const clan2 = await Clan.findById(chest.warId.clan2Id);
      
      warDetails = {
        clan1Name: clan1 ? clan1.name : 'Unknown',
        clan2Name: clan2 ? clan2.name : 'Unknown',
        score: chest.warId.getScoreDisplay ? chest.warId.getScoreDisplay() : `${chest.warId.clan1Wins}/10 vs ${chest.warId.clan2Wins}/10`,
        result: chest.warId.winner ? (chest.warId.winner.toString() === chest.warId.clan1Id.toString() ? 'win' : 'loss') : 'draw'
      };
    }

    res.json({
      success: true,
      chest: {
        id: chest._id,
        userId: chest.userId,
        warId: chest.warId,
        clanId: chest.clanId,
        clanName: chest.clanId ? chest.clanId.name : null,
        isOpened: chest.isOpened,
        chestType: chest.chestType,
        createdAt: chest.createdAt,
        expiresAt: chest.expiresAt,
        isExpired: chest.isExpired(),
        warDetails: warDetails,
        reward: chest.isOpened ? chest.reward : null
      }
    });

  } catch (error) {
    console.error('Get chest details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chest details: ' + error.message
    });
  }
};

// ============================================================
// ✅ OPEN CHEST
// ============================================================
exports.openChest = async (req, res) => {
  try {
    const userId = req.user._id;
    const { chestId } = req.params;

    const chest = await TreasureChest.findById(chestId);

    if (!chest) {
      return res.status(404).json({
        success: false,
        message: 'Chest not found'
      });
    }

    // Check if chest belongs to user
    if (chest.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not own this chest'
      });
    }

    // Check if already opened
    if (chest.isOpened) {
      return res.status(400).json({
        success: false,
        message: 'Chest already opened',
        reward: chest.reward
      });
    }

    // Check if expired
    if (chest.isExpired()) {
      return res.status(400).json({
        success: false,
        message: 'Chest has expired'
      });
    }

    // Open the chest
    const result = await chest.openChest();

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || 'Failed to open chest'
      });
    }

    // Mark notification as claimed if exists
    if (chest.notificationId) {
      const notification = await Notification.findById(chest.notificationId);
      if (notification) {
        await notification.markAsClaimed();
      }
    }

    // Create notification that chest was opened
    await Notification.createNotification({
      userId: userId,
      type: 'chest_opened',
      title: '📦 Chest Opened!',
      message: result.reward.type === 'card' 
        ? `You found ${result.reward.card.name} (${result.reward.card.rarity})!` 
        : `You earned ${result.reward.gemsAmount} 💎 gems!`,
      icon: result.reward.type === 'card' ? '🃏' : '💎',
      color: result.reward.type === 'card' ? 'purple' : 'gold',
      data: {
        chestId: chest._id,
        rewardType: result.reward.type,
        rewardAmount: result.reward.type === 'card' ? result.reward.card.name : result.reward.gemsAmount
      },
      priority: 'medium'
    });

    // Prepare response
    const response = {
      success: true,
      message: result.reward.type === 'card' 
        ? `🎉 You got ${result.reward.card.name} (${result.reward.card.rarity})!` 
        : `💎 You earned ${result.reward.gemsAmount} gems!`,
      reward: result.reward
    };

    // Add duplicate info if applicable
    if (result.reward.wasDuplicate) {
      response.message = `💎 You already own ${result.reward.duplicateCard}. Converted to ${result.reward.gemsAmount} gems!`;
    }

    res.json(response);

  } catch (error) {
    console.error('Open chest error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to open chest: ' + error.message
    });
  }
};

// ============================================================
// ✅ GET OPENED CHEST HISTORY
// ============================================================
exports.getChestHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 20;

    const chests = await TreasureChest.getOpenedChests(userId, limit);

    // Get stats
    const totalOpened = chests.length;
    const cardRewards = chests.filter(c => c.reward && c.reward.type === 'card').length;
    const gemRewards = chests.filter(c => c.reward && c.reward.type === 'gems').length;
    const duplicates = chests.filter(c => c.reward && c.reward.wasDuplicate).length;

    res.json({
      success: true,
      chests,
      stats: {
        totalOpened,
        cardRewards,
        gemRewards,
        duplicates
      }
    });

  } catch (error) {
    console.error('Get chest history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chest history: ' + error.message
    });
  }
};

// ============================================================
// ✅ BULK OPEN CHESTS
// ============================================================
exports.bulkOpenChests = async (req, res) => {
  try {
    const userId = req.user._id;
    const { chestIds } = req.body;

    if (!chestIds || !Array.isArray(chestIds) || chestIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide chest IDs to open'
      });
    }

    // Limit to 10 chests at a time
    if (chestIds.length > 10) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 10 chests can be opened at once'
      });
    }

    const results = [];
    let totalCards = 0;
    let totalGems = 0;

    for (const chestId of chestIds) {
      const chest = await TreasureChest.findById(chestId);
      
      if (!chest) {
        results.push({ chestId, success: false, message: 'Chest not found' });
        continue;
      }

      if (chest.userId.toString() !== userId.toString()) {
        results.push({ chestId, success: false, message: 'Not your chest' });
        continue;
      }

      if (chest.isOpened) {
        results.push({ chestId, success: false, message: 'Already opened' });
        continue;
      }

      if (chest.isExpired()) {
        results.push({ chestId, success: false, message: 'Expired' });
        continue;
      }

      try {
        const result = await chest.openChest();
        
        if (result.success) {
          results.push({
            chestId,
            success: true,
            reward: result.reward
          });

          if (result.reward.type === 'card') {
            totalCards++;
          } else {
            totalGems += result.reward.gemsAmount;
          }

          // Mark notification as claimed
          if (chest.notificationId) {
            const notification = await Notification.findById(chest.notificationId);
            if (notification) {
              await notification.markAsClaimed();
            }
          }
        } else {
          results.push({
            chestId,
            success: false,
            message: result.message || 'Failed to open chest'
          });
        }
      } catch (error) {
        results.push({
          chestId,
          success: false,
          message: error.message
        });
      }
    }

    res.json({
      success: true,
      results,
      summary: {
        totalOpened: results.filter(r => r.success).length,
        totalCards,
        totalGems,
        failed: results.filter(r => !r.success).length
      }
    });

  } catch (error) {
    console.error('Bulk open chests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to open chests: ' + error.message
    });
  }
};

// ============================================================
// ✅ GET CHEST STATS
// ============================================================
exports.getChestStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all chests for user
    const allChests = await TreasureChest.find({ userId });
    
    const unopened = allChests.filter(c => !c.isOpened);
    const opened = allChests.filter(c => c.isOpened);
    
    const cardRewards = opened.filter(c => c.reward && c.reward.type === 'card');
    const gemRewards = opened.filter(c => c.reward && c.reward.type === 'gems');
    const duplicates = opened.filter(c => c.reward && c.reward.wasDuplicate);

    // Rarity distribution for card rewards
    const rarityCounts = {
      Common: 0,
      Uncommon: 0,
      Rare: 0,
      Epic: 0,
      Legendary: 0
    };

    for (const chest of cardRewards) {
      if (chest.reward.cardRarity && rarityCounts[chest.reward.cardRarity] !== undefined) {
        rarityCounts[chest.reward.cardRarity]++;
      }
    }

    // Total gems from chests
    let totalGemsFromChests = 0;
    for (const chest of gemRewards) {
      totalGemsFromChests += chest.reward.gemsAmount || 0;
    }

    res.json({
      success: true,
      stats: {
        totalChests: allChests.length,
        unopened: unopened.length,
        opened: opened.length,
        cardRewards: cardRewards.length,
        gemRewards: gemRewards.length,
        duplicates: duplicates.length,
        totalGemsEarned: totalGemsFromChests,
        rarityDistribution: rarityCounts
      }
    });

  } catch (error) {
    console.error('Get chest stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chest stats: ' + error.message
    });
  }
};

// ============================================================
// ✅ GET UPCOMING CHESTS (For notification badge)
// ============================================================
exports.getUpcomingChests = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get chests that will expire soon (within 24 hours)
    const twentyFourHoursFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    const expiringSoon = await TreasureChest.find({
      userId,
      isOpened: false,
      expiresAt: { $lte: twentyFourHoursFromNow, $gt: new Date() }
    }).sort({ expiresAt: 1 });

    res.json({
      success: true,
      expiringSoon: expiringSoon.map(c => ({
        id: c._id,
        expiresAt: c.expiresAt,
        hoursRemaining: Math.floor((c.expiresAt - new Date()) / (60 * 60 * 1000))
      })),
      count: expiringSoon.length
    });

  } catch (error) {
    console.error('Get upcoming chests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get upcoming chests: ' + error.message
    });
  }
};