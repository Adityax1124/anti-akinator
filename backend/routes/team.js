const express = require('express');
const { body, validationResult } = require('express-validator');
const TeamRoom = require('../models/TeamRoom');
const Character = require('../models/Character');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const { askAI } = require('../utils/aiRouter');
const router = express.Router();

// ===== GENERATE ROOM CODE =====
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ANTI-${code}`;
}

// ===== VALIDATION =====
const validateRoomCode = [
  body('roomCode')
    .trim()
    .escape()
    .isLength({ min: 10, max: 12 })
    .withMessage('Invalid room code')
];

const validateQuestion = [
  body('question')
    .trim()
    .escape()
    .isLength({ min: 1, max: 500 })
    .withMessage('Question must be between 1 and 500 characters')
];

const validateGuess = [
  body('guess')
    .trim()
    .escape()
    .isLength({ min: 1, max: 100 })
    .withMessage('Guess must be between 1 and 100 characters')
];

// ============================================================
// SET IO INSTANCE (Called from server.js)
// ============================================================
let ioInstance = null;

const setIO = (io) => {
  ioInstance = io;
  console.log('🔌 Socket.io instance set in team routes');
};

// ============================================================
// CREATE ROOM
// ============================================================
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    
    console.log('📝 [CREATE ROOM] User:', user.username);

    const existingRoom = await TeamRoom.findOne({
      host: user._id,
      status: { $in: ['waiting', 'playing'] }
    });

    if (existingRoom) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active team room',
        roomCode: existingRoom.roomCode
      });
    }

    let roomCode;
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      roomCode = generateRoomCode();
      const existing = await TeamRoom.findOne({ roomCode });
      if (!existing) isUnique = true;
      attempts++;
    }

    if (!isUnique) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate unique room code'
      });
    }

    console.log('📝 [CREATE ROOM] Generated room code:', roomCode);

    const room = new TeamRoom({
      roomCode,
      host: user._id,
      players: [{
        user: user._id,
        username: user.username
      }],
      status: 'waiting'
    });

    await room.save();

    console.log('📝 [CREATE ROOM] Room saved:', room._id);

    res.json({
      success: true,
      roomCode: room.roomCode,
      room: {
        id: room._id,
        roomCode: room.roomCode,
        host: {
          _id: user._id,
          username: user.username
        },
        players: room.players,
        maxPlayers: room.maxPlayers,
        status: room.status
      }
    });

  } catch (error) {
    console.error('❌ Create room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create room'
    });
  }
});

// ============================================================
// JOIN ROOM
// ============================================================
router.post('/join', authMiddleware, validateRoomCode, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid room code',
        errors: errors.array().map(e => e.msg)
      });
    }

    const { roomCode } = req.body;
    const user = req.user;

    console.log(`📝 [JOIN ROOM] User ${user.username} joining room: ${roomCode}`);

    const room = await TeamRoom.findOne({ 
      roomCode: roomCode.toUpperCase().trim(),
      status: 'waiting'
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found or already started'
      });
    }

    if (room.players.length >= room.maxPlayers) {
      return res.status(400).json({
        success: false,
        message: 'Room is full'
      });
    }

    if (room.players.some(p => p.user && p.user.toString() === user._id.toString())) {
      return res.status(400).json({
        success: false,
        message: 'You are already in this room'
      });
    }

    room.players.push({
      user: user._id,
      username: user.username
    });

    await room.save();

    if (ioInstance) {
      ioInstance.to(room.roomCode).emit('player-joined', {
        roomCode: room.roomCode,
        player: {
          username: user.username,
          _id: user._id
        }
      });
      console.log(`📢 [SOCKET] Player joined event emitted for ${room.roomCode}`);
    }

    const updatedRoom = await TeamRoom.findById(room._id).populate('host', 'username');

    res.json({
      success: true,
      roomCode: updatedRoom.roomCode,
      room: {
        id: updatedRoom._id,
        roomCode: updatedRoom.roomCode,
        host: updatedRoom.host,
        players: updatedRoom.players,
        maxPlayers: updatedRoom.maxPlayers,
        status: updatedRoom.status
      }
    });

  } catch (error) {
    console.error('❌ Join room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join room'
    });
  }
});

// ============================================================
// GET ROOM INFO
// ============================================================
router.get('/room/:roomCode', authMiddleware, async (req, res) => {
  try {
    const { roomCode } = req.params;

    console.log(`📝 [GET ROOM] Fetching room: ${roomCode}`);

    const room = await TeamRoom.findOne({ 
      roomCode: roomCode.toUpperCase().trim()
    }).populate('host', 'username');

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    console.log(`📝 [GET ROOM] Room found, players: ${room.players.length}`);

    res.json({
      success: true,
      room: {
        id: room._id,
        roomCode: room.roomCode,
        host: room.host,
        players: room.players,
        maxPlayers: room.maxPlayers,
        status: room.status,
        gameData: room.gameData
      }
    });

  } catch (error) {
    console.error('❌ Get room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get room info'
    });
  }
});

// ============================================================
// START TEAM GAME
// ============================================================
router.post('/start', authMiddleware, async (req, res) => {
  try {
    const { roomCode } = req.body;
    const user = req.user;

    console.log(`📝 [START GAME] User ${user.username} starting game in room: ${roomCode}`);

    const room = await TeamRoom.findOne({ 
      roomCode: roomCode.toUpperCase().trim(),
      status: 'waiting'
    }).populate('host', 'username');

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    const isHost = room.host && room.host._id 
      ? room.host._id.toString() === user._id.toString() 
      : room.host.toString() === user._id.toString();

    if (!isHost) {
      return res.status(403).json({
        success: false,
        message: 'Only the host can start the game'
      });
    }

    if (room.players.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Need at least 2 players to start'
      });
    }

    const characterCount = await Character.countDocuments();
    if (characterCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'No characters available'
      });
    }

    const randomIndex = Math.floor(Math.random() * characterCount);
    const character = await Character.findOne().skip(randomIndex);

    room.status = 'playing';
    room.gameData.characterId = character._id;
    room.gameData.maxQuestions = 10;
    room.gameData.totalQuestions = 0;
    room.gameData.questions = [];
    room.gameData.guesses = [];
    room.gameData.isGuessed = false;

    await room.save();

    if (ioInstance) {
      ioInstance.to(room.roomCode).emit('game-started', {
        roomCode: room.roomCode,
        status: 'playing'
      });
      console.log(`📢 [SOCKET] Game started event emitted for ${room.roomCode}`);
    }

    res.json({
      success: true,
      message: 'Game started!',
      roomCode: room.roomCode,
      room: {
        id: room._id,
        roomCode: room.roomCode,
        status: room.status,
        maxQuestions: room.gameData.maxQuestions
      }
    });

  } catch (error) {
    console.error('❌ Start team game error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start game'
    });
  }
});

// ============================================================
// TEAM ASK QUESTION
// ============================================================
router.post('/question', authMiddleware, validateQuestion, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      });
    }

    const { roomCode, question } = req.body;
    const user = req.user;

    const room = await TeamRoom.findOne({ 
      roomCode: roomCode.toUpperCase().trim(),
      status: 'playing'
    }).populate('gameData.characterId');

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found or not active'
      });
    }

    if (!room.players.some(p => p.user && p.user.toString() === user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'You are not in this room'
      });
    }

    if (room.gameData.totalQuestions >= room.gameData.maxQuestions) {
      return res.status(400).json({
        success: false,
        message: 'You have used all 10 questions! Make a guess.',
        limitReached: true
      });
    }

    const character = room.gameData.characterId;

    // ===== ✅ UPDATED CONTEXT (Same as game.js) =====
    const context = `
Anime: ${character.anime}
Description: ${character.description.substring(0, 500)}...
Gender: ${character.traits?.gender || 'Unknown'}
Species: ${character.traits?.species || 'Unknown'}
Age: ${character.traits?.age || 'Unknown'}
Powers: ${character.traits?.powers?.slice(0, 3).join(', ') || 'None'}
Personality: ${character.traits?.personality?.slice(0, 3).join(', ') || 'Unknown'}
Affiliations: ${character.traits?.affiliations?.slice(0, 2).join(', ') || 'None'}
Relationships: ${character.traits?.relationships?.slice(0, 2).join(', ') || 'None'}
Main: ${character.attributes?.isMainCharacter ? 'Yes' : 'No'}
Villain: ${character.attributes?.isVillain ? 'Yes' : 'No'}
Female: ${character.attributes?.isFemale ? 'Yes' : 'No'}

USER: "${question}"`;

    // ===== ✅ ULTRA STRICT SYSTEM PROMPT - SAME AS GAME.JS =====
    const systemPrompt = `
You are a STRICT answer machine. You MUST follow these rules EXACTLY. Do NOT think, guess, assume, or infer.

===== YOUR ONLY ALLOWED RESPONSES =====
"Yes", "No", "Maybe", or the EXACT anime name from the data. NOTHING ELSE. NO punctuation, NO explanation, NO extra words.

===== THE CHARACTER DATA =====
The data below contains the character's anime name. You MUST use it to answer all anime-related questions.

===== CATEGORY LISTS (USE THESE TO ANSWER) =====
GODFATHER ANIME: Dragon Ball, Dragon Ball Z, Dragon Ball Super
OG BIG 3: Naruto, One Piece, Bleach
NEW GEN: My Hero Academia, Demon Slayer, Jujutsu Kaisen, Attack on Titan, Chainsaw Man, Black Clover, Fire Force, Solo Leveling, Kaiju No. 8, Dandadan, Sakamoto Days, Boruto, Mashle, Kagurabachi, Ichi the Witch (and any anime that started in 2015 or later)

===== HOW TO ANSWER (FOLLOW EXACTLY - NO EXCEPTIONS) =====

1. "Which anime?" or "What anime is he from?" or "What is the anime?" 
   → Reply with the EXACT anime name from the data. Example: "Naruto", "One Piece", "Solo Leveling"

2. "Is he from Big 3?" or "Is this Big 3?" or "Big 3?" 
   → Check if the anime name in data is Naruto, One Piece, or Bleach.
   → If YES → Reply "Yes"
   → If NO → Reply "No"

3. "Is he from New Gen?" or "Is this New Gen?" or "New Gen?" 
   → Check if the anime name in data is in the NEW GEN list above.
   → If YES → Reply "Yes"
   → If NO → Reply "No"

4. "Is he from Godfather?" or "Is this Godfather?" or "Godfather?" 
   → Check if the anime name in data is Dragon Ball, Dragon Ball Z, or Dragon Ball Super.
   → If YES → Reply "Yes"
   → If NO → Reply "No"

5. "Is he from [specific anime]?" (e.g., "Is he from Naruto?", "Is he from One Piece?")
   → Check if it matches the anime name in data EXACTLY.
   → If YES → Reply "Yes"
   → If NO → Reply "No"

6. "Is it [character name]?" or "Is my character [name]?" 
   → Reply "Maybe" (NEVER say Yes or No to identity questions)

7. ANY other question → Use the data to answer "Yes", "No", or "Maybe"

===== CRITICAL - YOU MUST KNOW THESE FACTS =====
- One Piece IS in OG Big 3. So "Is he from Big 3?" for One Piece = "Yes"
- Naruto IS in OG Big 3. So "Is he from Big 3?" for Naruto = "Yes"
- Bleach IS in OG Big 3. So "Is he from Big 3?" for Bleach = "Yes"
- One Piece is NOT New Gen. So "Is he from New Gen?" for One Piece = "No"
- Naruto is NOT New Gen. So "Is he from New Gen?" for Naruto = "No"
- Bleach is NOT New Gen. So "Is he from New Gen?" for Bleach = "No"
- Dragon Ball is NOT Big 3. So "Is he from Big 3?" for Dragon Ball = "No"
- Dragon Ball is NOT New Gen. So "Is he from New Gen?" for Dragon Ball = "No"
- Dragon Ball IS Godfather. So "Is he from Godfather?" for Dragon Ball = "Yes"

===== EXAMPLES (FOLLOW EXACTLY) =====

If anime in data is "Naruto":
- "Which anime?" → "Naruto"
- "Is he from Big 3?" → "Yes"
- "Is he from New Gen?" → "No"
- "Is he from Godfather?" → "No"
- "Is he from One Piece?" → "No"

If anime in data is "One Piece":
- "Which anime?" → "One Piece"
- "Is he from Big 3?" → "Yes"
- "Is he from New Gen?" → "No"
- "Is he from Godfather?" → "No"
- "Is he from Naruto?" → "No"

If anime in data is "My Hero Academia":
- "Which anime?" → "My Hero Academia"
- "Is he from Big 3?" → "No"
- "Is he from New Gen?" → "Yes"
- "Is he from Godfather?" → "No"
- "Is he from Naruto?" → "No"

If anime in data is "Solo Leveling":
- "Which anime?" → "Solo Leveling"
- "Is he from Big 3?" → "No"
- "Is he from New Gen?" → "Yes"
- "Is he from Godfather?" → "No"
- "Is he from Naruto?" → "No"

If anime in data is "Dragon Ball":
- "Which anime?" → "Dragon Ball"
- "Is he from Big 3?" → "No"
- "Is he from New Gen?" → "No"
- "Is he from Godfather?" → "Yes"
- "Is he from Naruto?" → "No"

===== CRITICAL RULES (NEVER BREAK - EVER) =====
1. You DO NOT know the character's name. The name is NEVER provided.
2. For identity questions ("Is it Luffy?") → ALWAYS reply "Maybe"
3. For "Which anime?" → ALWAYS reply with the EXACT anime name from data
4. For category questions (Big 3, New Gen, Godfather) → ALWAYS check the anime name against the lists above
5. Reply with ONLY one word: Yes, No, Maybe, or the anime name. NO explanation, NO punctuation, NO extra words.

===== REMEMBER =====
The anime name is in the data. USE IT to answer all anime-related questions. DO NOT guess. DO NOT assume. CHECK the data.
`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: context }
    ];

    let answer = "Maybe";
    try {
      const result = await askAI(messages);
      answer = result.answer || 'Maybe';
      console.log(`✅ Team AI answer: ${answer}`);
    } catch (error) {
      console.error('AI error:', error);
      answer = 'Maybe';
    }

    // ===== CLEAN UP ANSWER (SUPPORTS ANIME NAMES) =====
    const validAnswers = ['Yes', 'No', 'Maybe', 'Very likely', 'Unlikely'];

    // Check if answer is an anime name (not Yes/No/Maybe)
    const isAnimeName = !validAnswers.some(a => 
      answer.toLowerCase().includes(a.toLowerCase())
    );

    let finalAnswer;
    if (isAnimeName) {
      // If it's not Yes/No/Maybe, treat it as an anime name
      finalAnswer = answer.trim();
    } else {
      const matchedAnswer = validAnswers.find(a => 
        answer.toLowerCase().includes(a.toLowerCase())
      );
      finalAnswer = matchedAnswer || 'Maybe';
    }

    console.log(`📝 Team final answer: "${finalAnswer}"`);

    // Save question
    room.gameData.questions.push({
      question,
      answer: finalAnswer,
      askedBy: user.username
    });
    room.gameData.totalQuestions += 1;
    await room.save();

    res.json({
      success: true,
      answer: finalAnswer,
      questionCount: room.gameData.totalQuestions,
      maxQuestions: room.gameData.maxQuestions,
      askedBy: user.username
    });

  } catch (error) {
    console.error('❌ Team question error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to ask question'
    });
  }
});

// ============================================================
// TEAM MAKE GUESS
// ============================================================
router.post('/guess', authMiddleware, validateGuess, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      });
    }

    const { roomCode, guess } = req.body;
    const user = req.user;

    const room = await TeamRoom.findOne({ 
      roomCode: roomCode.toUpperCase().trim(),
      status: 'playing'
    }).populate('gameData.characterId');

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found or not active'
      });
    }

    if (!room.players.some(p => p.user && p.user.toString() === user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'You are not in this room'
      });
    }

    if (room.gameData.isGuessed) {
      return res.status(400).json({
        success: false,
        message: 'Character already guessed!'
      });
    }

    const character = room.gameData.characterId;

    const normalizedGuess = guess.toLowerCase().trim();
    const normalizedCharName = character.name.toLowerCase().trim();

    let isCorrect = normalizedGuess === normalizedCharName;

    if (!isCorrect) {
      const guessWords = normalizedGuess.split(' ');
      const charWords = normalizedCharName.split(' ');
      const allWordsMatch = guessWords.every(word => charWords.includes(word));
      if (allWordsMatch && guessWords.length > 0) {
        isCorrect = true;
      }
    }

    if (!isCorrect && normalizedCharName.includes(normalizedGuess) && normalizedGuess.length >= 3) {
      isCorrect = true;
    }

    room.gameData.guesses.push({
      guess,
      isCorrect,
      guessedBy: user.username
    });

    if (isCorrect) {
      room.gameData.isGuessed = true;
      room.gameData.characterName = character.name;
      room.gameData.characterImage = character.image || '';
      room.status = 'finished';

      const rewardAmount = 5;
      for (const player of room.players) {
        if (player.user) {
          const playerUser = await User.findById(player.user);
          if (playerUser) {
            playerUser.shards += rewardAmount;
            await playerUser.save();
            console.log(`🎴 ${playerUser.username} earned ${rewardAmount} Shards from team game`);
          }
        }
      }

      await room.save();

      return res.json({
        success: true,
        isCorrect: true,
        character: character.name,
        image: character.image || '',
        message: `🎉 Team guessed it! It was ${character.name}!`,
        reward: rewardAmount,
        players: room.players.map(p => p.username)
      });
    }

    await room.save();

    res.json({
      success: true,
      isCorrect: false,
      message: `❌ Not ${guess}. Keep trying!`,
      guessCount: room.gameData.guesses.length
    });

  } catch (error) {
    console.error('❌ Team guess error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to make guess'
    });
  }
});

// ============================================================
// LEAVE ROOM
// ============================================================
router.post('/leave', authMiddleware, async (req, res) => {
  try {
    const { roomCode } = req.body;
    const user = req.user;

    console.log(`📝 [LEAVE ROOM] User ${user.username} leaving room: ${roomCode}`);

    const room = await TeamRoom.findOne({ 
      roomCode: roomCode.toUpperCase().trim(),
      status: { $in: ['waiting', 'playing'] }
    }).populate('host', 'username');

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    const isInRoom = room.players.some(p => 
      p.user && p.user.toString() === user._id.toString()
    );

    if (!isInRoom) {
      return res.status(400).json({
        success: false,
        message: 'You are not in this room'
      });
    }

    room.players = room.players.filter(p => 
      p.user && p.user.toString() !== user._id.toString()
    );

    const isHost = room.host._id.toString() === user._id.toString();
    let roomDeleted = false;
    
    if (room.players.length === 0 || isHost) {
      await room.deleteOne();
      roomDeleted = true;
      return res.json({
        success: true,
        message: 'Room deleted'
      });
    }

    if (isHost && room.players.length > 0) {
      room.host = room.players[0].user;
    }

    await room.save();

    if (ioInstance && !roomDeleted) {
      ioInstance.to(room.roomCode).emit('player-left', {
        roomCode: room.roomCode,
        player: {
          username: user.username,
          _id: user._id
        }
      });
      console.log(`📢 [SOCKET] Player left event emitted for ${room.roomCode}`);
    }

    res.json({
      success: true,
      message: 'Left room successfully'
    });

  } catch (error) {
    console.error('❌ Leave room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to leave room'
    });
  }
});

// ============================================================
// EXPORTS
// ============================================================
module.exports = router;
module.exports.setIO = setIO;