const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const User = require('../models/User');
const Character = require('../models/Character');

// ============================================================
// ✅ HELPER: Get Upgrade Cost based on Rarity and Level
// ============================================================
function getUpgradeCost(rarity, level) {
  const baseCosts = {
    'Common': 10,
    'Uncommon': 40,
    'Rare': 85,
    'Epic': 200,
    'Legendary': 450
  };
  
  const base = baseCosts[rarity] || 10;
  const multiplier = 1.3; // 30% increase per level
  
  if (level >= 10) return 0;
  return Math.round(base * Math.pow(multiplier, level - 1));
}

// ============================================================
// ✅ HELPER: Get Power Increase based on Level
// ============================================================
function getPowerIncrease(level) {
  const increases = {
    1: 1,
    2: 1,
    3: 2,
    4: 2,
    5: 2,
    6: 3,
    7: 3,
    8: 4,
    9: 4,
    10: 5
  };
  return increases[level] || 5;
}

// ============================================================
// ✅ HELPER: Get Upgrade Info (UPDATED with Rarity)
// ============================================================
function getUpgradeInfo(rarity, level) {
  if (level >= 10) {
    return {
      cost: 0,
      powerIncrease: 0,
      nextLevel: null,
      isMax: true,
      totalCostToMax: 0
    };
  }

  const cost = getUpgradeCost(rarity, level);
  const powerIncrease = getPowerIncrease(level);

  return {
    cost: cost,
    powerIncrease: powerIncrease,
    nextLevel: level + 1,
    isMax: false,
    totalCostToMax: calculateTotalCostToMax(rarity, level)
  };
}

// ============================================================
// ✅ HELPER: Calculate Total Cost to Max (UPDATED with Rarity)
// ============================================================
function calculateTotalCostToMax(rarity, currentLevel) {
  let total = 0;
  for (let i = currentLevel; i < 10; i++) {
    total += getUpgradeCost(rarity, i);
  }
  return total;
}

// ============================================================
// ✅ HELPER: Get Sell Price for Card (CORRECTED)
// ============================================================
function getSellPrice(card) {
  const basePrices = {
    'Common': 5,
    'Uncommon': 25,
    'Rare': 60,
    'Epic': 150,
    'Legendary': 350
  };

  const levelBonus = {
    'Common': { 1: 0, 2: 3, 3: 6, 4: 9, 5: 15, 6: 18, 7: 21, 8: 25, 9: 30, 10: 35 },
    'Uncommon': { 1: 0, 2: 4, 3: 8, 4: 12, 5: 15, 6: 20, 7: 25, 8: 30, 9: 35, 10: 40 },
    'Rare': { 1: 0, 2: 5, 3: 10, 4: 15, 5: 25, 6: 30, 7: 35, 8: 40, 9: 50, 10: 60 },
    'Epic': { 1: 0, 2: 10, 3: 20, 4: 30, 5: 50, 6: 65, 7: 80, 8: 95, 9: 110, 10: 130 },
    'Legendary': { 1: 0, 2: 20, 3: 40, 4: 60, 5: 100, 6: 130, 7: 160, 8: 190, 9: 220, 10: 250 }
  };

  const rarity = card.rarity || 'Common';
  const level = card.level || 1;
  const basePrice = basePrices[rarity] || 5;
  const bonus = levelBonus[rarity]?.[level] || 0;
  
  return basePrice + bonus;
}

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

    const cards = user.cards.sort((a, b) => (b.currentPower || b.powerLevel || 0) - (a.currentPower || a.powerLevel || 0));

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
    res.status(500).json({
      success: false,
      message: 'Failed to get collection'
    });
  }
});

// ============================================================
// ✅ GET SINGLE CARD DETAILS (UPDATED with Rarity)
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

    const currentLevel = card.level || 1;
    const rarity = card.rarity || 'Common';
    const upgradeInfo = getUpgradeInfo(rarity, currentLevel);
    const canUpgrade = currentLevel < 10 && (user.gems || 0) >= upgradeInfo.cost;
    const sellPrice = getSellPrice(card);

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
        },
        sellPrice: sellPrice
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get card details'
    });
  }
});

// ============================================================
// ✅ UPGRADE CARD (UPDATED with Rarity)
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
    const rarity = card.rarity || 'Common';

    if (currentLevel >= 10) {
      return res.status(400).json({
        success: false,
        message: 'Card is already at maximum level (Level 10)',
        card: card
      });
    }

    const upgradeInfo = getUpgradeInfo(rarity, currentLevel);
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

    user.gems = userGems - upgradeInfo.cost;
    const oldLevel = currentLevel;
    const oldPower = card.currentPower || card.powerLevel || 0;
    card.level = oldLevel + 1;
    card.currentPower = Number((oldPower + upgradeInfo.powerIncrease).toFixed(1));

    await user.save();


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
        gemsRemaining: user.gems,
        rarity: rarity
      },
      nextUpgrade: (card.level || 1) < 10 ? getUpgradeInfo(rarity, card.level || 1) : null
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to upgrade card: ' + error.message
    });
  }
});

// ============================================================
// ✅ BULK UPGRADE (UPDATED with Rarity)
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
      const rarity = card.rarity || 'Common';
      
      if (currentLevel >= 10) continue;

      const upgradeInfo = getUpgradeInfo(rarity, currentLevel);
      
      if ((user.gems || 0) < upgradeInfo.cost) continue;

      user.gems -= upgradeInfo.cost;
      totalGemsSpent += upgradeInfo.cost;
      
      const oldPower = card.currentPower || card.powerLevel || 0;
      card.level = currentLevel + 1;
      card.currentPower = Number((oldPower + upgradeInfo.powerIncrease).toFixed(1));
      
      upgradedCount++;
      results.push({
        characterId: card.characterId,
        characterName: card.characterName,
        rarity: rarity,
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
    res.status(500).json({
      success: false,
      message: 'Failed to upgrade cards'
    });
  }
});

// ============================================================
// ✅ SELL CARD
// ============================================================
router.post('/sell', authMiddleware, async (req, res) => {
  try {
    const { cardId } = req.body;

    if (!cardId) {
      return res.status(400).json({
        success: false,
        message: 'Card ID is required'
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
      c.characterId && c.characterId.toString() === cardId
    );

    if (cardIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Card not found in your collection'
      });
    }

    const card = user.cards[cardIndex];

    // Check if user has at least 10 cards (minimum for battle)
    if (user.cards.length <= 10) {
      return res.status(400).json({
        success: false,
        message: 'You need at least 10 cards for battles. Cannot sell when you have 10 or fewer cards.',
        totalCards: user.cards.length,
        minimumRequired: 10
      });
    }

    // Calculate sell price
    const sellPrice = getSellPrice(card);

    // Remove card from collection
    user.cards.splice(cardIndex, 1);

    // Add gems to user
    user.gems = (user.gems || 0) + sellPrice;

    await user.save();

    res.json({
      success: true,
      message: `✅ ${card.characterName} sold for ${sellPrice} gems!`,
      cardSold: {
        characterName: card.characterName,
        rarity: card.rarity,
        level: card.level,
        power: card.currentPower || card.powerLevel,
        sellPrice: sellPrice
      },
      gemsEarned: sellPrice,
      gemsRemaining: user.gems,
      totalCardsRemaining: user.cards.length
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to sell card: ' + error.message
    });
  }
});

// ============================================================
// ✅ GET UPGRADE COST (UPDATED with Rarity)
// ============================================================
router.get('/upgrade-cost/:rarity/:level', authMiddleware, async (req, res) => {
  try {
    const { rarity, level } = req.params;
    const parsedLevel = parseInt(level);
    
    if (isNaN(parsedLevel) || parsedLevel < 1 || parsedLevel > 10) {
      return res.status(400).json({
        success: false,
        message: 'Invalid level. Must be between 1 and 10'
      });
    }

    const validRarities = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
    if (!validRarities.includes(rarity)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid rarity. Must be Common, Uncommon, Rare, Epic, or Legendary'
      });
    }

    const upgradeInfo = getUpgradeInfo(rarity, parsedLevel);
    
    // Get all costs for this rarity
    const allCosts = {};
    for (let i = 1; i < 10; i++) {
      allCosts[i] = getUpgradeCost(rarity, i);
    }
    
    res.json({
      success: true,
      rarity: rarity,
      level: parsedLevel,
      upgradeInfo: upgradeInfo,
      maxLevel: 10,
      isMaxLevel: parsedLevel >= 10,
      allCosts: allCosts,
      totalCostToMax: calculateTotalCostToMax(rarity, parsedLevel)
    });

  } catch (error) {
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
    res.status(500).json({
      success: false,
      message: 'Failed to get colors'
    });
  }
});

// ============================================================
// ✅ GET SELL PRICE FOR A CARD (Preview)
// ============================================================
router.get('/sell-price/:cardId', authMiddleware, async (req, res) => {
  try {
    const { cardId } = req.params;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const card = user.cards.find(c => 
      c.characterId && c.characterId.toString() === cardId
    );

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found in your collection'
      });
    }

    const sellPrice = getSellPrice(card);

    res.json({
      success: true,
      sellPrice: sellPrice,
      card: {
        characterName: card.characterName,
        rarity: card.rarity,
        level: card.level,
        power: card.currentPower || card.powerLevel
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get sell price'
    });
  }
});

module.exports = router;