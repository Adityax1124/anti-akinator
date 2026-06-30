const express = require('express');
const router = express.Router();
const SeasonWinner = require('../models/SeasonWinner');
const User = require('../models/User');
const { 
  getCurrentSeason, 
  getSeasonDisplayName,
  checkAndResetSeason 
} = require('../utils/seasonUtils');

// ===================== GET LEADERBOARD =====================
router.get('/leaderboard', async (req, res) => {
  try {
    let currentSeason = getCurrentSeason();
    
    try {
      await checkAndResetSeason();
      currentSeason = getCurrentSeason();
    } catch (seasonError) {
      console.error('Season reset error:', seasonError);
    }

    const players = await User.find()
      .select('username seasonStats stats')
      .limit(100);

    // Sort: highest streak first, then FEWEST wins
    const sortedPlayers = players.sort((a, b) => {
      const streakA = a.seasonStats?.seasonStreak || 0;
      const streakB = b.seasonStats?.seasonStreak || 0;
      const winsA = a.seasonStats?.seasonWins || 0;
      const winsB = b.seasonStats?.seasonWins || 0;

      console.log(`Comparing: ${a.username} (streak:${streakA}, wins:${winsA}) vs ${b.username} (streak:${streakB}, wins:${winsB})`);
      
      if (streakA !== streakB) {
        return streakB - streakA;
      }
      return winsA - winsB;
    });

    // Debug: log sorted order
    console.log('📊 Sorted Leaderboard:');
    sortedPlayers.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.username} - Streak: ${p.seasonStats?.seasonStreak || 0}, Wins: ${p.seasonStats?.seasonWins || 0}`);
    });

    const seasonDisplayName = await getSeasonDisplayName(currentSeason);

    const leaderboard = sortedPlayers.map((player, index) => ({
      rank: index + 1,
      username: player.username,
      streak: player.seasonStats?.seasonStreak || player.stats?.winStreak || 0,
      wins: player.seasonStats?.seasonWins || player.stats?.gamesWon || 0,
      gamesPlayed: player.seasonStats?.seasonPlayed || player.stats?.gamesPlayed || 0
    }));

    res.json({
      success: true,
      season: currentSeason,
      seasonDisplayName: `Season ${seasonDisplayName}`,
      leaderboard
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to load leaderboard' 
    });
  }
});

router.get('/winners', async (req, res) => {
  try {
    const winners = await SeasonWinner.find()
      .sort({ season: -1 })
      .limit(20);
    
    const currentSeason = getCurrentSeason();
    const validWinners = winners.filter(w => w.season < currentSeason);
    
    const winnersWithDisplay = [];
    for (const winner of validWinners) {
      const seasonNumber = await getSeasonDisplayName(winner.season);
      winnersWithDisplay.push({
        ...winner.toObject(),
        displayName: `Season ${seasonNumber}`
      });
    }
    
    res.json({ success: true, winners: winnersWithDisplay });
  } catch (error) {
    console.error('Winners error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/current', async (req, res) => {
  try {
    await checkAndResetSeason();
    const season = getCurrentSeason();
    const seasonDisplayName = await getSeasonDisplayName(season);
    res.json({
      success: true,
      season,
      seasonDisplayName: `Season ${seasonDisplayName}`,
      message: `Season ${seasonDisplayName} is live!`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/winner/:season', async (req, res) => {
  try {
    const winner = await SeasonWinner.findOne({ 
      season: parseInt(req.params.season) 
    }).populate('winner', 'username');
    res.json({ success: true, winner });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;