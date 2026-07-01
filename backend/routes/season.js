const express = require('express');
const { param, query, validationResult } = require('express-validator');
const SeasonWinner = require('../models/SeasonWinner');
const User = require('../models/User');
const { getCurrentSeason, getSeasonDisplayName } = require('../utils/seasonUtils');
const router = express.Router();

// ===== HELPER: Sanitize input =====
function sanitizeInput(str) {
  if (!str) return '';
  return str.replace(/[<>]/g, '').trim();
}

// ===== VALIDATION RULES =====
const validateSeason = [
  param('season')
    .optional()
    .isInt({ min: 202001, max: 209912 })
    .withMessage('Invalid season format')
];

const validateUserId = [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID format')
];

const validateLeaderboard = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('season')
    .optional()
    .isInt({ min: 202001, max: 209912 })
    .withMessage('Invalid season format')
];

// ===================== GET ALL SEASON WINNERS =====================
router.get('/winners', async (req, res) => {
  try {
    const winners = await SeasonWinner.find()
      .sort({ season: -1 })
      .lean();

    const winnersWithDisplay = await Promise.all(
      winners.map(async (winner) => {
        const displayNumber = await getSeasonDisplayName(winner.season);
        return {
          ...winner,
          displaySeason: `Season ${displayNumber}`,
          seasonCode: winner.season
        };
      })
    );

    const currentSeasonCode = getCurrentSeason();
    const currentDisplayNumber = await getSeasonDisplayName(currentSeasonCode);

    res.json({
      success: true,
      currentSeason: {
        code: currentSeasonCode,
        display: `Season ${currentDisplayNumber}`
      },
      winners: winnersWithDisplay,
      count: winnersWithDisplay.length
    });
  } catch (error) {
    console.error('Error fetching season winners:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching season winners'
    });
  }
});

// ===================== GET SINGLE SEASON WINNER =====================
router.get('/winners/:season', validateSeason, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      });
    }

    const { season } = req.params;
    const sanitizedSeason = parseInt(sanitizeInput(season));
    
    const winner = await SeasonWinner.findOne({ season: sanitizedSeason });
    
    if (!winner) {
      return res.status(404).json({
        success: false,
        message: 'No winner found for this season'
      });
    }

    const displayNumber = await getSeasonDisplayName(winner.season);

    res.json({
      success: true,
      winner: {
        ...winner.toObject(),
        displaySeason: `Season ${displayNumber}`
      }
    });
  } catch (error) {
    console.error('Error fetching season winner:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching season winner'
    });
  }
});

// ===================== GET CURRENT SEASON =====================
router.get('/current', async (req, res) => {
  try {
    const currentSeasonCode = getCurrentSeason();
    const displayNumber = await getSeasonDisplayName(currentSeasonCode);
    
    res.json({
      success: true,
      season: currentSeasonCode,
      display: `Season ${displayNumber}`
    });
  } catch (error) {
    console.error('Error fetching current season:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching current season'
    });
  }
});

// ===================== GET LEADERBOARD =====================
router.get('/leaderboard', validateLeaderboard, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      });
    }

    const { limit = 50, season } = req.query;
    const sanitizedLimit = Math.min(parseInt(limit) || 50, 100);
    
    const currentSeasonCode = getCurrentSeason();
    const displayNumber = await getSeasonDisplayName(currentSeasonCode);
    
    if (season) {
      const sanitizedSeason = parseInt(sanitizeInput(season));
      const seasonWinners = await SeasonWinner.find({ season: sanitizedSeason });
      const seasonDisplayNumber = await getSeasonDisplayName(sanitizedSeason);
      
      return res.json({
        success: true,
        season: sanitizedSeason,
        seasonDisplayName: `Season ${seasonDisplayNumber}`,
        leaderboard: seasonWinners.map((w, index) => ({
          rank: index + 1,
          username: w.username,
          wins: w.wins,
          streak: w.streak,
          prize: w.prize
        }))
      });
    }
    
    // Find top players for current season WITH profile photo
    const users = await User.find({
      'seasonStats.currentSeason': currentSeasonCode
    })
    .select('username seasonStats stats shards equipped achievements')
    .populate({
      path: 'equipped.profilePhoto',
      select: 'imageUrl'
    })
    .sort({ 
      'seasonStats.seasonStreak': -1,  
      'seasonStats.seasonWins': 1,     
      'seasonStats.seasonPlayed': -1
    })
    .limit(sanitizedLimit);

    // Format leaderboard with profile photo
    const leaderboard = users.map((user, index) => {
      let profilePhotoUrl = null;
      
      if (user.equipped?.profilePhoto) {
        if (user.equipped.profilePhoto.imageUrl) {
          profilePhotoUrl = user.equipped.profilePhoto.imageUrl;
        }
      }
      
      if (!profilePhotoUrl && user.achievements?.profilePhotos) {
        const equippedPhoto = user.achievements.profilePhotos.find(
          p => p.isEquipped === true
        );
        if (equippedPhoto && equippedPhoto.photoId) {
          if (equippedPhoto.photoId.imageUrl) {
            profilePhotoUrl = equippedPhoto.photoId.imageUrl;
          }
        }
      }
      
      return {
        rank: index + 1,
        username: user.username,
        wins: user.seasonStats?.seasonWins || 0,
        streak: user.seasonStats?.seasonStreak || 0,
        played: user.seasonStats?.seasonPlayed || 0,
        shards: user.shards || 0,
        profilePhoto: profilePhotoUrl
      };
    });

    res.json({
      success: true,
      season: currentSeasonCode,
      seasonDisplayName: `Season ${displayNumber}`,
      leaderboard: leaderboard,
      totalPlayers: users.length
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching leaderboard'
    });
  }
});

// ===================== GET SEASON RANK =====================
router.get('/rank/:userId', validateUserId, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      });
    }

    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const currentSeason = getCurrentSeason();
    
    // Get all users with season stats for current season
    const allUsers = await User.find({
      'seasonStats.currentSeason': currentSeason
    })
    .select('username seasonStats')
    .sort({ 
      'seasonStats.seasonWins': -1,
      'seasonStats.seasonStreak': -1
    });

    // Find user's rank
    const rank = allUsers.findIndex(u => u._id.toString() === userId) + 1;

    res.json({
      success: true,
      rank: rank > 0 ? rank : null,
      totalPlayers: allUsers.length,
      season: currentSeason,
      userStats: user.seasonStats
    });
  } catch (error) {
    console.error('Error fetching user rank:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching user rank'
    });
  }
});

module.exports = router;