const express = require('express');
const SeasonWinner = require('../models/SeasonWinner');
const User = require('../models/User');
const { getCurrentSeason, getSeasonDisplayName } = require('../utils/seasonUtils');
const router = express.Router();

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
      winners: winnersWithDisplay
    });
  } catch (error) {
    console.error('Error fetching season winners:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching season winners'
    });
  }
});

// ===================== GET SINGLE SEASON WINNER =====================
router.get('/winners/:season', async (req, res) => {
  try {
    const { season } = req.params;
    
    const winner = await SeasonWinner.findOne({ season: parseInt(season) });
    
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
    console.error('Error fetching season winner:', error);
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
    console.error('Error fetching current season:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching current season'
    });
  }
});

// ===================== GET LEADERBOARD =====================
router.get('/leaderboard', async (req, res) => {
  try {
    const { limit = 50, season } = req.query;
    
    const currentSeasonCode = getCurrentSeason();
    const displayNumber = await getSeasonDisplayName(currentSeasonCode);
    
    if (season) {
      const seasonWinners = await SeasonWinner.find({ season: parseInt(season) });
      const seasonDisplayNumber = await getSeasonDisplayName(parseInt(season));
      
      return res.json({
        success: true,
        season: parseInt(season),
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
      'seasonStats.seasonWins': -1,
      'seasonStats.seasonStreak': -1,
      'seasonStats.seasonPlayed': -1
    })
    .limit(parseInt(limit));

    // Format leaderboard with profile photo
    const leaderboard = users.map((user, index) => {
      // Get the equipped profile photo URL
      let profilePhotoUrl = null;
      
      // Check if user has an equipped profile photo
      if (user.equipped?.profilePhoto) {
        // If it's populated, get the imageUrl
        if (user.equipped.profilePhoto.imageUrl) {
          profilePhotoUrl = user.equipped.profilePhoto.imageUrl;
        }
      }
      
      // If no equipped photo, check achievements for equipped
      if (!profilePhotoUrl && user.achievements?.profilePhotos) {
        const equippedPhoto = user.achievements.profilePhotos.find(
          p => p.isEquipped === true
        );
        if (equippedPhoto && equippedPhoto.photoId) {
          // Try to get imageUrl if populated
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
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching leaderboard'
    });
  }
});

// ===================== GET SEASON RANK =====================
router.get('/rank/:userId', async (req, res) => {
  try {
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
    console.error('Error fetching user rank:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user rank'
    });
  }
});

module.exports = router;