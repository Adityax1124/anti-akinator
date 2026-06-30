const SeasonWinner = require('../models/SeasonWinner');
const User = require('../models/User');

// Get current season number (YYYYMM format)
function getCurrentSeason() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return parseInt(`${year}${month.toString().padStart(2, '0')}`);
}

// Get display season name (Season 1, Season 2, etc.)
async function getSeasonDisplayName(seasonCode) {
  // Count how many seasons have been completed before this one
  const previousSeasons = await SeasonWinner.countDocuments({
    season: { $lt: seasonCode }
  });
  return previousSeasons + 1;
}

// Check if season has changed and reset if needed
async function checkAndResetSeason() {
  const currentSeason = getCurrentSeason();
  const lastWinner = await SeasonWinner.findOne().sort({ season: -1 });
  const lastSeason = lastWinner?.season || 0;

  if (currentSeason > lastSeason) {
    await resetSeason(currentSeason);
    return true;
  }
  return false;
}

// Reset season stats for all users and save winner
async function resetSeason(newSeason) {
  console.log(`🔄 Resetting season to ${newSeason}...`);
  const previousSeason = newSeason - 1;

  // Check if winner already exists for this season
  const existingWinner = await SeasonWinner.findOne({ season: previousSeason });
  
  if (existingWinner) {
    console.log(`⚠️ Season ${previousSeason} winner already exists: ${existingWinner.username}`);
    // Still reset user stats
    await User.updateMany({}, {
      $set: {
        'seasonStats.currentSeason': newSeason,
        'seasonStats.seasonWins': 0,
        'seasonStats.seasonPlayed': 0,
        'seasonStats.seasonStreak': 0
      }
    });
    console.log(`✅ Season ${newSeason} started successfully!`);
    return;
  }

  // Find winner of previous season (highest streak, fewest wins as tiebreaker)
  const winner = await User.findOne()
    .sort({ 
      'seasonStats.seasonStreak': -1,
      'seasonStats.seasonWins': 1
    });

  // Only save winner if there are actual players with stats
  if (winner && (winner.seasonStats?.seasonStreak > 0 || winner.seasonStats?.seasonWins > 0)) {
    await SeasonWinner.create({
      season: previousSeason,
      winner: winner._id,
      username: winner.username,
      streak: winner.seasonStats?.seasonStreak || 0,
      wins: winner.seasonStats?.seasonWins || 0,
      prize: 2000
    });

    console.log(`🏆 Season ${previousSeason} winner: ${winner.username}`);

    // Update user's season history
    await User.updateOne(
      { _id: winner._id },
      {
        $push: {
          seasonHistory: {
            season: previousSeason,
            wins: winner.seasonStats?.seasonWins || 0,
            streak: winner.seasonStats?.seasonStreak || 0,
            rank: 1,
            isWinner: true
          }
        }
      }
    );
  } else {
    console.log(`⚠️ No valid winner for Season ${previousSeason} - skipping`);
  }

  // Reset all users' season stats
  await User.updateMany({}, {
    $set: {
      'seasonStats.currentSeason': newSeason,
      'seasonStats.seasonWins': 0,
      'seasonStats.seasonPlayed': 0,
      'seasonStats.seasonStreak': 0
    }
  });

  console.log(`✅ Season ${newSeason} started successfully!`);
}

module.exports = { 
  getCurrentSeason, 
  getSeasonDisplayName,
  checkAndResetSeason,
  resetSeason 
};