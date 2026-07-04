import api from './axios';

// ============================================================
// CARD API - Collection & Upgrade
// ============================================================

/**
 * Get user's card collection
 * @returns {Promise} - { cards, stats }
 */
export const getCollection = async () => {
  try {
    const response = await api.get('/cards/collection');
    return response.data;
  } catch (error) {
    console.error('Get collection error:', error);
    throw error.response?.data || { success: false, message: 'Failed to fetch collection' };
  }
};

/**
 * Get single card details
 * @param {string} characterId - Card character ID
 * @returns {Promise} - { card, upgradeInfo }
 */
export const getCard = async (characterId) => {
  try {
    const response = await api.get(`/cards/card/${characterId}`);
    return response.data;
  } catch (error) {
    console.error('Get card error:', error);
    throw error.response?.data || { success: false, message: 'Failed to fetch card' };
  }
};

/**
 * Upgrade a card
 * @param {string} characterId - Card character ID
 * @returns {Promise} - { card, message, gemsRemaining }
 */
export const upgradeCard = async (characterId) => {
  try {
    const response = await api.post('/cards/upgrade', { characterId });
    return response.data;
  } catch (error) {
    console.error('Upgrade card error:', error);
    throw error.response?.data || { success: false, message: 'Failed to upgrade card' };
  }
};

/**
 * Upgrade multiple cards at once
 * @param {string[]} characterIds - Array of card character IDs
 * @returns {Promise} - { results, totalGemsSpent, gemsRemaining }
 */
export const upgradeCardsBulk = async (characterIds) => {
  try {
    const response = await api.post('/cards/upgrade-bulk', { characterIds });
    return response.data;
  } catch (error) {
    console.error('Bulk upgrade error:', error);
    throw error.response?.data || { success: false, message: 'Failed to upgrade cards' };
  }
};

/**
 * Get upgrade cost for a specific level
 * @param {number} level - Current card level (1-10)
 * @returns {Promise} - { level, upgradeInfo, maxLevel, isMaxLevel }
 */
export const getUpgradeCost = async (level) => {
  try {
    const response = await api.get(`/cards/upgrade-cost/${level}`);
    return response.data;
  } catch (error) {
    console.error('Get upgrade cost error:', error);
    throw error.response?.data || { success: false, message: 'Failed to get upgrade cost' };
  }
};

/**
 * Get rarity and element colors for UI
 * @returns {Promise} - { rarityColors, elementColors }
 */
export const getCardColors = async () => {
  try {
    const response = await api.get('/cards/rarity-colors');
    return response.data;
  } catch (error) {
    console.error('Get card colors error:', error);
    throw error.response?.data || { success: false, message: 'Failed to get card colors' };
  }
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Get upgrade cost and power increase for a level (client-side)
 * @param {number} level - Current level (1-10)
 * @returns {Object} - { cost, powerIncrease, nextLevel, isMax }
 */
export const getUpgradeInfo = (level) => {
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
  return upgradeData[level] || upgradeData[1];
};

/**
 * Calculate total cost to reach max level (Level 10)
 * @param {number} currentLevel - Current level (1-10)
 * @returns {number} - Total gems needed
 */
export const getTotalCostToMax = (currentLevel) => {
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
};

/**
 * Get rarity color for a card
 * @param {string} rarity - Card rarity (Common, Uncommon, Rare, Epic, Legendary)
 * @returns {string} - Hex color code
 */
export const getRarityColor = (rarity) => {
  const colors = {
    'Common': '#a0a0a0',
    'Uncommon': '#4ecdc4',
    'Rare': '#4a9eff',
    'Epic': '#a855f7',
    'Legendary': '#f59e0b'
  };
  return colors[rarity] || '#a0a0a0';
};

/**
 * Get element emoji for a card
 * @param {string} element - Card element (Fire, Water, Wind, Earth)
 * @returns {string} - Emoji
 */
export const getElementEmoji = (element) => {
  const emojis = {
    'Fire': '🔥',
    'Water': '💧',
    'Wind': '🌪️',
    'Earth': '🌍'
  };
  return emojis[element] || '❓';
};

/**
 * Get rarity stars for a card
 * @param {string} rarity - Card rarity (Common, Uncommon, Rare, Epic, Legendary)
 * @returns {string} - Star string
 */
export const getRarityStars = (rarity) => {
  const stars = {
    'Common': '⭐',
    'Uncommon': '⭐⭐',
    'Rare': '⭐⭐⭐',
    'Epic': '⭐⭐⭐⭐',
    'Legendary': '⭐⭐⭐⭐⭐'
  };
  return stars[rarity] || '⭐';
};

/**
 * Check if user can upgrade a card
 * @param {Object} card - Card object
 * @param {number} userGems - User's current gems
 * @returns {Object} - { canUpgrade, cost, powerIncrease, gemsNeeded }
 */
export const canUpgradeCard = (card, userGems) => {
  const level = card.level || 1;
  const isMax = level >= 10;
  const upgradeInfo = getUpgradeInfo(level);
  
  return {
    canUpgrade: !isMax && userGems >= upgradeInfo.cost,
    cost: upgradeInfo.cost,
    powerIncrease: upgradeInfo.powerIncrease,
    nextLevel: upgradeInfo.nextLevel,
    isMax,
    gemsNeeded: Math.max(0, upgradeInfo.cost - userGems)
  };
};

/**
 * Format card for display
 * @param {Object} card - Card object from API
 * @returns {Object} - Formatted card with display properties
 */
export const formatCard = (card) => {
  return {
    ...card,
    displayPower: card.currentPower || card.powerLevel || 0,
    displayLevel: card.level || 1,
    displayElement: card.element || 'Fire',
    displayRarity: card.rarity || 'Common',
    rarityColor: getRarityColor(card.rarity),
    elementEmoji: getElementEmoji(card.element),
    rarityStars: getRarityStars(card.rarity),
    upgradeInfo: getUpgradeInfo(card.level || 1),
    progressToMax: ((card.level || 1) / 10) * 100
  };
};

export default {
  getCollection,
  getCard,
  upgradeCard,
  upgradeCardsBulk,
  getUpgradeCost,
  getCardColors,
  getUpgradeInfo,
  getTotalCostToMax,
  getRarityColor,
  getElementEmoji,
  getRarityStars,
  canUpgradeCard,
  formatCard
};