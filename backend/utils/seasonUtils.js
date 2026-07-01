const SeasonWinner = require('../models/SeasonWinner');
const User = require('../models/User');

// ===== STATE TO PREVENT MULTIPLE RESETS =====
let isResetting = false;
let lastResetSeason = 0;

// Get current season number (YYYYMM format)
function getCurrentSeason() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return parseInt(`${year}${month.toString().padStart(2, '0')}`);
}

// Get display season name (Season 1, Season 2, etc.)
async function getSeasonDisplayName(seasonCode) {
  const previousSeasons = await SeasonWinner.countDocuments({
    season: { $lt: seasonCode }
  });
  return previousSeasons + 1;
}

// ===== ✅ CORRECT: Reset ONLY when the month changes =====
async function shouldResetSeason() {
  const currentSeason = getCurrentSeason();
  const lastWinner = await SeasonWinner.findOne().sort({ season: -1 });
  const lastRecordedSeason = lastWinner?.season || 0;
  
  // If no previous season exists, start fresh without resetting
  if (lastRecordedSeason === 0) {
    console.log(`🆕 No previous season found. Starting fresh with ${currentSeason}.`);
    return false;
  }
  
  // ✅ STRICT: Only reset if the month has actually changed
  const shouldReset = currentSeason > lastRecordedSeason;
  
  if (shouldReset) {
    console.log(`🔄 Month change detected: ${lastRecordedSeason} → ${currentSeason}`);
  } else {
    console.log(`✅ No month change. Current: ${currentSeason}, Last: ${lastRecordedSeason}`);
  }
  
  return shouldReset;
}

// Check if season has changed and reset if needed
async function checkAndResetSeason() {
  const currentSeason = getCurrentSeason();
  
  // ===== GUARD 1: Prevent resetting the same season twice =====
  if (lastResetSeason === currentSeason) {
    console.log(`⏭️ Season ${currentSeason} already reset, skipping...`);
    return false;
  }
  
  // ===== GUARD 2: Prevent concurrent resets =====
  if (isResetting) {
    console.log('⏳ Season reset already in progress, skipping...');
    return false;
  }
  
  // ===== GUARD 3: STRICT MONTH-CHANGE CHECK =====
  const needsReset = await shouldResetSeason();
  if (!needsReset) {
    return false;
  }
  
  isResetting = true;
  try {
    await resetSeason(currentSeason);
    lastResetSeason = currentSeason;
    return true;
  } finally {
    isResetting = false;
  }
}

// ===== NEW: Separate function to reset user stats =====
async function resetAllUserStats(newSeason) {
  await User.updateMany({}, {
    $set: {
      'seasonStats.currentSeason': newSeason,
      'seasonStats.seasonWins': 0,
      'seasonStats.seasonPlayed': 0,
      'seasonStats.seasonStreak': 0
    }
  });
}

// Reset season stats for all users and save winner
async function resetSeason(newSeason) {
  console.log(`🔄 Resetting season to ${newSeason}...`);
  
  // ===== Get actual previous season from users =====
  const sampleUser = await User.findOne({ 'seasonStats.currentSeason': { $exists: true } });
  const actualPreviousSeason = sampleUser?.seasonStats?.currentSeason || newSeason - 1;
  const previousSeason = actualPreviousSeason;
  
  console.log(`📅 Previous season detected: ${previousSeason}`);

  // Check if winner already exists for this season
  const existingWinner = await SeasonWinner.findOne({ season: previousSeason });
  
  if (existingWinner) {
    console.log(`⚠️ Season ${previousSeason} winner already exists: ${existingWinner.username}`);
    // Still reset user stats
    await resetAllUserStats(newSeason);
    console.log(`✅ Season ${newSeason} started successfully (winner already existed)!`);
    return;
  }

  // Find winner of previous season
  const winner = await User.findOne({
    'seasonStats.currentSeason': previousSeason
  })
  .sort({ 
    'seasonStats.seasonStreak': -1,
    'seasonStats.seasonWins': -1
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

    // Update winner's season history
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
    
    // ===== Save history for ALL users (not just winner) =====
    const allUsers = await User.find({
      'seasonStats.currentSeason': previousSeason,
      $or: [
        { 'seasonStats.seasonWins': { $gt: 0 } },
        { 'seasonStats.seasonPlayed': { $gt: 0 } }
      ]
    });
    
    let historyCount = 0;
    for (const user of allUsers) {
      if (user._id.toString() === winner._id.toString()) continue;
      
      await User.updateOne(
        { _id: user._id },
        {
          $push: {
            seasonHistory: {
              season: previousSeason,
              wins: user.seasonStats?.seasonWins || 0,
              streak: user.seasonStats?.seasonStreak || 0,
              rank: null,
              isWinner: false
            }
          }
        }
      );
      historyCount++;
    }
    console.log(`📜 Saved seasonHistory for ${historyCount} other players`);

  } else {
    console.log(`⚠️ No valid winner for Season ${previousSeason} - skipping`);
  }

  // Reset all users' season stats
  await resetAllUserStats(newSeason);

  console.log(`✅ Season ${newSeason} started successfully!`);
}

module.exports = { 
  getCurrentSeason, 
  getSeasonDisplayName,
  shouldResetSeason,
  checkAndResetSeason,
  resetSeason,
  resetAllUserStats
};