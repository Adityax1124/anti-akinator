// /backend/controllers/seasonController.js
const User = require('../models/User');
const SeasonPass = require('../models/SeasonPass');

// ============================================================
// @desc    Get season leaderboard
// @route   GET /api/season/leaderboard
// @access  Private
// ============================================================
exports.getLeaderboard = async (req, res) => {
  try {
    // Get all users sorted by games won
    const users = await User.find()
      .sort({ 'stats.gamesWon': -1 })
      .limit(100)
      .select('username profilePhoto stats seasonPass');

    const leaderboard = users.map((user, index) => ({
      _id: user._id,
      username: user.username || 'Unknown',
      profilePhoto: user.profilePhoto || null,
      wins: user.stats?.gamesWon || 0,
      streak: user.stats?.winStreak || 0,
      rank: index + 1,
      // ✅ ADD THIS - Season Pass Status
      isSeasonPassActive: user.seasonPass?.active || false
    }));

    res.status(200).json({
      success: true,
      season: 1,
      seasonDisplayName: 'Season 1',
      leaderboard: leaderboard
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to load leaderboard'
    });
  }
};

// ============================================================
// @desc    Get current season status
// @route   GET /api/season/status
// @access  Private
// ============================================================
exports.getSeasonStatus = async (req, res) => {
  try {
    // Get current season (you might have a Season model)
    // For now, return default values
    res.status(200).json({
      success: true,
      season: 1,
      seasonDisplayName: 'Season 1',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get season status'
    });
  }
};