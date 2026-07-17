const express = require('express');
const router = express.Router();
const User = require('../models/User');
const GameSession = require('../models/GameSession');
const Character = require('../models/Character');

// ============================================================
// PUBLIC LEADERBOARD
// ============================================================
router.get('/leaderboard', async (req, res) => {
  try {
    const topPlayers = await User.find()
      .select('username stats equipped.profilePhoto gems')
      .populate('equipped.profilePhoto', 'imageUrl')
      .sort({ 'stats.winStreak': -1 })
      .limit(50);

    res.json({
      success: true,
      topPlayers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================================
// ✅ GET CHARACTERS FOR QUIZ (ONLY AI DATA - NO BATTLE FIELDS)
// ============================================================
router.get('/quiz-characters', async (req, res) => {
  try {
    // ✅ Only send fields needed for AI quiz
    // EXCLUDE: element, rarity, basePower (battle-only fields)
    const characters = await Character.find(
      { isActive: true },
      'name anime image description crucialHint powerLevel traits attributes'
    );

    res.json({
      success: true,
      characters,
      count: characters.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching quiz characters'
    });
  }
});

// ============================================================
// ✅ GET ALL CHARACTERS FOR COLLECTION (WITH BATTLE DATA)
// ============================================================
router.get('/collection-characters', async (req, res) => {
  try {
    // ✅ Send all fields including battle data
    const characters = await Character.find(
      { isActive: true },
      'name anime image description powerLevel element rarity basePower traits attributes'
    );

    res.json({
      success: true,
      characters,
      count: characters.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching collection characters'
    });
  }
});

// ============================================================
// ✅ GET SINGLE CHARACTER (PUBLIC)
// ============================================================
router.get('/character/:id', async (req, res) => {
  try {
    const character = await Character.findById(req.params.id)
      .select('name anime image description powerLevel element rarity basePower traits attributes');

    if (!character) {
      return res.status(404).json({
        success: false,
        message: 'Character not found'
      });
    }

    res.json({
      success: true,
      character
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching character'
    });
  }
});

// ============================================================
// ✅ GET CHARACTERS BY ELEMENT
// ============================================================
router.get('/characters/element/:element', async (req, res) => {
  try {
    const { element } = req.params;
    
    // Validate element
    const validElements = ['Fire', 'Water', 'Wind', 'Earth'];
    if (!validElements.includes(element)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid element. Must be Fire, Water, Wind, or Earth'
      });
    }

    const characters = await Character.find(
      { isActive: true, element: element },
      'name anime image description powerLevel element rarity basePower'
    );

    res.json({
      success: true,
      element,
      characters,
      count: characters.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching characters by element'
    });
  }
});

// ============================================================
// ✅ GET CHARACTERS BY RARITY
// ============================================================
router.get('/characters/rarity/:rarity', async (req, res) => {
  try {
    const { rarity } = req.params;
    
    // Validate rarity
    const validRarities = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
    if (!validRarities.includes(rarity)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid rarity. Must be Common, Uncommon, Rare, Epic, or Legendary'
      });
    }

    const characters = await Character.find(
      { isActive: true, rarity: rarity },
      'name anime image description powerLevel element rarity basePower'
    );

    res.json({
      success: true,
      rarity,
      characters,
      count: characters.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching characters by rarity'
    });
  }
});

// ============================================================
// ✅ GET RANDOM CHARACTERS (For Collection Discovery)
// ============================================================
router.get('/random-characters/:count', async (req, res) => {
  try {
    const count = parseInt(req.params.count) || 10;
    const maxCount = Math.min(count, 50); // Limit to 50

    const characters = await Character.aggregate([
      { $match: { isActive: true } },
      { $sample: { size: maxCount } },
      { $project: { 
          name: 1, 
          anime: 1, 
          image: 1, 
          description: 1,
          powerLevel: 1,
          element: 1,
          rarity: 1,
          basePower: 1
        }
      }
    ]);

    res.json({
      success: true,
      characters,
      count: characters.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching random characters'
    });
  }
});

// ============================================================
// ✅ GET ELEMENT STATISTICS
// ============================================================
router.get('/element-stats', async (req, res) => {
  try {
    const stats = await Character.aggregate([
      { $match: { isActive: true } },
      { $group: {
          _id: '$element',
          count: { $sum: 1 },
          avgPower: { $avg: '$powerLevel' },
          maxPower: { $max: '$powerLevel' },
          minPower: { $min: '$powerLevel' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Add element emojis
    const elementEmojis = {
      'Fire': '🔥',
      'Water': '💧',
      'Wind': '🌪️',
      'Earth': '🌍'
    };

    const formattedStats = stats.map(stat => ({
      element: stat._id,
      emoji: elementEmojis[stat._id] || '❓',
      count: stat.count,
      avgPower: Math.round(stat.avgPower * 10) / 10,
      maxPower: stat.maxPower,
      minPower: stat.minPower
    }));

    res.json({
      success: true,
      stats: formattedStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching element statistics'
    });
  }
});

// ============================================================
// ✅ GET RARITY STATISTICS
// ============================================================
router.get('/rarity-stats', async (req, res) => {
  try {
    const stats = await Character.aggregate([
      { $match: { isActive: true } },
      { $group: {
          _id: '$rarity',
          count: { $sum: 1 },
          avgPower: { $avg: '$powerLevel' },
          maxPower: { $max: '$powerLevel' },
          minPower: { $min: '$powerLevel' }
        }
      },
      { $sort: { 
          $switch: {
            branches: [
              { case: { $eq: ['$_id', 'Legendary'] }, then: 1 },
              { case: { $eq: ['$_id', 'Epic'] }, then: 2 },
              { case: { $eq: ['$_id', 'Rare'] }, then: 3 },
              { case: { $eq: ['$_id', 'Uncommon'] }, then: 4 },
              { case: { $eq: ['$_id', 'Common'] }, then: 5 }
            ],
            default: 6
          }
        }
      }
    ]);

    const rarityStars = {
      'Common': '⭐',
      'Uncommon': '⭐⭐',
      'Rare': '⭐⭐⭐',
      'Epic': '⭐⭐⭐⭐',
      'Legendary': '⭐⭐⭐⭐⭐'
    };

    const formattedStats = stats.map(stat => ({
      rarity: stat._id,
      stars: rarityStars[stat._id] || '⭐',
      count: stat.count,
      avgPower: Math.round(stat.avgPower * 10) / 10,
      maxPower: stat.maxPower,
      minPower: stat.minPower
    }));

    res.json({
      success: true,
      stats: formattedStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching rarity statistics'
    });
  }
});

// ============================================================
// ✅ SEARCH CHARACTERS
// ============================================================
router.get('/search', async (req, res) => {
  try {
    const { q, element, rarity, limit = 20 } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const query = {
      isActive: true,
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { anime: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ]
    };

    if (element) {
      const validElements = ['Fire', 'Water', 'Wind', 'Earth'];
      if (validElements.includes(element)) {
        query.element = element;
      }
    }

    if (rarity) {
      const validRarities = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
      if (validRarities.includes(rarity)) {
        query.rarity = rarity;
      }
    }

    const characters = await Character.find(query)
      .select('name anime image description powerLevel element rarity basePower')
      .limit(Math.min(parseInt(limit), 50));

    res.json({
      success: true,
      characters,
      count: characters.length,
      query: q
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error searching characters'
    });
  }
});

module.exports = router;