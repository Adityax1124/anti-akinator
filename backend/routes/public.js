const express = require('express');
const router = express.Router();
const User = require('../models/User');
const GameSession = require('../models/GameSession');
const Character = require('../models/Character');

// ===== PUBLIC LEADERBOARD =====
router.get('/leaderboard', async (req, res) => {
  try {
    const topPlayers = await User.find()
      .select('username stats equipped.profilePhoto')
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

module.exports = router;