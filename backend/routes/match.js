const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const Match = require('../models/Match');
const User = require('../models/User');
const Character = require('../models/Character');

// ===== IO INSTANCE =====
let ioInstance = null;

const setIO = (io) => {
  ioInstance = io;
  console.log('🔌 Socket.io instance set in match routes');
};

// ===== GENERATE MATCH CODE =====
function generateMatchCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `BTL-${code}`;
}

// ============================================================
// CREATE MATCH - FIXED POWER LEVEL
// ============================================================
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const { team } = req.body;

    console.log('👤 [CREATE] User:', user.username);

    const userData = await User.findById(user._id);

    if (!userData.cards || userData.cards.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'You need at least 10 cards to start a battle!',
        currentCards: userData.cards?.length || 0,
        required: 10
      });
    }

    let teamCards = [];
    
    if (team && Array.isArray(team) && team.length === 10) {
      // ✅ FIX: Use currentPower or powerLevel from card
      teamCards = team.map(card => {
        const id = card.characterId || card._id || card.id;
        const power = card.currentPower || card.powerLevel || 25;
        return {
          characterId: id,
          characterName: card.characterName || 'Unknown',
          powerLevel: power,
          image: card.image || '',
          cardId: id?.toString() || 'unknown',
          used: false,
          won: null,
          roundUsed: null,
          level: card.level || 1,
          element: card.element || 'Fire',
          rarity: card.rarity || 'Common'
        };
      });
    } else {
      // ✅ FIX: Use currentPower from user's cards
      teamCards = userData.cards
        .sort((a, b) => (b.currentPower || b.powerLevel || 0) - (a.currentPower || a.powerLevel || 0))
        .slice(0, 10)
        .map(card => ({
          characterId: card.characterId,
          characterName: card.characterName,
          powerLevel: card.currentPower || card.powerLevel || 25,
          image: card.image || '',
          cardId: card._id?.toString() || card.characterId?.toString() || 'unknown',
          used: false,
          won: null,
          roundUsed: null,
          level: card.level || 1,
          element: card.element || 'Fire',
          rarity: card.rarity || 'Common'
        }));
    }

    const activeMatch = await Match.findOne({
      $or: [
        { 'player1.user': user._id },
        { 'player2.user': user._id }
      ],
      status: { $in: ['waiting', 'selecting', 'revealing', 'round_result', 'selecting_reward'] }
    });

    if (activeMatch) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active battle!',
        matchCode: activeMatch.matchCode
      });
    }

    let matchCode;
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 20) {
      matchCode = generateMatchCode();
      const existing = await Match.findOne({ matchCode });
      if (!existing) isUnique = true;
      attempts++;
    }

    if (!isUnique) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate match code'
      });
    }

    const match = new Match({
      matchCode,
      player1: {
        user: user._id,
        username: user.username,
        team: teamCards,
        currentScore: 0,
        selectedCardIndex: null,
        confirmedCardIndex: null,
        cardsWon: [],
        cardsLost: []
      },
      status: 'waiting',
      currentRound: 1,
      maxRounds: 10,
      roundStates: [],
      winnerSide: null,
      loserSide: null,
      availableCardsToSteal: [],
      gemRewards: {
        winner: 20,
        loser: 5,
        draw: 10,
        duplicateBonus: 20
      }
    });

    await match.save();
    console.log('✅ [CREATE] Match created:', match.matchCode);
    
    match.addLog('info', `${user.username} created a battle! Waiting for opponent...`);
    await match.save();

    res.json({
      success: true,
      matchCode: match.matchCode,
      match: {
        id: match._id,
        matchCode: match.matchCode,
        status: match.status,
        currentRound: match.currentRound,
        maxRounds: match.maxRounds,
        player1: {
          username: match.player1.username,
          teamSize: match.player1.team.length
        },
        player2: {
          username: 'Waiting...',
          teamSize: 0
        }
      },
      message: 'Battle created! Share with friends.'
    });

  } catch (error) {
    console.error('❌ [CREATE] Create match error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create match: ' + error.message
    });
  }
});

// ============================================================
// JOIN MATCH - FIXED POWER LEVEL
// ============================================================
router.post('/join', authMiddleware, async (req, res) => {
  try {
    const { matchCode } = req.body;
    const user = req.user;
    const userData = await User.findById(user._id);

    if (!matchCode) {
      return res.status(400).json({
        success: false,
        message: 'Match code is required'
      });
    }

    if (!userData.cards || userData.cards.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'You need at least 10 cards to join a battle!',
        currentCards: userData.cards?.length || 0,
        required: 10
      });
    }

    const match = await Match.findOne({
      matchCode: matchCode.toUpperCase().trim(),
      status: 'waiting'
    });

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found or already started'
      });
    }

    if (match.player1.user?.toString() === user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You are already the host of this match!'
      });
    }

    if (match.player2.user) {
      return res.status(400).json({
        success: false,
        message: 'Match is already full!'
      });
    }

    // ✅ FIX: Use currentPower from user's cards
    const topCards = userData.cards
      .sort((a, b) => (b.currentPower || b.powerLevel || 0) - (a.currentPower || a.powerLevel || 0))
      .slice(0, 10);

    const team = topCards.map(card => ({
      characterId: card.characterId,
      characterName: card.characterName,
      powerLevel: card.currentPower || card.powerLevel || 25,
      image: card.image || '',
      cardId: card._id.toString(),
      used: false,
      won: null,
      roundUsed: null,
      level: card.level || 1,
      element: card.element || 'Fire',
      rarity: card.rarity || 'Common'
    }));

    match.player2.user = user._id;
    match.player2.username = user.username;
    match.player2.team = team;
    match.player2.currentScore = 0;
    match.player2.selectedCardIndex = null;
    match.player2.confirmedCardIndex = null;
    match.player2.cardsWon = [];
    match.player2.cardsLost = [];

    match.status = 'waiting';
    await match.save();

    if (ioInstance) {
      ioInstance.to(match.matchCode).emit('match-update', {
        matchCode: match.matchCode,
        status: match.status,
        message: `${user.username} joined the battle!`
      });
    }

    res.json({
      success: true,
      matchCode: match.matchCode,
      match: {
        id: match._id,
        matchCode: match.matchCode,
        status: match.status,
        currentRound: match.currentRound,
        maxRounds: match.maxRounds,
        player1: { username: match.player1.username },
        player2: { username: match.player2.username }
      },
      message: 'Joined successfully! Waiting for host to start...'
    });

  } catch (error) {
    console.error('Join match error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join match'
    });
  }
});

// ============================================================
// START MATCH
// ============================================================
router.post('/start', authMiddleware, async (req, res) => {
  try {
    const { matchCode } = req.body;
    const user = req.user;

    console.log(`🎮 [START MATCH] ${user.username} starting match: ${matchCode}`);

    const match = await Match.findOne({
      matchCode: matchCode.toUpperCase().trim(),
      status: 'waiting'
    });

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    if (match.player1.user.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the host can start the match'
      });
    }

    if (!match.player2.user) {
      return res.status(400).json({
        success: false,
        message: 'Need 2 players to start!'
      });
    }

    match.status = 'selecting';
    match.roundStartTime = new Date();
    match.selectionDeadline = new Date(Date.now() + 30000);
    match.addLog('info', `Match started! Round 1 beginning.`);

    await match.save();

    if (ioInstance) {
      ioInstance.to(match.matchCode).emit('match-started', {
        matchCode: match.matchCode,
        status: 'selecting',
        message: 'Match started! Select your card!'
      });
    }

    res.json({
      success: true,
      message: 'Match started!',
      matchCode: match.matchCode
    });

  } catch (error) {
    console.error('Start match error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start match'
    });
  }
});

// ============================================================
// GET MATCH STATE
// ============================================================
router.get('/:matchCode', authMiddleware, async (req, res) => {
  try {
    const { matchCode } = req.params;
    const user = req.user;

    const match = await Match.findOne({
      matchCode: matchCode.toUpperCase().trim()
    })
    .populate('player1.user', 'username')
    .populate('player2.user', 'username');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    const userIdStr = user._id.toString();
    let player1Id = null;
    let player2Id = null;
    
    if (match.player1.user) {
      player1Id = match.player1.user._id?.toString() || match.player1.user.toString();
    }
    if (match.player2.user) {
      player2Id = match.player2.user._id?.toString() || match.player2.user.toString();
    }

    const isPlayer1 = player1Id === userIdStr;
    const isPlayer2 = player2Id === userIdStr;

    if (!isPlayer1 && !isPlayer2) {
      return res.status(403).json({
        success: false,
        message: 'You are not part of this match'
      });
    }

    const side = isPlayer1 ? 'player1' : 'player2';
    const playerData = side === 'player1' ? match.player1 : match.player2;
    const opponentData = side === 'player1' ? match.player2 : match.player1;

    const myTeam = (playerData.team || []).map((card, index) => ({
      index,
      characterId: card.characterId,
      characterName: card.characterName || 'Unknown',
      powerLevel: card.powerLevel || 25,
      image: card.image || '',
      used: card.used || false,
      won: card.won,
      isSelected: index === playerData.selectedCardIndex,
      isConfirmed: index === playerData.confirmedCardIndex,
      roundUsed: card.roundUsed,
      level: card.level || 1,
      element: card.element || 'Fire',
      rarity: card.rarity || 'Common'
    }));

    const opponentTeam = (opponentData.team || []).map((card, index) => ({
      index,
      characterName: card.characterName || 'Unknown',
      powerLevel: card.powerLevel || 25,
      image: card.image || '',
      used: card.used || false,
      won: card.won,
      roundUsed: card.roundUsed,
      isSelected: false,
      isConfirmed: false,
      level: card.level || 1,
      element: card.element || 'Fire',
      rarity: card.rarity || 'Common'
    }));

    const now = new Date();
    const timeLeft = match.selectionDeadline ?
      Math.max(0, Math.floor((match.selectionDeadline - now) / 1000)) : 0;

    const bothConfirmed = match.player1.confirmedCardIndex !== null &&
                         match.player2.confirmedCardIndex !== null;

    const isSelectingReward = match.status === 'selecting_reward';
    const isWinner = match.winner?.toString() === user._id.toString();

    let availableCardsToSteal = [];
    if (isSelectingReward && isWinner) {
      availableCardsToSteal = match.availableCardsToSteal || [];
    }

    const isConfirmed = side === 'player1' ? 
      match.player1.confirmedCardIndex !== null : 
      match.player2.confirmedCardIndex !== null;

    let roundResult = null;

    if (match.roundStates && match.roundStates.length > 0) {
      const lastRound = match.roundStates[match.roundStates.length - 1];
      if (lastRound && lastRound.revealed) {
        roundResult = {
          player1CardIndex: lastRound.player1CardIndex,
          player2CardIndex: lastRound.player2CardIndex,
          winner: lastRound.winner,
          revealed: true,
          player1Card: lastRound.player1CardIndex !== undefined && lastRound.player1CardIndex !== null ? 
            match.player1.team[lastRound.player1CardIndex] : null,
          player2Card: lastRound.player2CardIndex !== undefined && lastRound.player2CardIndex !== null ?
            match.player2.team[lastRound.player2CardIndex] : null,
          player1Element: lastRound.player1Element || null,
          player2Element: lastRound.player2Element || null
        };
      }
    }

    if (!roundResult && bothConfirmed) {
      const p1Index = match.player1.confirmedCardIndex;
      const p2Index = match.player2.confirmedCardIndex;
      
      if (p1Index !== null && p2Index !== null) {
        const p1Card = match.player1.team[p1Index];
        const p2Card = match.player2.team[p2Index];
        let winner = null;
        
        if (p1Card && p2Card) {
          const p1Power = calculateEffectivePower(p1Card, p2Card);
          const p2Power = calculateEffectivePower(p2Card, p1Card);
          
          if (p1Power > p2Power) winner = 'player1';
          else if (p2Power > p1Power) winner = 'player2';
          else winner = 'draw';
        }
        
        roundResult = {
          player1CardIndex: p1Index,
          player2CardIndex: p2Index,
          winner: winner,
          revealed: true,
          player1Card: p1Card || null,
          player2Card: p2Card || null,
          player1Element: p1Card?.element || 'Fire',
          player2Element: p2Card?.element || 'Fire'
        };
      }
    }

    console.log('🔍 [GET MATCH] bothConfirmed:', bothConfirmed);
    console.log('🔍 [GET MATCH] roundResult:', roundResult);

    res.json({
      success: true,
      match: {
        id: match._id,
        matchCode: match.matchCode,
        status: match.status,
        currentRound: match.currentRound,
        maxRounds: match.maxRounds,
        selectionDeadline: match.selectionDeadline,
        timeLeft,
        bothConfirmed,
        mySide: side,
        isHost: isPlayer1,
        isWaiting: match.status === 'waiting',
        isReady: match.player1.user && match.player2.user,
        isWinner,
        isSelectingReward,
        isConfirmed,
        availableCardsToSteal,
        forfeit: match.forfeit || false,
        forfeitBy: match.forfeitBy || null,
        player1: {
          username: match.player1.username,
          user: player1Id,
          score: match.player1.currentScore,
          confirmed: match.player1.confirmedCardIndex !== null
        },
        player2: {
          username: match.player2.username,
          user: player2Id,
          score: match.player2.currentScore,
          confirmed: match.player2.confirmedCardIndex !== null
        },
        myTeam: myTeam,
        opponentTeam: opponentTeam,
        roundResult: roundResult,
        roundHistory: match.roundStates.map(round => ({
          round: round.round,
          winner: round.winner,
          player1Power: round.player1Power,
          player2Power: round.player2Power,
          revealed: round.revealed,
          player1Element: round.player1Element || null,
          player2Element: round.player2Element || null
        })),
        gameLog: match.gameLog.slice(-20),
        cardsWon: playerData.cardsWon || [],
        cardsLost: playerData.cardsLost || [],
        isFinished: match.status === 'finished',
        winner: match.winnerUsername,
        stolenCard: match.stolenCard,
        finalScore: match.finalScore,
        gemRewards: match.gemRewards || { winner: 20, loser: 5, draw: 10, duplicateBonus: 20 }
      }
    });

  } catch (error) {
    console.error('Get match error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get match state'
    });
  }
});

// ============================================================
// SELECT CARD
// ============================================================
router.post('/select', authMiddleware, async (req, res) => {
  try {
    const { matchCode, cardIndex } = req.body;
    const user = req.user;

    if (cardIndex === undefined || cardIndex === null) {
      return res.status(400).json({
        success: false,
        message: 'Card index is required'
      });
    }

    const match = await Match.findOne({
      matchCode: matchCode.toUpperCase().trim()
    });

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    if (match.status !== 'selecting') {
      return res.status(400).json({
        success: false,
        message: 'Match is not in selection phase'
      });
    }

    const side = getPlayerSide(match, user._id);
    if (!side) {
      return res.status(403).json({
        success: false,
        message: 'You are not part of this match'
      });
    }

    const playerData = side === 'player1' ? match.player1 : match.player2;

    if (cardIndex < 0 || cardIndex >= playerData.team.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid card index'
      });
    }

    const card = playerData.team[cardIndex];
    if (card.used) {
      return res.status(400).json({
        success: false,
        message: 'This card has already been used!'
      });
    }

    if (playerData.confirmedCardIndex !== null) {
      return res.status(400).json({
        success: false,
        message: 'You have already confirmed your selection!'
      });
    }

    playerData.selectedCardIndex = cardIndex;
    await match.save();

    if (ioInstance) {
      ioInstance.to(match.matchCode).emit('match-card-selected', {
        matchCode: match.matchCode,
        playerId: user._id,
        cardIndex
      });
    }

    res.json({
      success: true,
      message: 'Card selected! Click Confirm to lock your choice.',
      selectedCard: {
        index: cardIndex,
        name: card.characterName,
        power: card.powerLevel,
        element: card.element || 'Fire'
      }
    });

  } catch (error) {
    console.error('Select card error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to select card'
    });
  }
});

// ============================================================
// CONFIRM CARD
// ============================================================
router.post('/confirm', authMiddleware, async (req, res) => {
  try {
    const { matchCode } = req.body;
    const user = req.user;

    console.log(`🔍 [CONFIRM] ${user.username} confirming card for match: ${matchCode}`);

    const match = await Match.findOne({
      matchCode: matchCode.toUpperCase().trim()
    });

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    if (match.status !== 'selecting') {
      return res.status(400).json({
        success: false,
        message: 'Match is not in selection phase'
      });
    }

    const side = getPlayerSide(match, user._id);
    if (!side) {
      return res.status(403).json({
        success: false,
        message: 'You are not part of this match'
      });
    }

    const playerData = side === 'player1' ? match.player1 : match.player2;

    if (playerData.selectedCardIndex === null || playerData.selectedCardIndex === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please select a card first!'
      });
    }

    if (playerData.confirmedCardIndex !== null) {
      return res.status(400).json({
        success: false,
        message: 'You have already confirmed your selection!'
      });
    }

    const cardIndex = playerData.selectedCardIndex;
    const card = playerData.team[cardIndex];

    if (card.used) {
      return res.status(400).json({
        success: false,
        message: 'This card has already been used!'
      });
    }

    playerData.confirmedCardIndex = cardIndex;
    await match.save();

    console.log(`✅ [CONFIRM] ${user.username} confirmed card ${cardIndex}`);
    console.log(`🔍 [CONFIRM] Player1 confirmed: ${match.player1.confirmedCardIndex}`);
    console.log(`🔍 [CONFIRM] Player2 confirmed: ${match.player2.confirmedCardIndex}`);
    console.log(`🔍 [CONFIRM] Both confirmed: ${match.isBothConfirmed()}`);

    if (ioInstance) {
      ioInstance.to(match.matchCode).emit('match-card-confirmed', {
        matchCode: match.matchCode,
        playerId: user._id,
        cardIndex
      });
    }

    if (match.isBothConfirmed()) {
      console.log('🎯 [CONFIRM] Both confirmed! Revealing round...');
      await revealRound(match);
    } else {
      console.log('⏳ [CONFIRM] Waiting for opponent to confirm...');
    }

    res.json({
      success: true,
      message: 'Card confirmed! Waiting for opponent...',
      confirmedCard: {
        index: cardIndex,
        name: card.characterName,
        power: card.powerLevel,
        element: card.element || 'Fire'
      }
    });

  } catch (error) {
    console.error('Confirm card error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm card'
    });
  }
});

// ============================================================
// HELPER: Get player side
// ============================================================
function getPlayerSide(match, userId) {
  const userIdStr = userId.toString();
  
  let player1Id = null;
  if (match.player1?.user) {
    player1Id = match.player1.user._id?.toString() || match.player1.user.toString();
  }
  
  let player2Id = null;
  if (match.player2?.user) {
    player2Id = match.player2.user._id?.toString() || match.player2.user.toString();
  }
  
  if (player1Id === userIdStr) return 'player1';
  if (player2Id === userIdStr) return 'player2';
  return null;
}

// ============================================================
// HELPER: Calculate Effective Power with Element
// ============================================================
function getElementAdvantage(element1, element2) {
  const advantages = {
    'Fire': 'Wind',
    'Wind': 'Earth',
    'Earth': 'Water',
    'Water': 'Fire'
  };
  
  if (!element1 || !element2) return 1.0;
  
  if (advantages[element1] === element2) return 1.2;
  if (advantages[element2] === element1) return 0.8;
  return 1.0;
}

function calculateEffectivePower(card, opponentCard) {
  const basePower = card.powerLevel || 25;
  const element = card.element || 'Fire';
  const opponentElement = opponentCard?.element || 'Fire';
  const advantage = getElementAdvantage(element, opponentElement);
  return Math.round(basePower * advantage * 10) / 10;
}

// ============================================================
// REVEAL ROUND
// ============================================================
async function revealRound(match) {
  console.log('🎯 [REVEAL] Revealing round...');
  console.log('🎯 [REVEAL] Player1 card index:', match.player1.confirmedCardIndex);
  console.log('🎯 [REVEAL] Player2 card index:', match.player2.confirmedCardIndex);

  const p1Index = match.player1.confirmedCardIndex;
  const p2Index = match.player2.confirmedCardIndex;

  const p1Card = match.player1.team[p1Index];
  const p2Card = match.player2.team[p2Index];

  const p1Element = p1Card.element || 'Fire';
  const p2Element = p2Card.element || 'Fire';

  const p1EffectivePower = calculateEffectivePower(p1Card, p2Card);
  const p2EffectivePower = calculateEffectivePower(p2Card, p1Card);

  console.log('🎯 [REVEAL] Player1 card:', p1Card.characterName, 'Power:', p1Card.powerLevel, 'Element:', p1Element, 'Effective:', p1EffectivePower);
  console.log('🎯 [REVEAL] Player2 card:', p2Card.characterName, 'Power:', p2Card.powerLevel, 'Element:', p2Element, 'Effective:', p2EffectivePower);

  p1Card.used = true;
  p1Card.roundUsed = match.currentRound;
  p2Card.used = true;
  p2Card.roundUsed = match.currentRound;

  let winner = null;
  if (p1EffectivePower > p2EffectivePower) {
    winner = 'player1';
    match.player1.currentScore += 1;
    p1Card.won = true;
    p2Card.won = false;
  } else if (p2EffectivePower > p1EffectivePower) {
    winner = 'player2';
    match.player2.currentScore += 1;
    p2Card.won = true;
    p1Card.won = false;
  } else {
    winner = 'draw';
    p1Card.won = false;
    p2Card.won = false;
  }

  match.roundStates.push({
    round: match.currentRound,
    player1CardIndex: p1Index,
    player2CardIndex: p2Index,
    winner: winner,
    player1Power: p1EffectivePower,
    player2Power: p2EffectivePower,
    revealed: true,
    player1Element: p1Element,
    player2Element: p2Element
  });

  const winnerName = winner === 'player1' ? match.player1.username :
                     winner === 'player2' ? match.player2.username : 'Draw';
  match.addLog('info', `Round ${match.currentRound}: ${winnerName} won! (${p1Card.characterName} ${p1Element} vs ${p2Card.characterName} ${p2Element})`);

  match.player1.confirmedCardIndex = null;
  match.player1.selectedCardIndex = null;
  match.player2.confirmedCardIndex = null;
  match.player2.selectedCardIndex = null;

  if (match.currentRound >= match.maxRounds) {
    await endMatch(match);
    return;
  }

  match.currentRound += 1;
  match.status = 'round_result';

  await match.save();

  if (ioInstance) {
    ioInstance.to(match.matchCode).emit('round-revealed', {
      matchCode: match.matchCode,
      round: match.currentRound - 1,
      winner: winner,
      player1Card: p1Card,
      player2Card: p2Card,
      player1Power: p1EffectivePower,
      player2Power: p2EffectivePower,
      player1Element: p1Element,
      player2Element: p2Element
    });
  }

  setTimeout(async () => {
    try {
      const freshMatch = await Match.findById(match._id);
      if (!freshMatch) return;
      
      if (freshMatch.status === 'round_result') {
        freshMatch.status = 'selecting';
        freshMatch.selectionDeadline = new Date(Date.now() + 30000);
        freshMatch.addLog('info', `Round ${freshMatch.currentRound} starting! You have 30 seconds.`);
        await freshMatch.save();

        if (ioInstance) {
          ioInstance.to(freshMatch.matchCode).emit('match-update', {
            matchCode: freshMatch.matchCode,
            status: 'selecting',
            round: freshMatch.currentRound,
            message: `Round ${freshMatch.currentRound} starting!`
          });
        }
      }
    } catch (error) {
      console.error('❌ [REVEAL] Error in next round timeout:', error);
    }
  }, 3000);
}

// ============================================================
// END MATCH
// ============================================================
async function endMatch(match) {
  const p1Score = match.player1.currentScore;
  const p2Score = match.player2.currentScore;

  let winner = null;
  let winnerSide = null;
  let loserSide = null;
  let winnerUsername = null;

  console.log('🏆 [END MATCH] Scores:', p1Score, '-', p2Score);

  const gemRewards = match.gemRewards || { winner: 20, loser: 5, draw: 10, duplicateBonus: 20 };

  if (p1Score > p2Score) {
    winner = match.player1.user;
    winnerUsername = match.player1.username;
    winnerSide = 'player1';
    loserSide = 'player2';
    console.log('🏆 [END MATCH] Winner:', winnerUsername);
  } else if (p2Score > p1Score) {
    winner = match.player2.user;
    winnerUsername = match.player2.username;
    winnerSide = 'player2';
    loserSide = 'player1';
    console.log('🏆 [END MATCH] Winner:', winnerUsername);
  } else {
    console.log('⚖️ [END MATCH] Draw!');
    match.winnerUsername = 'Draw';
    match.status = 'finished';
    await match.save();

    const drawGems = gemRewards.draw || 10;
    const [user1, user2] = await Promise.all([
      User.findById(match.player1.user),
      User.findById(match.player2.user)
    ]);
    
    if (user1) {
      user1.gems = (user1.gems || 0) + drawGems;
      await user1.save();
    }
    if (user2) {
      user2.gems = (user2.gems || 0) + drawGems;
      await user2.save();
    }

    if (ioInstance) {
      ioInstance.to(match.matchCode).emit('match-ended', {
        matchCode: match.matchCode,
        winner: 'Draw',
        gemRewards: { each: drawGems },
        message: 'The battle ended in a draw! Both players get ' + drawGems + ' gems.'
      });
    }
    return;
  }

  match.winner = winner;
  match.winnerUsername = winnerUsername;
  match.winnerSide = winnerSide;
  match.loserSide = loserSide;

  const winnerData = winnerSide === 'player1' ? match.player1 : match.player2;
  const loserData = loserSide === 'player1' ? match.player1 : match.player2;

  const availableCards = loserData.team.map((card, index) => ({
    index: index,
    characterId: card.characterId,
    characterName: card.characterName,
    powerLevel: card.powerLevel,
    image: card.image,
    used: card.used,
    roundUsed: card.roundUsed,
    level: card.level || 1,
    element: card.element || 'Fire',
    rarity: card.rarity || 'Common'
  }));

  match.availableCardsToSteal = availableCards;
  match.status = 'selecting_reward';
  match.finalScore = {
    player1: match.player1.currentScore,
    player2: match.player2.currentScore
  };

  await match.save();

  console.log('🏆 [END MATCH] saved - winnerUsername:', match.winnerUsername);

  if (ioInstance) {
    ioInstance.to(match.matchCode).emit('match-ended-waiting-selection', {
      matchCode: match.matchCode,
      winner: winnerUsername,
      winnerId: winner,
      availableCards: availableCards,
      finalScore: match.finalScore,
      gemRewards: {
        winner: gemRewards.winner,
        loser: gemRewards.loser
      },
      message: `${winnerUsername} won! Select a card to steal from opponent.`
    });
  }
}

// ============================================================
// PLAYER LEAVES MATCH (FORFEIT)
// ============================================================
router.post('/leave', authMiddleware, async (req, res) => {
  try {
    const { matchCode } = req.body;
    const user = req.user;

    if (!matchCode) {
      return res.status(400).json({
        success: false,
        message: 'Match code is required'
      });
    }

    const match = await Match.findOne({
      matchCode: matchCode.toUpperCase().trim()
    });

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    if (match.status === 'finished') {
      return res.status(400).json({
        success: false,
        message: 'Match already finished'
      });
    }

    if (match.status === 'waiting') {
      return res.status(400).json({
        success: false,
        message: 'Match not started yet'
      });
    }

    const side = getPlayerSide(match, user._id);
    if (!side) {
      return res.status(403).json({
        success: false,
        message: 'You are not part of this match'
      });
    }

    const winnerSide = side === 'player1' ? 'player2' : 'player1';
    const loserSide = side;

    const winnerData = winnerSide === 'player1' ? match.player1 : match.player2;
    const loserData = loserSide === 'player1' ? match.player1 : match.player2;

    match.winner = winnerData.user;
    match.winnerUsername = winnerData.username;
    match.winnerSide = winnerSide;
    match.loserSide = loserSide;
    match.forfeit = true;
    match.forfeitBy = side;

    const remainingRounds = match.maxRounds - match.currentRound + 1;
    if (winnerSide === 'player1') {
      match.player1.currentScore += remainingRounds;
    } else {
      match.player2.currentScore += remainingRounds;
    }

    match.finalScore = {
      player1: match.player1.currentScore,
      player2: match.player2.currentScore
    };

    const availableCards = loserData.team.map((card, index) => ({
      index: index,
      characterId: card.characterId,
      characterName: card.characterName,
      powerLevel: card.powerLevel,
      image: card.image,
      used: card.used,
      roundUsed: card.roundUsed,
      level: card.level || 1,
      element: card.element || 'Fire',
      rarity: card.rarity || 'Common'
    }));

    match.availableCardsToSteal = availableCards;
    match.status = 'selecting_reward';

    match.addLog('info', `${loserData.username} left the match! ${winnerData.username} wins by forfeit.`);

    await match.save();

    if (ioInstance) {
      ioInstance.to(match.matchCode).emit('opponent-left', {
        matchCode: match.matchCode,
        winner: winnerData.username,
        loser: loserData.username,
        message: `${loserData.username} left the match! You win by forfeit.`
      });

      ioInstance.to(match.matchCode).emit('match-ended-waiting-selection', {
        matchCode: match.matchCode,
        winner: winnerData.username,
        winnerId: winnerData.user,
        availableCards: availableCards,
        finalScore: match.finalScore,
        forfeit: true,
        message: `${winnerData.username} wins by forfeit! Select a card to steal.`
      });
    }

    res.json({
      success: true,
      message: `You left the match. ${winnerData.username} wins by forfeit!`,
      winner: winnerData.username,
      winnerSide: winnerSide,
      finalScore: match.finalScore,
      canSteal: true,
      availableCards: availableCards,
      forfeit: true
    });

  } catch (error) {
    console.error('Player leave error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process leave'
    });
  }
});

// ============================================================
// STEAL CARD
// ============================================================
router.post('/steal', authMiddleware, async (req, res) => {
  try {
    const { matchCode, cardIndex } = req.body;
    const user = req.user;

    if (cardIndex === undefined || cardIndex === null) {
      return res.status(400).json({
        success: false,
        message: 'Please select a card to steal'
      });
    }

    const match = await Match.findOne({
      matchCode: matchCode.toUpperCase().trim(),
      status: 'selecting_reward'
    });

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found or already completed'
      });
    }

    if (match.winner.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the winner can select a card to steal'
      });
    }

    const winnerSide = match.winnerSide;
    const loserSide = match.loserSide;
    const winnerData = winnerSide === 'player1' ? match.player1 : match.player2;
    const loserData = loserSide === 'player1' ? match.player1 : match.player2;

    if (cardIndex < 0 || cardIndex >= loserData.team.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid card selection'
      });
    }

    const stolenCard = loserData.team[cardIndex];
    const gemRewards = match.gemRewards || { winner: 20, loser: 5, draw: 10, duplicateBonus: 20 };

    winnerData.cardsWon.push({
      characterId: stolenCard.characterId,
      characterName: stolenCard.characterName,
      powerLevel: stolenCard.powerLevel,
      image: stolenCard.image,
      stolenFrom: loserData.user,
      stolenFromUsername: loserData.username,
      wonAt: new Date()
    });

    loserData.cardsLost.push({
      characterId: stolenCard.characterId,
      characterName: stolenCard.characterName,
      powerLevel: stolenCard.powerLevel,
      image: stolenCard.image,
      lostTo: winnerData.user,
      lostToUsername: winnerData.username,
      lostAt: new Date()
    });

    match.stolenCard = {
      characterId: stolenCard.characterId,
      characterName: stolenCard.characterName,
      powerLevel: stolenCard.powerLevel,
      image: stolenCard.image,
      from: loserData.user,
      fromUsername: loserData.username,
      to: winnerData.user,
      toUsername: winnerData.username,
      stolenAt: new Date()
    };

    const winnerUser = await User.findById(winnerData.user);
    const loserUser = await User.findById(loserData.user);

    const winnerGems = gemRewards.winner || 20;
    if (winnerUser) {
      winnerUser.gems = (winnerUser.gems || 0) + winnerGems;
      const alreadyHas = winnerUser.cards.some(c =>
        c.characterId.toString() === stolenCard.characterId.toString()
      );

      if (!alreadyHas) {
        winnerUser.cards.push({
          characterId: stolenCard.characterId,
          characterName: stolenCard.characterName,
          powerLevel: stolenCard.powerLevel,
          basePower: stolenCard.powerLevel,
          currentPower: stolenCard.powerLevel,
          level: 1,
          element: stolenCard.element || 'Fire',
          rarity: stolenCard.rarity || 'Common',
          image: stolenCard.image,
          unlockedAt: new Date(),
          stolenFrom: loserData.user,
          stolenAt: new Date()
        });
      } else {
        const bonusGems = gemRewards.duplicateBonus || 20;
        winnerUser.gems = (winnerUser.gems || 0) + bonusGems;
        winnerUser.matchStats.cardsStolen = (winnerUser.matchStats.cardsStolen || 0) + 1;
        console.log(`💰 Duplicate card! ${winnerUser.username} gets ${bonusGems} bonus gems`);
      }
      await winnerUser.save();
    }

    const loserGems = gemRewards.loser || 5;
    if (loserUser) {
      loserUser.gems = (loserUser.gems || 0) + loserGems;
      const cardIndexInCollection = loserUser.cards.findIndex(c =>
        c.characterId.toString() === stolenCard.characterId.toString()
      );
      if (cardIndexInCollection !== -1) {
        loserUser.cards.splice(cardIndexInCollection, 1);
      }
      await loserUser.save();
    }

    match.status = 'finished';
    match.addLog('info', `🎯 ${winnerData.username} stole ${stolenCard.characterName} from ${loserData.username}!`);
    match.addLog('gem', `💰 ${winnerData.username} earned ${winnerGems} gems, ${loserData.username} earned ${loserGems} gems`);
    await match.save();

    if (ioInstance) {
      ioInstance.to(match.matchCode).emit('match-ended', {
        matchCode: match.matchCode,
        winner: match.winnerUsername,
        stolenCard: match.stolenCard,
        finalScore: match.finalScore,
        gemRewards: {
          winner: winnerGems,
          loser: loserGems,
          duplicateBonus: gemRewards.duplicateBonus
        },
        forfeit: match.forfeit || false,
        message: `${winnerData.username} stole ${stolenCard.characterName} and earned ${winnerGems} gems!`
      });
    }

    res.json({
      success: true,
      message: `🎯 ${winnerData.username} stole ${stolenCard.characterName}!`,
      stolenCard: match.stolenCard,
      winner: match.winnerUsername,
      finalScore: match.finalScore,
      forfeit: match.forfeit || false,
      gems: {
        winner: winnerGems,
        loser: loserGems,
        duplicateBonus: winnerUser && winnerUser.cards.some(c =>
          c.characterId.toString() === stolenCard.characterId.toString()
        ) ? gemRewards.duplicateBonus : 0
      }
    });

  } catch (error) {
    console.error('Steal card error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to steal card'
    });
  }
});

// ============================================================
// GET MATCH HISTORY
// ============================================================
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const user = req.user;

    const matches = await Match.find({
      $or: [
        { 'player1.user': user._id },
        { 'player2.user': user._id }
      ],
      status: 'finished'
    })
    .sort({ createdAt: -1 })
    .limit(20)
    .select('matchCode player1 player2 winnerUsername finalScore stolenCard gemRewards forfeit forfeitBy createdAt');

    const history = matches.map(match => ({
      matchCode: match.matchCode,
      opponent: match.player1.user.toString() === user._id.toString() ?
        match.player2.username : match.player1.username,
      winner: match.winnerUsername,
      myScore: match.player1.user.toString() === user._id.toString() ?
        match.finalScore.player1 : match.finalScore.player2,
      opponentScore: match.player1.user.toString() === user._id.toString() ?
        match.finalScore.player2 : match.finalScore.player1,
      stolenCard: match.stolenCard,
      gemRewards: match.gemRewards || { winner: 20, loser: 5, draw: 10 },
      forfeit: match.forfeit || false,
      forfeitBy: match.forfeitBy || null,
      createdAt: match.createdAt
    }));

    res.json({
      success: true,
      history
    });

  } catch (error) {
    console.error('Get match history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get match history'
    });
  }
});

// ============================================================
// MATCH INVITE
// ============================================================
router.post('/invite', authMiddleware, async (req, res) => {
  try {
    const { matchCode, friendId } = req.body;
    const user = req.user;

    console.log(`📨 [MATCH INVITE] ${user.username} inviting to match: ${matchCode}`);

    if (!matchCode || !friendId) {
      return res.status(400).json({
        success: false,
        message: 'Match code and friend ID are required'
      });
    }

    const match = await Match.findOne({ 
      matchCode: matchCode.toUpperCase().trim(),
      status: 'waiting'
    });

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found or already started'
      });
    }

    if (match.player1.user.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the host can invite friends'
      });
    }

    const friend = await User.findById(friendId);
    if (!friend) {
      return res.status(404).json({
        success: false,
        message: 'Friend not found'
      });
    }

    if (match.player2.user && match.player2.user.toString() === friendId) {
      return res.status(400).json({
        success: false,
        message: 'Friend is already in the match'
      });
    }

    if (ioInstance) {
      const inviteData = {
        matchCode: match.matchCode,
        from: {
          id: user._id,
          username: user.username
        },
        match: {
          id: match._id,
          code: match.matchCode,
          type: 'battle',
          players: 1,
          maxPlayers: 2
        }
      };

      ioInstance.to(`user_${friendId}`).emit('match-invite', inviteData);
      ioInstance.emit('match-invite-global', {
        ...inviteData,
        targetUserId: friendId
      });

      console.log(`✅ Match invite sent from ${user.username} to ${friend.username}`);
    }

    res.json({
      success: true,
      message: `Invite sent to ${friend.username}!`
    });

  } catch (error) {
    console.error('❌ [MATCH INVITE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send invite'
    });
  }
});

// ============================================================
// ACCEPT MATCH INVITE
// ============================================================
router.post('/accept-invite', authMiddleware, async (req, res) => {
  try {
    const { matchCode } = req.body;
    const user = req.user;

    console.log(`📨 [ACCEPT MATCH INVITE] ${user.username} accepting invite to match: ${matchCode}`);

    if (!matchCode) {
      return res.status(400).json({
        success: false,
        message: 'Match code is required'
      });
    }

    const match = await Match.findOne({ 
      matchCode: matchCode.toUpperCase().trim(),
      status: 'waiting'
    });

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found or already started'
      });
    }

    if (match.player1.user.toString() === user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You are the host of this match'
      });
    }

    if (match.player2.user) {
      return res.status(400).json({
        success: false,
        message: 'Match is already full'
      });
    }

    const userData = await User.findById(user._id);
    if (!userData.cards || userData.cards.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'You need at least 10 cards to join!'
      });
    }

    const topCards = userData.cards
      .sort((a, b) => (b.currentPower || b.powerLevel || 0) - (a.currentPower || a.powerLevel || 0))
      .slice(0, 10);

    const team = topCards.map(card => ({
      characterId: card.characterId,
      characterName: card.characterName,
      powerLevel: card.currentPower || card.powerLevel || 25,
      image: card.image || '',
      cardId: card._id.toString(),
      used: false,
      won: null,
      roundUsed: null,
      level: card.level || 1,
      element: card.element || 'Fire',
      rarity: card.rarity || 'Common'
    }));

    match.player2.user = user._id;
    match.player2.username = user.username;
    match.player2.team = team;
    match.player2.currentScore = 0;
    match.player2.selectedCardIndex = null;
    match.player2.confirmedCardIndex = null;
    match.player2.cardsWon = [];
    match.player2.cardsLost = [];

    match.status = 'waiting';
    await match.save();

    if (ioInstance) {
      ioInstance.to(match.matchCode).emit('match-update', {
        matchCode: match.matchCode,
        status: match.status,
        message: `${user.username} joined the battle!`
      });
    }

    res.json({
      success: true,
      message: 'Joined match successfully! Waiting for host to start...',
      matchCode: match.matchCode
    });

  } catch (error) {
    console.error('❌ Accept match invite error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept invite'
    });
  }
});

// ============================================================
// DECLINE MATCH INVITE
// ============================================================
router.post('/decline-invite', authMiddleware, async (req, res) => {
  try {
    const { matchCode } = req.body;
    const user = req.user;

    console.log(`📨 ${user.username} declined match invite to: ${matchCode}`);

    res.json({
      success: true,
      message: 'Invite declined'
    });

  } catch (error) {
    console.error('Decline match invite error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to decline invite'
    });
  }
});

// ============================================================
// EXPORTS
// ============================================================
module.exports = router;
module.exports.setIO = setIO;