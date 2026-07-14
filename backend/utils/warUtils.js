const ClanWar = require('../models/ClanWar');
const ClanWarHistory = require('../models/ClanWarHistory');
const TreasureChest = require('../models/TreasureChest');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Clan = require('../models/Clan');
const Character = require('../models/Character');

// ============================================================
// ✅ WAR MATCHING
// ============================================================

/**
 * Find a matching opponent for a clan war
 * @param {ObjectId} warId - The war ID to match
 * @returns {Object} - Match result
 */
async function findWarMatch(warId) {
  const war = await ClanWar.findById(warId);
  
  if (!war) {
    return { success: false, message: 'War not found' };
  }
  
  if (war.status !== 'searching') {
    return { success: false, message: 'War is not searching' };
  }
  
  // Check if clan has 10 members selected
  if (war.clan1Members.length < 10) {
    return { success: false, message: 'Need 10 members selected' };
  }
  
  // Check if all members have cards selected
  const allHaveCards = war.clan1Members.every(m => m.selectedCard !== null);
  if (!allHaveCards) {
    return { success: false, message: 'All members must have war cards selected' };
  }
  
  // Find another searching war (excluding self)
  const matchingWar = await ClanWar.findOne({
    _id: { $ne: warId },
    status: 'searching',
    'clan1Members.9': { $exists: true }, // Has 10 members
    'clan1Members.selectedCard': { $ne: null } // All have cards
  });
  
  if (!matchingWar) {
    return { success: false, message: 'No opponent found' };
  }
  
  // Check if all members in matching war have cards
  const allHaveCards2 = matchingWar.clan1Members.every(m => m.selectedCard !== null);
  if (!allHaveCards2) {
    return { success: false, message: 'Opponent members need war cards' };
  }
  
  // Match found! Start preparation phase
  const preparationEndsAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours
  
  // Update both wars
  war.clan2Id = matchingWar.clan1Id;
  war.status = 'preparation';
  war.preparationEndsAt = preparationEndsAt;
  await war.save();
  
  matchingWar.clan2Id = war.clan1Id;
  matchingWar.status = 'preparation';
  matchingWar.preparationEndsAt = preparationEndsAt;
  await matchingWar.save();
  
  // Get clan names
  const clan1 = await Clan.findById(war.clan1Id);
  const clan2 = await Clan.findById(matchingWar.clan1Id);
  
  // Create notifications for both clans
  await createWarFoundNotifications(war, matchingWar, clan1, clan2);
  
  return {
    success: true,
    message: 'Opponent found!',
    warId: war._id,
    opponentId: matchingWar._id,
    clan1Name: clan1.name,
    clan2Name: clan2.name,
    preparationEndsAt: preparationEndsAt
  };
}

/**
 * Create war found notifications for both clans
 */
async function createWarFoundNotifications(war, matchingWar, clan1, clan2) {
  // Notify clan 1
  for (const member of war.clan1Members) {
    await Notification.createWarFoundNotification(
      member.userId,
      clan2.name
    );
  }
  
  // Notify clan 2
  for (const member of matchingWar.clan1Members) {
    await Notification.createWarFoundNotification(
      member.userId,
      clan1.name
    );
  }
}

// ============================================================
// ✅ WAR TIMER SYSTEM
// ============================================================

/**
 * Check and update war timers (runs every minute)
 */
async function checkWarTimers() {
  const now = new Date();
  
  // Check wars in preparation phase
  const preparationWars = await ClanWar.find({
    status: 'preparation',
    preparationEndsAt: { $lte: now }
  });
  
  for (const war of preparationWars) {
    await startBattlePhase(war);
  }
  
  // Check wars in battle phase
  const battleWars = await ClanWar.find({
    status: 'battle',
    battleEndsAt: { $lte: now }
  });
  
  for (const war of battleWars) {
    await endWar(war);
  }
  
  // Check wars ending soon (1 hour left)
  const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
  const endingSoonWars = await ClanWar.find({
    status: 'battle',
    battleEndsAt: { $lte: oneHourFromNow, $gt: now }
  });
  
  for (const war of endingSoonWars) {
    await sendWarEndingSoonNotifications(war);
  }
  
  // Check wars in preparation (reminder)
  const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const prepReminderWars = await ClanWar.find({
    status: 'preparation',
    preparationEndsAt: { $lte: twoHoursFromNow, $gt: now }
  });
  
  for (const war of prepReminderWars) {
    await sendWarReminderNotifications(war);
  }
}

/**
 * Start battle phase for a war
 */
async function startBattlePhase(war) {
  war.status = 'battle';
  war.battleEndsAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours
  await war.save();
  
  // Get clan names
  const clan1 = await Clan.findById(war.clan1Id);
  const clan2 = await Clan.findById(war.clan2Id);
  
  // Notify all members that battle has started
  for (const member of war.clan1Members) {
    await Notification.createWarReminderNotification(
      member.userId,
      clan2.name
    );
  }
  
  for (const member of war.clan2Members) {
    await Notification.createWarReminderNotification(
      member.userId,
      clan1.name
    );
  }
  
  console.log(`⚔️ Battle phase started for war ${war._id}`);
}

/**
 * End a war and determine winner
 */
async function endWar(war) {
  war.status = 'completed';
  war.completedAt = new Date();
  
  // Determine winner
  let winner = null;
  let winningClan = null;
  let losingClan = null;
  
  if (war.clan1Wins > war.clan2Wins) {
    winner = war.clan1Id;
    winningClan = 'clan1';
    losingClan = 'clan2';
  } else if (war.clan2Wins > war.clan1Wins) {
    winner = war.clan2Id;
    winningClan = 'clan2';
    losingClan = 'clan1';
  }
  // If tie, no winner (draw)
  
  war.winner = winner;
  if (winner) {
    war.winningClanScore = winningClan === 'clan1' ? war.clan1Wins : war.clan2Wins;
    war.losingClanScore = winningClan === 'clan1' ? war.clan2Wins : war.clan1Wins;
  }
  
  await war.save();
  
  // Get clan names
  const clan1 = await Clan.findById(war.clan1Id);
  const clan2 = await Clan.findById(war.clan2Id);
  
  const scoreDisplay = `${war.clan1Wins}/10 vs ${war.clan2Wins}/10`;
  
  // Create war history entries for both clans
  await createWarHistory(war, clan1, clan2, winner);
  
  // Send notifications and rewards
  if (winner) {
    // Winning clan gets treasure chests
    const winningMembers = winningClan === 'clan1' ? war.clan1Members : war.clan2Members;
    const losingMembers = winningClan === 'clan1' ? war.clan2Members : war.clan1Members;
    const winnerName = winningClan === 'clan1' ? clan1.name : clan2.name;
    const loserName = winningClan === 'clan1' ? clan2.name : clan1.name;
    
    // Create chests for winning members
    await createChestsForWinners(war, winner, winningMembers);
    
    // Notify winners
    await Notification.createWarVictoryNotifications(
      war,
      winningClan,
      loserName,
      scoreDisplay
    );
    
    // Notify losers
    await Notification.createWarDefeatNotifications(
      war,
      losingClan,
      winnerName,
      scoreDisplay
    );
  } else {
    // Draw - no chests, just notifications
    for (const member of war.clan1Members) {
      await Notification.createNotification({
        userId: member.userId,
        type: 'war_draw',
        title: '🤝 War Draw!',
        message: `The war against ${clan2.name} ended in a draw! Score: ${scoreDisplay}`,
        icon: '🤝',
        color: 'yellow',
        data: {
          warId: war._id,
          opponentName: clan2.name,
          score: scoreDisplay
        }
      });
    }
    
    for (const member of war.clan2Members) {
      await Notification.createNotification({
        userId: member.userId,
        type: 'war_draw',
        title: '🤝 War Draw!',
        message: `The war against ${clan1.name} ended in a draw! Score: ${scoreDisplay}`,
        icon: '🤝',
        color: 'yellow',
        data: {
          warId: war._id,
          opponentName: clan1.name,
          score: scoreDisplay
        }
      });
    }
  }
  
  console.log(`🏁 War ${war._id} completed. Winner: ${winner || 'Draw'}`);
}

/**
 * Create war history entries for both clans
 */
async function createWarHistory(war, clan1, clan2, winner) {
  const isClan1Winner = winner && winner.toString() === war.clan1Id.toString();
  const isClan2Winner = winner && winner.toString() === war.clan2Id.toString();
  
  // Get MVPs
  const mvp1 = getMvp(war.clan1Members);
  const mvp2 = getMvp(war.clan2Members);
  
  // Clan 1 history
  await ClanWarHistory.create({
    clanId: war.clan1Id,
    clanName: clan1.name,
    opponentId: war.clan2Id,
    opponentName: clan2.name,
    warId: war._id,
    clanScore: war.clan1Wins,
    opponentScore: war.clan2Wins,
    result: isClan1Winner ? 'win' : (isClan2Winner ? 'loss' : 'draw'),
    totalMembers: war.clan1Members.length,
    attacksUsed: war.clan1Attacks,
    attacksRemaining: 10 - war.clan1Attacks,
    mvp: mvp1,
    startedAt: war.createdAt,
    endedAt: war.completedAt,
    preparationDuration: 12,
    battleDuration: 12,
    rewardsGiven: !!winner
  });
  
  // Clan 2 history
  await ClanWarHistory.create({
    clanId: war.clan2Id,
    clanName: clan2.name,
    opponentId: war.clan1Id,
    opponentName: clan1.name,
    warId: war._id,
    clanScore: war.clan2Wins,
    opponentScore: war.clan1Wins,
    result: isClan2Winner ? 'win' : (isClan1Winner ? 'loss' : 'draw'),
    totalMembers: war.clan2Members.length,
    attacksUsed: war.clan2Attacks,
    attacksRemaining: 10 - war.clan2Attacks,
    mvp: mvp2,
    startedAt: war.createdAt,
    endedAt: war.completedAt,
    preparationDuration: 12,
    battleDuration: 12,
    rewardsGiven: !!winner
  });
}

/**
 * Get MVP from members
 */
function getMvp(members) {
  let mvp = null;
  let maxWins = 0;
  
  for (const member of members) {
    if (member.battleResult === 'win') {
      const wins = members.filter(m => 
        m.userId.toString() === member.userId.toString() && 
        m.battleResult === 'win'
      ).length;
      
      if (wins > maxWins) {
        maxWins = wins;
        mvp = {
          userId: member.userId,
          wins: wins
        };
      }
    }
  }
  
  return mvp;
}

/**
 * Create treasure chests for winning clan members
 */
async function createChestsForWinners(war, winner, members) {
  const chests = [];
  
  for (const member of members) {
    // Create chest
    const chest = new TreasureChest({
      userId: member.userId,
      warId: war._id,
      clanId: winner,
      chestType: 'war_victory',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });
    
    await chest.save();
    chests.push(chest);
    
    // Create notification
    const notification = await Notification.createChestAvailableNotification(
      member.userId,
      chest._id,
      war._id
    );
    
    // Link notification to chest
    chest.notificationId = notification._id;
    await chest.save();
  }
  
  return chests;
}

/**
 * Send war ending soon notifications
 */
async function sendWarEndingSoonNotifications(war) {
  const clan1 = await Clan.findById(war.clan1Id);
  const clan2 = await Clan.findById(war.clan2Id);
  const score = `${war.clan1Wins}/10 vs ${war.clan2Wins}/10`;
  
  for (const member of war.clan1Members) {
    await Notification.createWarEndingSoonNotification(
      member.userId,
      clan2.name,
      score
    );
  }
  
  for (const member of war.clan2Members) {
    await Notification.createWarEndingSoonNotification(
      member.userId,
      clan1.name,
      score
    );
  }
}

/**
 * Send war reminder notifications
 */
async function sendWarReminderNotifications(war) {
  const clan1 = await Clan.findById(war.clan1Id);
  const clan2 = await Clan.findById(war.clan2Id);
  
  for (const member of war.clan1Members) {
    await Notification.createNotification({
      userId: member.userId,
      type: 'war_reminder',
      title: '⏰ War Starting Soon!',
      message: `The war against ${clan2.name} starts in 2 hours! Prepare your strategy!`,
      icon: '⏰',
      color: 'yellow',
      data: {
        warId: war._id,
        opponentName: clan2.name
      },
      priority: 'high'
    });
  }
  
  for (const member of war.clan2Members) {
    await Notification.createNotification({
      userId: member.userId,
      type: 'war_reminder',
      title: '⏰ War Starting Soon!',
      message: `The war against ${clan1.name} starts in 2 hours! Prepare your strategy!`,
      icon: '⏰',
      color: 'yellow',
      data: {
        warId: war._id,
        opponentName: clan1.name
      },
      priority: 'high'
    });
  }
}

// ============================================================
// ✅ BATTLE LOGIC
// ============================================================

/**
 * Perform a 1v1 card battle
 * @param {Object} attackerCard - The attacker's card
 * @param {Object} defenderCard - The defender's card
 * @returns {Object} - Battle result
 */
function performCardBattle(attackerCard, defenderCard) {
  // Get power values
  let power1 = attackerCard.currentPower || attackerCard.powerLevel || 25;
  let power2 = defenderCard.currentPower || defenderCard.powerLevel || 25;
  
  // Element advantage
  const advantage = {
    'Fire': 'Wind',
    'Water': 'Fire',
    'Wind': 'Earth',
    'Earth': 'Water'
  };
  
  // Check element advantage
  if (advantage[attackerCard.element] === defenderCard.element) {
    power1 *= 1.2; // 20% boost for attacker
  } else if (advantage[defenderCard.element] === attackerCard.element) {
    power2 *= 1.2; // 20% boost for defender
  }
  
  // Random factor (70% skill, 30% luck)
  const luck1 = 0.7 + (Math.random() * 0.6); // 0.7 - 1.3
  const luck2 = 0.7 + (Math.random() * 0.6);
  
  const finalPower1 = power1 * luck1;
  const finalPower2 = power2 * luck2;
  
  const attackerWins = finalPower1 > finalPower2;
  
  return {
    attackerWins,
    attackerPower: Math.round(finalPower1 * 10) / 10,
    defenderPower: Math.round(finalPower2 * 10) / 10,
    powerDifference: Math.abs(finalPower1 - finalPower2)
  };
}

/**
 * Execute an attack in a war
 * @param {ObjectId} warId - War ID
 * @param {ObjectId} attackerId - Attacking user ID
 * @param {ObjectId} targetId - Target user ID
 * @returns {Object} - Attack result
 */
async function executeAttack(warId, attackerId, targetId) {
  const war = await ClanWar.findById(warId)
    .populate('clan1Members.userId', 'username')
    .populate('clan2Members.userId', 'username');
  
  if (!war) {
    return { success: false, message: 'War not found' };
  }
  
  if (war.status !== 'battle') {
    return { success: false, message: 'War is not in battle phase' };
  }
  
  // Find attacker
  let isClan1 = false;
  let attacker = war.clan1Members.find(m => 
    m.userId._id.toString() === attackerId.toString()
  );
  
  if (attacker) {
    isClan1 = true;
  } else {
    attacker = war.clan2Members.find(m => 
      m.userId._id.toString() === attackerId.toString()
    );
  }
  
  if (!attacker) {
    return { success: false, message: 'You are not in this war' };
  }
  
  // Check if already attacked
  if (attacker.hasAttacked) {
    return { success: false, message: 'You already attacked!' };
  }
  
  // Find target (must be on opponent team)
  let target = null;
  if (isClan1) {
    target = war.clan2Members.find(m => 
      m.userId._id.toString() === targetId.toString()
    );
  } else {
    target = war.clan1Members.find(m => 
      m.userId._id.toString() === targetId.toString()
    );
  }
  
  if (!target) {
    return { success: false, message: 'Target not found on opponent team' };
  }
  
  // Get card details
  const attackerCard = await Character.findById(attacker.selectedCard);
  const targetCard = await Character.findById(target.selectedCard);
  
  if (!attackerCard || !targetCard) {
    return { success: false, message: 'Card not found' };
  }
  
  // Perform battle
  const battleResult = performCardBattle(attackerCard, targetCard);
  
  // Update attacker
  attacker.hasAttacked = true;
  attacker.attackedUserId = targetId;
  attacker.battleResult = battleResult.attackerWins ? 'win' : 'loss';
  
  // Update scores
  if (battleResult.attackerWins) {
    if (isClan1) war.clan1Wins += 1;
    else war.clan2Wins += 1;
  }
  
  // Update attack counts
  if (isClan1) war.clan1Attacks += 1;
  else war.clan2Attacks += 1;
  
  // Add battle log
  war.battleLogs.push({
    attackerId: attacker.userId._id,
    attackerName: attacker.userId.username,
    attackerCard: attackerCard._id,
    defenderId: target.userId._id,
    defenderName: target.userId.username,
    defenderCard: targetCard._id,
    result: battleResult.attackerWins ? 'win' : 'loss',
    timestamp: new Date()
  });
  
  await war.save();
  
  // Check if all attacks are done
  if (war.isAllAttacksDone()) {
    await endWar(war);
  }
  
  return {
    success: true,
    result: battleResult.attackerWins ? 'win' : 'loss',
    attackerPower: battleResult.attackerPower,
    defenderPower: battleResult.defenderPower,
    powerDifference: battleResult.powerDifference,
    score: {
      clan1: `${war.clan1Wins}/10`,
      clan2: `${war.clan2Wins}/10`,
      clan1Attacks: `${war.clan1Attacks}/10`,
      clan2Attacks: `${war.clan2Attacks}/10`
    },
    isComplete: war.isAllAttacksDone()
  };
}

// ============================================================
// ✅ VALIDATION FUNCTIONS
// ============================================================

/**
 * Check if user can be selected for war
 */
async function canUserBeSelectedForWar(userId) {
  const user = await User.findById(userId);
  if (!user) return { success: false, message: 'User not found' };
  
  // Check if user has war card selected
  if (!user.warCard) {
    return { success: false, message: 'User has no war card selected' };
  }
  
  // Check if user is in a clan
  if (!user.clanId) {
    return { success: false, message: 'User is not in a clan' };
  }
  
  // Check if user is active (optional: last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  if (user.lastLogin && user.lastLogin < sevenDaysAgo) {
    return { success: false, message: 'User is inactive' };
  }
  
  return { success: true, user };
}

/**
 * Validate war card selection
 */
async function validateWarCard(userId, cardId) {
  const user = await User.findById(userId);
  if (!user) return { success: false, message: 'User not found' };
  
  // Check if user owns the card
  const ownsCard = user.cards.some(c => 
    c.characterId.toString() === cardId.toString()
  );
  
  if (!ownsCard) {
    return { success: false, message: 'You don\'t own this card' };
  }
  
  // Check if card exists in database
  const card = await Character.findById(cardId);
  if (!card) {
    return { success: false, message: 'Card not found' };
  }
  
  return { success: true, card };
}

// ============================================================
// ✅ CLEANUP FUNCTIONS
// ============================================================

/**
 * Clean up old wars (run daily)
 */
async function cleanupOldWars() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  // Delete completed wars older than 30 days
  const result = await ClanWar.deleteMany({
    status: 'completed',
    completedAt: { $lt: thirtyDaysAgo }
  });
  
  console.log(`🧹 Cleaned up ${result.deletedCount} old wars`);
  return result;
}

// ============================================================
// ✅ EXPORT ALL FUNCTIONS
// ============================================================

module.exports = {
  // Matching
  findWarMatch,
  
  // Timer system
  checkWarTimers,
  startBattlePhase,
  endWar,
  
  // Battle
  performCardBattle,
  executeAttack,
  
  // Validation
  canUserBeSelectedForWar,
  validateWarCard,
  
  // Cleanup
  cleanupOldWars,
  
  // Internal helpers (exported for testing)
  createWarFoundNotifications,
  createWarHistory,
  createChestsForWinners,
  getMvp
};