const ClanWar = require('../models/ClanWar');
const ClanWarHistory = require('../models/ClanWarHistory');
const TreasureChest = require('../models/TreasureChest');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Clan = require('../models/Clan');
const ClanMember = require('../models/ClanMember');
const Character = require('../models/Character');
const {
  findWarMatch,
  executeAttack,
  canUserBeSelectedForWar,
  validateWarCard
} = require('../utils/warUtils');

// ============================================================
// ✅ SELECT WAR CARD
// ============================================================
exports.selectWarCard = async (req, res) => {
  try {
    const { cardId } = req.body;
    const userId = req.user._id;

    if (!cardId) {
      return res.status(400).json({
        success: false,
        message: 'Card ID is required'
      });
    }

    // Validate card
    const validation = await validateWarCard(userId, cardId);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is in a clan
    if (!user.clanId) {
      return res.status(400).json({
        success: false,
        message: 'You must be in a clan to select a war card'
      });
    }

    // Check if user is in an active war
    const activeWar = await ClanWar.findActiveWarForClan(user.clanId);
    if (activeWar && activeWar.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot change war card during an active war'
      });
    }

    // Select war card
    const result = user.selectWarCard(cardId);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    await user.save();

    // Get card details for response
    const card = await Character.findById(cardId);

    res.json({
      success: true,
      message: 'War card selected successfully!',
      warCard: {
        id: card._id,
        name: card.name,
        rarity: card.rarity,
        element: card.element,
        image: card.image,
        power: card.powerLevel || card.basePower || 25
      }
    });

  } catch (error) {
    console.error('Select war card error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to select war card: ' + error.message
    });
  }
};

// ============================================================
// ✅ GET WAR CARD
// ============================================================
exports.getWarCard = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId)
      .populate('warCard', 'name rarity element image powerLevel basePower');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.warCard) {
      return res.json({
        success: true,
        hasWarCard: false,
        warCard: null
      });
    }

    res.json({
      success: true,
      hasWarCard: true,
      warCard: {
        id: user.warCard._id,
        name: user.warCard.name,
        rarity: user.warCard.rarity,
        element: user.warCard.element,
        image: user.warCard.image,
        power: user.warCard.powerLevel || user.warCard.basePower || 25
      }
    });

  } catch (error) {
    console.error('Get war card error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get war card: ' + error.message
    });
  }
};

// ============================================================
// ✅ GET CLAN WAR CARDS (View all members' war cards) - FIXED
// ============================================================
exports.getClanWarCards = async (req, res) => {
  try {
    const userId = req.user._id;
    const { clanId } = req.params;

    // Check if user is in clan
    const member = await ClanMember.findOne({ userId, clanId });
    if (!member) {
      return res.status(403).json({
        success: false,
        message: 'You are not in this clan'
      });
    }

    // Get all clan members with their war cards
    const members = await ClanMember.find({ clanId })
      .populate('userId', 'username warCard')
      .populate({
        path: 'userId',
        populate: {
          path: 'warCard',
          select: 'name rarity element image powerLevel basePower'
        }
      });

    // ✅ FIX: Filter out null userIds and handle missing users
    const warCards = members
      .filter(m => m.userId !== null) // Filter out null users
      .map(m => {
        const user = m.userId;
        // ✅ FIX: Check if user exists before accessing properties
        if (!user) return null;
        
        return {
          userId: user._id,
          username: user.username || 'Unknown',
          role: m.role || 'member',
          hasWarCard: !!user.warCard,
          warCard: user.warCard ? {
            id: user.warCard._id,
            name: user.warCard.name,
            rarity: user.warCard.rarity,
            element: user.warCard.element,
            image: user.warCard.image,
            power: user.warCard.powerLevel || user.warCard.basePower || 25
          } : null
        };
      })
      .filter(m => m !== null); // Remove any null entries

    res.json({
      success: true,
      warCards,
      totalMembers: warCards.length,
      membersWithCard: warCards.filter(m => m.hasWarCard).length
    });

  } catch (error) {
    console.error('Get clan war cards error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get clan war cards: ' + error.message
    });
  }
};

// ============================================================
// ✅ START WAR
// ============================================================
exports.startWar = async (req, res) => {
  try {
    const userId = req.user._id;
    const { memberIds } = req.body;

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Please select exactly 10 members for the war'
      });
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is in a clan
    if (!user.clanId) {
      return res.status(400).json({
        success: false,
        message: 'You are not in a clan'
      });
    }

    // Check if user is clan leader
    const clan = await Clan.findById(user.clanId);
    if (!clan) {
      return res.status(404).json({
        success: false,
        message: 'Clan not found'
      });
    }

    if (clan.ownerId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the clan leader can start a war'
      });
    }

    // Check if clan already has an active war
    const existingWar = await ClanWar.findActiveWarForClan(user.clanId);
    if (existingWar) {
      return res.status(400).json({
        success: false,
        message: `Your clan is already in a war (Status: ${existingWar.status})`
      });
    }

    // Check if all selected members are in the clan
    const clanMembers = await ClanMember.find({ clanId: user.clanId });
    const clanMemberIds = clanMembers.map(m => m.userId.toString());
    
    for (const memberId of memberIds) {
      if (!clanMemberIds.includes(memberId.toString())) {
        return res.status(400).json({
          success: false,
          message: 'One or more selected members are not in your clan'
        });
      }
    }

    // Validate each member can be selected
    const selectedMembers = [];
    for (const memberId of memberIds) {
      const validation = await canUserBeSelectedForWar(memberId);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: `Member ${validation.message}`
        });
      }
      selectedMembers.push(validation.user);
    }

    // Create war members array
    const warMembers = selectedMembers.map(m => ({
      userId: m._id,
      selectedCard: m.warCard
    }));

    // Create war
    const war = new ClanWar({
      clan1Id: user.clanId,
      clan1Members: warMembers,
      status: 'searching'
    });

    await war.save();

    // Notify clan members that war has started
    for (const member of warMembers) {
      await Notification.createWarStartNotification(
        member.userId,
        clan.name
      );
    }

    // Try to find a match immediately
    const matchResult = await findWarMatch(war._id);

    res.status(201).json({
      success: true,
      message: matchResult.success ? 'War started and opponent found!' : 'War started, searching for opponent...',
      war: {
        id: war._id,
        status: war.status,
        members: warMembers.length,
        matchFound: matchResult.success,
        opponent: matchResult.success ? {
          clanName: matchResult.clan2Name,
          warId: matchResult.opponentId
        } : null,
        preparationEndsAt: war.preparationEndsAt
      }
    });

  } catch (error) {
    console.error('Start war error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start war: ' + error.message
    });
  }
};

// ============================================================
// ✅ GET WAR STATUS
// ============================================================
exports.getWarStatus = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.clanId) {
      return res.json({
        success: true,
        hasWar: false,
        message: 'You are not in a clan'
      });
    }

    const war = await ClanWar.findActiveWarForClan(user.clanId);
    
    if (!war) {
      return res.json({
        success: true,
        hasWar: false,
        message: 'No active war'
      });
    }

    // Determine which clan the user is in
    const isClan1 = war.clan1Id.toString() === user.clanId.toString();
    const userClanId = isClan1 ? war.clan1Id : war.clan2Id;
    const opponentId = isClan1 ? war.clan2Id : war.clan1Id;

    // Get clan names
    const userClan = await Clan.findById(userClanId);
    const opponentClan = opponentId ? await Clan.findById(opponentId) : null;

    // Get user's member object
    const userMember = isClan1 
      ? war.clan1Members.find(m => m.userId.toString() === userId.toString())
      : war.clan2Members.find(m => m.userId.toString() === userId.toString());

    // Get war card details
    let userWarCard = null;
    if (userMember && userMember.selectedCard) {
      userWarCard = await Character.findById(userMember.selectedCard);
    }

    // Get remaining attacks
    const remainingAttacks = isClan1 
      ? war.getRemainingAttacks('clan1')
      : war.getRemainingAttacks('clan2');

    const response = {
      success: true,
      hasWar: true,
      war: {
        id: war._id,
        status: war.status,
        userClan: {
          id: userClanId,
          name: userClan ? userClan.name : 'Unknown'
        },
        opponent: opponentClan ? {
          id: opponentClan._id,
          name: opponentClan.name
        } : null,
        score: war.getScoreDisplay(),
        clan1Wins: war.clan1Wins,
        clan2Wins: war.clan2Wins,
        clan1Attacks: war.clan1Attacks,
        clan2Attacks: war.clan2Attacks,
        totalMembers: 10,
        user: {
          hasAttacked: userMember ? userMember.hasAttacked : false,
          battleResult: userMember ? userMember.battleResult : null,
          attackedUserId: userMember ? userMember.attackedUserId : null,
          selectedCard: userWarCard ? {
            id: userWarCard._id,
            name: userWarCard.name,
            rarity: userWarCard.rarity,
            element: userWarCard.element,
            image: userWarCard.image,
            power: userWarCard.powerLevel || userWarCard.basePower || 25
          } : null,
          remainingAttacks: remainingAttacks
        },
        timers: {
          phaseStartTime: war.phaseStartTime,
          preparationEndsAt: war.preparationEndsAt,
          battleEndsAt: war.battleEndsAt
        },
        isComplete: war.isAllAttacksDone()
      }
    };

    // Add member lists (only show cards for own clan)
    if (isClan1) {
      response.war.userClanMembers = await getMemberDetails(war.clan1Members, true);
      response.war.opponentMembers = await getMemberDetails(war.clan2Members, false);
    } else {
      response.war.userClanMembers = await getMemberDetails(war.clan2Members, true);
      response.war.opponentMembers = await getMemberDetails(war.clan1Members, false);
    }

    res.json(response);

  } catch (error) {
    console.error('Get war status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get war status: ' + error.message
    });
  }
};

// ============================================================
// ✅ HELPER: Get Member Details - FIXED
// ============================================================
async function getMemberDetails(members, showCards) {
  const details = [];
  
  for (const member of members) {
    const user = await User.findById(member.userId, 'username');
    // ✅ FIX: Check if user exists
    if (!user) continue;
    
    let cardDetails = null;
    
    if (member.selectedCard && showCards) {
      cardDetails = await Character.findById(member.selectedCard, 'name rarity element image powerLevel basePower');
    }
    
    details.push({
      userId: member.userId,
      username: user.username || 'Unknown',
      hasAttacked: member.hasAttacked || false,
      battleResult: member.battleResult || null,
      attackedUserId: member.attackedUserId || null,
      selectedCard: cardDetails ? {
        id: cardDetails._id,
        name: cardDetails.name,
        rarity: cardDetails.rarity,
        element: cardDetails.element,
        image: cardDetails.image,
        power: cardDetails.powerLevel || cardDetails.basePower || 25
      } : null,
      showCard: showCards || false
    });
  }
  
  return details;
}

// ============================================================
// ✅ GET WAR DETAILS (Full war data)
// ============================================================
exports.getWarDetails = async (req, res) => {
  try {
    const { warId } = req.params;
    const userId = req.user._id;

    const war = await ClanWar.findById(warId);
    if (!war) {
      return res.status(404).json({
        success: false,
        message: 'War not found'
      });
    }

    // Check if user is part of this war
    const isClan1 = war.clan1Members.some(m => m.userId.toString() === userId.toString());
    const isClan2 = war.clan2Members.some(m => m.userId.toString() === userId.toString());
    
    if (!isClan1 && !isClan2) {
      return res.status(403).json({
        success: false,
        message: 'You are not part of this war'
      });
    }

    // Get clan names
    const clan1 = await Clan.findById(war.clan1Id);
    const clan2 = await Clan.findById(war.clan2Id);

    // Get member details
    const clan1Members = await getMemberDetails(war.clan1Members, true);
    const clan2Members = await getMemberDetails(war.clan2Members, true);

    res.json({
      success: true,
      war: {
        id: war._id,
        status: war.status,
        clan1: {
          id: war.clan1Id,
          name: clan1 ? clan1.name : 'Unknown',
          members: clan1Members,
          wins: war.clan1Wins,
          attacks: war.clan1Attacks
        },
        clan2: {
          id: war.clan2Id,
          name: clan2 ? clan2.name : 'Unknown',
          members: clan2Members,
          wins: war.clan2Wins,
          attacks: war.clan2Attacks
        },
        score: war.getScoreDisplay(),
        timers: {
          phaseStartTime: war.phaseStartTime,
          preparationEndsAt: war.preparationEndsAt,
          battleEndsAt: war.battleEndsAt,
          completedAt: war.completedAt
        },
        battleLogs: war.battleLogs,
        winner: war.winner ? (war.winner.toString() === war.clan1Id.toString() ? 'clan1' : 'clan2') : null,
        isComplete: war.isAllAttacksDone()
      }
    });

  } catch (error) {
    console.error('Get war details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get war details: ' + error.message
    });
  }
};

// ============================================================
// ✅ CANCEL WAR SEARCH
// ============================================================
exports.cancelWarSearch = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.clanId) {
      return res.status(400).json({
        success: false,
        message: 'You are not in a clan'
      });
    }

    // Check if user is clan leader
    const clan = await Clan.findById(user.clanId);
    if (!clan) {
      return res.status(404).json({
        success: false,
        message: 'Clan not found'
      });
    }

    if (clan.ownerId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the clan leader can cancel war search'
      });
    }

    // Find searching war
    const war = await ClanWar.findOne({
      clan1Id: user.clanId,
      status: 'searching'
    });

    if (!war) {
      return res.status(404).json({
        success: false,
        message: 'No war search found to cancel'
      });
    }

    await war.deleteOne();

    res.json({
      success: true,
      message: 'War search cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel war search error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel war search: ' + error.message
    });
  }
};

// ============================================================
// ✅ ATTACK IN WAR
// ============================================================
exports.attack = async (req, res) => {
  try {
    const userId = req.user._id;
    const { warId, targetUserId } = req.body;

    if (!warId || !targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'War ID and target user ID are required'
      });
    }

    // Execute attack
    const result = await executeAttack(warId, userId, targetUserId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      message: result.result === 'win' ? '🎉 You won the battle!' : '💀 You lost the battle!',
      result: result.result,
      attackerPower: result.attackerPower,
      defenderPower: result.defenderPower,
      powerDifference: result.powerDifference,
      score: result.score,
      isComplete: result.isComplete
    });

  } catch (error) {
    console.error('Attack error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to attack: ' + error.message
    });
  }
};

// ============================================================
// ✅ GET WAR HISTORY FOR CLAN
// ============================================================
exports.getWarHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { clanId } = req.params;
    const { limit = 20 } = req.query;

    // Check if user is in the clan
    const member = await ClanMember.findOne({ userId, clanId });
    if (!member) {
      return res.status(403).json({
        success: false,
        message: 'You are not in this clan'
      });
    }

    const history = await ClanWarHistory.getHistoryForClan(clanId, parseInt(limit));
    const record = await ClanWarHistory.getRecordForClan(clanId);
    const streak = await ClanWarHistory.getWinStreak(clanId);

    res.json({
      success: true,
      history,
      record,
      streak,
      total: history.length
    });

  } catch (error) {
    console.error('Get war history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get war history: ' + error.message
    });
  }
};

// ============================================================
// ✅ GET WAR LEADERBOARD (Top 20 clans)
// ============================================================
exports.getWarLeaderboard = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    
    const leaderboard = await ClanWarHistory.getLeaderboard(limit);

    res.json({
      success: true,
      leaderboard: leaderboard.map((clan, index) => ({
        rank: index + 1,
        clanId: clan.clanId,
        clanName: clan.clanName,
        totalWins: clan.totalWins,
        totalWars: clan.totalWars,
        winRate: clan.winRate,
        totalScore: clan.totalScore,
        totalMembers: clan.totalMembers || 0
      })),
      total: leaderboard.length
    });

  } catch (error) {
    console.error('Get war leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get war leaderboard: ' + error.message
    });
  }
};

// ============================================================
// ✅ GET SEARCH STATUS
// ============================================================
exports.getSearchStatus = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.clanId) {
      return res.json({
        success: true,
        isSearching: false,
        message: 'You are not in a clan'
      });
    }

    const war = await ClanWar.findOne({
      clan1Id: user.clanId,
      status: 'searching'
    });

    if (!war) {
      return res.json({
        success: true,
        isSearching: false,
        message: 'Not searching for war'
      });
    }

    // Get clan name
    const clan = await Clan.findById(user.clanId);

    res.json({
      success: true,
      isSearching: true,
      war: {
        id: war._id,
        clanName: clan ? clan.name : 'Unknown',
        membersSelected: war.clan1Members.length,
        totalNeeded: 10,
        startedAt: war.createdAt,
        searchingSince: Math.floor((Date.now() - war.createdAt) / 1000 / 60) // minutes
      }
    });

  } catch (error) {
    console.error('Get search status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get search status: ' + error.message
    });
  }
};

// ============================================================
// ✅ GET BATTLE STATUS (Lightweight status for polling)
// ============================================================
exports.getBattleStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    const { warId } = req.params;

    const war = await ClanWar.findById(warId);
    if (!war) {
      return res.status(404).json({
        success: false,
        message: 'War not found'
      });
    }

    // Check if user is part of this war
    const isInWar = war.clan1Members.some(m => m.userId.toString() === userId.toString()) ||
                    war.clan2Members.some(m => m.userId.toString() === userId.toString());
    
    if (!isInWar) {
      return res.status(403).json({
        success: false,
        message: 'You are not part of this war'
      });
    }

    res.json({
      success: true,
      status: war.status,
      score: war.getScoreDisplay(),
      clan1Wins: war.clan1Wins,
      clan2Wins: war.clan2Wins,
      clan1Attacks: war.clan1Attacks,
      clan2Attacks: war.clan2Attacks,
      isComplete: war.isAllAttacksDone(),
      winner: war.winner ? (war.winner.toString() === war.clan1Id.toString() ? 'clan1' : 'clan2') : null,
      battleEndsAt: war.battleEndsAt,
      preparationEndsAt: war.preparationEndsAt
    });

  } catch (error) {
    console.error('Get battle status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get battle status: ' + error.message
    });
  }
};