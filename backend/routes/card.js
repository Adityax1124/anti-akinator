const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const User = require('../models/User');
const Character = require('../models/Character');

// ============================================================
// ✅ GET USER'S CARD COLLECTION
// ============================================================
router.get('/collection', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('cards gems');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Sort cards by power (highest first)
    const cards = user.cards.sort((a, b) => (b.currentPower || b.powerLevel || 0) - (a.currentPower || a.powerLevel || 0));

    // Get total cards and stats
    const totalCards = cards.length;
    const totalPower = cards.reduce((sum, card) => sum + (card.currentPower || card.powerLevel || 0), 0);
    const avgPower = totalCards > 0 ? Math.round(totalPower / totalCards) : 0;

    res.json({
      success: true,
      cards: cards,
      stats: {
        totalCards,
        totalPower,
        avgPower,
        gems: user.gems || 0
      }
    });

  } catch (error) {
    console.error('Get collection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get collection'
    });
  }
});

// ============================================================
// ✅ GET SINGLE CARD DETAILS
// ============================================================
router.get('/card/:characterId', authMiddleware, async (req, res) => {
  try {
    const { characterId } = req.params;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const card = user.cards.find(c => 
      c.characterId && c.characterId.toString() === characterId
    );

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found in your collection'
      });
    }

    // Get upgrade info
    const currentLevel = card.level || 1;
    const upgradeInfo = getUpgradeInfo(currentLevel);
    const canUpgrade = currentLevel < 10 && (user.gems || 0) >= upgradeInfo.cost;

    res.json({
      success: true,
      card: {
        ...card.toObject(),
        upgradeInfo: {
          ...upgradeInfo,
          canUpgrade,
          gemsAvailable: user.gems || 0,
          gemsNeeded: upgradeInfo.cost,
          gemsShort: Math.max(0, upgradeInfo.cost - (user.gems || 0))
        }
      }
    });

  } catch (error) {
    console.error('Get card error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get card details'
    });
  }
});

// ============================================================
// ✅ UPGRADE CARD
// ============================================================
router.post('/upgrade', authMiddleware, async (req, res) => {
  try {
    const { characterId } = req.body;

    if (!characterId) {
      return res.status(400).json({
        success: false,
        message: 'Character ID is required'
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find the card in user's collection
    const cardIndex = user.cards.findIndex(c => 
      c.characterId && c.characterId.toString() === characterId
    );

    if (cardIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Card not found in your collection'
      });
    }

    const card = user.cards[cardIndex];
    const currentLevel = card.level || 1;

    // Check if already at max level
    if (currentLevel >= 10) {
      return res.status(400).json({
        success: false,
        message: 'Card is already at maximum level (Level 10)',
        card: card
      });
    }

    // Calculate upgrade cost
    const upgradeInfo = getUpgradeInfo(currentLevel);
    
    // Check if user has enough gems
    const userGems = user.gems || 0;
    if (userGems < upgradeInfo.cost) {
      return res.status(400).json({
        success: false,
        message: `Not enough gems! Need ${upgradeInfo.cost} gems, have ${userGems}`,
        gemsNeeded: upgradeInfo.cost,
        gemsAvailable: userGems,
        shortBy: upgradeInfo.cost - userGems
      });
    }

    // Deduct gems
    user.gems = userGems - upgradeInfo.cost;

    // Upgrade card
    const oldLevel = currentLevel;
    const oldPower = card.currentPower || card.powerLevel || 0;
    card.level = oldLevel + 1;
    card.currentPower = oldPower + upgradeInfo.powerIncrease;

    // Save user
    await user.save();

    // Log the upgrade
    console.log(`⬆️ ${user.username} upgraded ${card.characterName} from Level ${oldLevel} to Level ${card.level} (${oldPower} → ${card.currentPower})`);

    res.json({
      success: true,
      message: `🎉 ${card.characterName} upgraded to Level ${card.level}!`,
      card: {
        ...card.toObject(),
        oldLevel,
        newLevel: card.level,
        oldPower,
        newPower: card.currentPower,
        powerIncrease: upgradeInfo.powerIncrease,
        gemsSpent: upgradeInfo.cost,
        gemsRemaining: user.gems
      },
      nextUpgrade: (card.level || 1) < 10 ? getUpgradeInfo(card.level || 1) : null
    });

  } catch (error) {
    console.error('Upgrade card error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upgrade card'
    });
  }
});

// ============================================================
// ✅ BULK UPGRADE
// ============================================================
router.post('/upgrade-bulk', authMiddleware, async (req, res) => {
  try {
    const { characterIds } = req.body;

    if (!characterIds || !Array.isArray(characterIds) || characterIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Character IDs array is required'
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const results = [];
    let totalGemsSpent = 0;
    let upgradedCount = 0;

    for (const characterId of characterIds) {
      const cardIndex = user.cards.findIndex(c => 
        c.characterId && c.characterId.toString() === characterId
      );

      if (cardIndex === -1) continue;

      const card = user.cards[cardIndex];
      const currentLevel = card.level || 1;
      
      if (currentLevel >= 10) continue;

      const upgradeInfo = getUpgradeInfo(currentLevel);
      
      if ((user.gems || 0) < upgradeInfo.cost) continue;

      user.gems -= upgradeInfo.cost;
      totalGemsSpent += upgradeInfo.cost;
      
      const oldPower = card.currentPower || card.powerLevel || 0;
      card.level = currentLevel + 1;
      card.currentPower = oldPower + upgradeInfo.powerIncrease;
      
      upgradedCount++;
      results.push({
        characterId: card.characterId,
        characterName: card.characterName,
        newLevel: card.level,
        newPower: card.currentPower,
        powerIncrease: upgradeInfo.powerIncrease,
        gemsSpent: upgradeInfo.cost
      });
    }

    await user.save();

    res.json({
      success: true,
      message: `✅ Upgraded ${upgradedCount} cards!`,
      results,
      totalGemsSpent,
      gemsRemaining: user.gems || 0
    });

  } catch (error) {
    console.error('Bulk upgrade error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upgrade cards'
    });
  }
});

// ============================================================
// ✅ GET UPGRADE COST
// ============================================================
router.get('/upgrade-cost/:level', authMiddleware, async (req, res) => {
  try {
    const level = parseInt(req.params.level);
    
    if (isNaN(level) || level < 1 || level > 10) {
      return res.status(400).json({
        success: false,
        message: 'Invalid level. Must be between 1 and 10'
      });
    }

    const upgradeInfo = getUpgradeInfo(level);
    
    res.json({
      success: true,
      level: level,
      upgradeInfo: upgradeInfo,
      maxLevel: 10,
      isMaxLevel: level >= 10
    });

  } catch (error) {
    console.error('Get upgrade cost error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get upgrade cost'
    });
  }
});

// ============================================================
// ✅ GET RARITY & ELEMENT COLORS
// ============================================================
router.get('/rarity-colors', authMiddleware, async (req, res) => {
  try {
    const rarityColors = {
      'Common': { color: '#a0a0a0', bg: 'rgba(160,160,160,0.1)', border: '#a0a0a0' },
      'Uncommon': { color: '#4ecdc4', bg: 'rgba(78,205,196,0.1)', border: '#4ecdc4' },
      'Rare': { color: '#4a9eff', bg: 'rgba(74,158,255,0.1)', border: '#4a9eff' },
      'Epic': { color: '#a855f7', bg: 'rgba(168,85,247,0.1)', border: '#a855f7' },
      'Legendary': { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: '#f59e0b' }
    };

    const elementColors = {
      'Fire': { color: '#ff6b6b', bg: 'rgba(255,107,107,0.1)', emoji: '🔥' },
      'Water': { color: '#4a9eff', bg: 'rgba(74,158,255,0.1)', emoji: '💧' },
      'Wind': { color: '#4ecdc4', bg: 'rgba(78,205,196,0.1)', emoji: '🌪️' },
      'Earth': { color: '#8b7765', bg: 'rgba(139,119,101,0.1)', emoji: '🌍' }
    };

    res.json({
      success: true,
      rarityColors,
      elementColors
    });

  } catch (error) {
    console.error('Get colors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get colors'
    });
  }
});

// ============================================================
// ✅ HELPER: Get Upgrade Info
// ============================================================
function getUpgradeInfo(level) {
  const upgradeData = {
    1: { cost: 10, powerIncrease: 1, nextLevel: 2 },
    2: { cost: 15, powerIncrease: 1, nextLevel: 3 },
    3: { cost: 20, powerIncrease: 2, nextLevel: 4 },
    4: { cost: 30, powerIncrease: 2, nextLevel: 5 },
    5: { cost: 40, powerIncrease: 2, nextLevel: 6 },
    6: { cost: 55, powerIncrease: 3, nextLevel: 7 },
    7: { cost: 70, powerIncrease: 3, nextLevel: 8 },
    8: { cost: 90, powerIncrease: 4, nextLevel: 9 },
    9: { cost: 120, powerIncrease: 4, nextLevel: 10 },
    10: { cost: 0, powerIncrease: 0, nextLevel: null, isMax: true }
  };

  const info = upgradeData[level] || upgradeData[1];
  return {
    cost: info.cost,
    powerIncrease: info.powerIncrease,
    nextLevel: info.nextLevel,
    isMax: info.isMax || false,
    totalCostToMax: calculateTotalCostToMax(level)
  };
}

// ============================================================
// ✅ HELPER: Calculate Total Cost to Max
// ============================================================
function calculateTotalCostToMax(currentLevel) {
  const costs = {
    1: 10,
    2: 15,
    3: 20,
    4: 30,
    5: 40,
    6: 55,
    7: 70,
    8: 90,
    9: 120
  };

  let total = 0;
  for (let i = currentLevel; i < 10; i++) {
    total += costs[i] || 0;
  }
  return total;
}

module.exports = router;