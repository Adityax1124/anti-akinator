const express = require('express');
const { body, validationResult } = require('express-validator');
const Character = require('../models/Character');
const GameSession = require('../models/GameSession');
const User = require('../models/User');
const ProfilePhoto = require('../models/ProfilePhoto');
const { checkAndUnlockAchievements, unlockProfilePhoto } = require('../utils/achievementUtils');
const { checkAndResetSeason } = require('../utils/seasonUtils');
const { askAI } = require('../utils/aiRouter');
const router = express.Router();

// ===== HELPER: Normalize string for flexible matching =====
function normalize(str) {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ===== HELPER: Sanitize user input =====
function sanitizeInput(str) {
  if (!str) return '';
  return str.replace(/[<>]/g, '').trim();
}

// ===== VALIDATION RULES =====
const validateGameId = [
  body('gameId')
    .notEmpty()
    .withMessage('Game ID is required')
    .isMongoId()
    .withMessage('Invalid game ID format')
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
    .matches(/^[a-zA-Z0-9\s\-'.,!?]+$/)
    .withMessage('Guess contains invalid characters')
];

// ===================== START GAME =====================
router.post('/start', async (req, res) => {
  try {
    // Get total characters count
    const characterCount = await Character.countDocuments();
    
    if (characterCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'No characters available. Please contact support.'
      });
    }

    // Randomly select a character
    const randomIndex = Math.floor(Math.random() * characterCount);
    const randomCharacter = await Character.findOne().skip(randomIndex);

    if (!randomCharacter) {
      return res.status(404).json({
        success: false,
        message: 'No character found. Please try again.'
      });
    }

    // Check if user already has an active game
    const activeGame = await GameSession.findOne({
      user: req.user._id,
      status: 'active'
    });

    // If active game exists, end it first (cleanup)
    if (activeGame) {
      activeGame.status = 'abandoned';
      activeGame.endedAt = new Date();
      await activeGame.save();
    }

    // Create new game
    const game = new GameSession({
      user: req.user._id,
      character: randomCharacter._id,
      status: 'active',
      startedAt: new Date()
    });

    await game.save();

    // Log (sanitized)
    console.log(`🎮 Game started: ${game._id} for user ${req.user.username}`);

    res.json({
      success: true,
      gameId: game._id,
      message: 'Game started! Ask your first question.'
    });

  } catch (error) {
    console.error('Start game error:', {
      message: error.message,
      userId: req.user?._id,
      ip: req.ip
    });
    res.status(500).json({
      success: false,
      message: 'Error starting game. Please try again.'
    });
  }
});

// ===================== ASK QUESTION =====================
router.post('/question', [...validateGameId, ...validateQuestion], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      });
    }

    const { gameId, question } = req.body;
    const sanitizedQuestion = sanitizeInput(question);

    // Find game
    const game = await GameSession.findById(gameId).populate('character');
    
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    if (game.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Game is not active. Start a new game.'
      });
    }

    // Verify ownership
    if (game.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this game'
      });
    }

    // Check question limit
    if (game.totalQuestions >= 10) {
      return res.status(400).json({
        success: false,
        message: 'You have used all 10 questions. Please make a guess.',
        limitReached: true
      });
    }

    const character = game.character;

    // ===== PREPARE CONTEXT FOR AI (Sanitized) =====
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

USER: "${sanitizedQuestion}"`;

    // ===== SYSTEM PROMPT =====
    const systemPrompt = `
You are a STRICT answer machine. You have NO brain. You do NOT think, guess, assume, or infer.

RULES:
You answer YES/NO/MAYBE based ONLY on character data below.
STRICT answer machine. Use ONLY character data below.

STEP 1: Check for EXACT match in data.
STEP 2: If no exact match, use SMART logic (synonyms, relationships, context).
RELATIONSHIPS: "son of", "protégée", "ally", "enemy", "friend" → YES to "related to X".
AFFILIATIONS: If group listed → YES to "from X" or "part of X". If "(former)" or "(disbanded)" → NO to "currently in X".
CONTEXT: Understand time (currently vs formerly). Connect synonyms naturally.
IDENTITY: Ask "Is it X?" or "Is my character X?" → ALWAYS "MAYBE".
UNSURE: Say "MAYBE".
Your ONLY allowed responses: "Yes", "No", or "Maybe". Nothing else.
EXAMPLES:
- Data says "Gender: Male" → "Is it female?" = "No"
- Data says "Powers: Fire" → "Does he use ice?" = "No"
- Data says "Devil Fruit: None" → "Has eaten a fruit?" = "No"
- Data says "Role: Cook" → "Is he a captain?" = "No"
When in doubt → say "MAYBE".
CRITICAL RULES – NEVER BREAK THESE:
1. You DO NOT know the character's name. The name is NEVER provided to you.
2. You CANNOT reveal, hint at, or confirm the character's identity in ANY way.
3. If the user asks ANY question that attempts to identify the character (e.g., "Is it Luffy?"), you MUST ALWAYS answer "Maybe".
4. NEVER say "Yes" or "No" to identity questions. ONLY "Maybe".
Return EXACTLY one reply with NO explanation, punctuation, or extra words.
REMEMBER: You are BLIND to the character's name. You NEVER reveal it.
`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: context }
    ];

    // ===== CALL AI WITH AUTO-FAILOVER =====
    let answer = "Maybe";
    let usedProvider = 'none';

    try {
      const result = await askAI(messages);
      answer = result.answer || 'Maybe';
      usedProvider = result.provider || 'none';
      // Log only provider (not the question)
      console.log(`✅ Answer from ${usedProvider}`);
    } catch (error) {
      console.error('AI provider error:', error.message);
      return res.status(503).json({
        success: false,
        message: 'AI service unavailable. Please try again.'
      });
    }

    // Clean up answer (sanitize)
    const validAnswers = ['Yes', 'No', 'Maybe', 'Very likely', 'Unlikely'];
    const matchedAnswer = validAnswers.find(a => 
      answer.toLowerCase().includes(a.toLowerCase())
    );
    const finalAnswer = matchedAnswer || 'Maybe';

    // Save question (sanitized)
    game.questions.push({ 
      question: sanitizedQuestion, 
      answer: finalAnswer, 
      confidence: 0.8 
    });
    game.totalQuestions += 1;
    await game.save();

    // Update user stats
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.totalQuestions': 1 }
    });

    res.json({
      success: true,
      answer: finalAnswer,
      questionCount: game.totalQuestions,
      maxQuestions: 10,
      provider: usedProvider
    });

  } catch (error) {
    console.error('Question error:', {
      message: error.message,
      userId: req.user?._id,
      ip: req.ip
    });
    res.status(500).json({
      success: false,
      message: 'Error processing question. Please try again.'
    });
  }
});

// ===================== USE HINT =====================
router.post('/hint', validateGameId, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      });
    }

    const { gameId } = req.body;

    const game = await GameSession.findById(gameId).populate('character');

    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    if (game.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Game is not active'
      });
    }

    if (game.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const user = await User.findById(req.user._id);

    // Check if hint already used
    if (game.hintUsed) {
      return res.status(400).json({
        success: false,
        message: 'Hint already used for this game!'
      });
    }

    // Check shards (50 required)
    if (user.shards < 50) {
      return res.status(400).json({
        success: false,
        message: `Not enough Character Shards! You have ${user.shards}, need 50.`,
        shards: user.shards
      });
    }

    // Deduct shards
    user.shards -= 50;
    game.hintUsed = true;

    await user.save();
    await game.save();

    const hint = game.character.crucialHint || 'No hint available for this character.';

    // Log (sanitized)
    console.log(`💡 Hint used: ${gameId} by ${user.username}`);

    res.json({
      success: true,
      hint: hint,
      shards: user.shards,
      message: '💡 Hint used! -50 Shards'
    });

  } catch (error) {
    console.error('Hint error:', {
      message: error.message,
      userId: req.user?._id,
      ip: req.ip
    });
    res.status(500).json({
      success: false,
      message: 'Error using hint. Please try again.'
    });
  }
});

// ===================== MAKE GUESS =====================
router.post('/guess', [...validateGameId, ...validateGuess], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      });
    }

    const { gameId, guess } = req.body;
    const sanitizedGuess = sanitizeInput(guess);

    // Log (sanitized - only gameId, not the guess)
    console.log(`🔍 Guess attempt: gameId=${gameId}`);

    const game = await GameSession.findById(gameId).populate('character');

    if (!game) {
      console.log('❌ Game not found:', gameId);
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    if (game.status !== 'active') {
      console.log('❌ Game is not active:', game.status);
      return res.status(400).json({
        success: false,
        message: 'Game is not active. Start a new game.'
      });
    }

    if (game.user.toString() !== req.user._id.toString()) {
      console.log('❌ User not authorized for this game');
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Check if game has ended
    const wrongGuesses = game.guesses ? game.guesses.filter(g => !g.isCorrect) : [];
    if (wrongGuesses.length >= 3) {
      return res.status(400).json({
        success: false,
        message: 'Game already ended. Start a new game.'
      });
    }

    // Flexible matching (sanitized)
    const normalizedGuess = normalize(sanitizedGuess);
    const normalizedCharName = normalize(game.character.name);

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

    // Save guess (sanitized)
    game.guesses.push({ guess: sanitizedGuess, isCorrect });

    if (isCorrect) {
      // ===== WIN =====
      game.status = 'won';
      game.endedAt = new Date();
      game.totalQuestions = game.questions.length;
      await game.save();

      const user = await User.findById(req.user._id);
      
      // Update lifetime stats
      user.stats.gamesPlayed += 1;
      user.stats.gamesWon += 1;
      user.stats.winStreak += 1;
      user.totalGuesses += 1;

      // Update season stats
      try {
        await checkAndResetSeason();
      } catch (seasonError) {
        console.error('Season error:', seasonError);
      }
      
      if (!user.seasonStats) {
        user.seasonStats = {
          currentSeason: new Date().getFullYear() * 100 + (new Date().getMonth() + 1),
          seasonWins: 0,
          seasonPlayed: 0,
          seasonStreak: 0
        };
      }
      
      user.seasonStats.seasonWins += 1;
      user.seasonStats.seasonPlayed += 1;
      user.seasonStats.seasonStreak += 1;

      // Track anime-specific guesses (sanitized)
      const anime = game.character.anime;
      const currentAnimeGuesses = user.animeGuesses?.get(anime) || 0;
      user.animeGuesses.set(anime, currentAnimeGuesses + 1);

      // Shards reward
      user.shards += 10;

      // Check achievements
      const unlockedAchievements = await checkAndUnlockAchievements(user._id);
      const photoUnlock = await unlockProfilePhoto(user._id, game.character._id);

      let allUnlocked = [];
      if (photoUnlock) allUnlocked.push(photoUnlock);
      if (unlockedAchievements.length > 0) allUnlocked = allUnlocked.concat(unlockedAchievements);

      await user.save();

      // Log (sanitized - only username, not character)
      console.log(`🏆 ${user.username} won! Season stats:`, {
        wins: user.seasonStats.seasonWins,
        streak: user.seasonStats.seasonStreak,
        played: user.seasonStats.seasonPlayed
      });

      return res.json({
        success: true,
        isCorrect: true,
        character: game.character.name,
        anime: game.character.anime,
        image: game.character.image || '',
        message: `🎉 Correct! It was ${game.character.name}!`,
        questionsUsed: game.totalQuestions,
        unlockedItems: allUnlocked,
        shards: user.shards
      });

    } else {
      const newWrongGuesses = game.guesses.filter(g => !g.isCorrect);
      
      if (newWrongGuesses.length >= 3) {
        // ===== LOSE =====
        game.status = 'lost';
        game.endedAt = new Date();
        game.totalQuestions = game.questions.length;
        await game.save();

        await User.findByIdAndUpdate(req.user._id, {
          $inc: { 
            'stats.gamesPlayed': 1,
            'seasonStats.seasonPlayed': 1
          },
          $set: { 
            'stats.winStreak': 0,
            'seasonStats.seasonStreak': 0
          }
        });

        console.log(`❌ ${req.user.username} lost! Character: ${game.character.name}`);

        return res.json({
          success: true,
          isCorrect: false,
          gameOver: true,
          character: game.character.name,
          anime: game.character.anime,
          image: game.character.image || '',
          message: `❌ Game over! The character was ${game.character.name}.`
        });
      } else {
        await game.save();
        return res.json({
          success: true,
          isCorrect: false,
          message: `❌ Not ${sanitizedGuess}. Try again! (${3 - newWrongGuesses.length} guesses left)`,
          remainingGuesses: 3 - newWrongGuesses.length
        });
      }
    }

  } catch (error) {
    console.error('Guess error:', {
      message: error.message,
      userId: req.user?._id,
      ip: req.ip
    });
    res.status(500).json({
      success: false,
      message: 'Error processing guess. Please try again.'
    });
  }
});

// ===================== GIVE UP =====================
router.post('/giveup', validateGameId, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      });
    }

    const { gameId } = req.body;

    console.log(`🏳️ Giveup request: ${gameId} by ${req.user.username}`);

    const game = await GameSession.findById(gameId).populate('character');

    if (!game) {
      console.log('❌ Game not found:', gameId);
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    if (game.status !== 'active') {
      console.log('❌ Game not active:', game.status);
      return res.status(400).json({
        success: false,
        message: 'Game is not active'
      });
    }

    if (game.user.toString() !== req.user._id.toString()) {
      console.log('❌ User not authorized');
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    game.status = 'abandoned';
    game.endedAt = new Date();
    game.totalQuestions = game.questions.length;
    await game.save();

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 
        'stats.gamesPlayed': 1,
        'seasonStats.seasonPlayed': 1
      },
      $set: { 
        'stats.winStreak': 0,
        'seasonStats.seasonStreak': 0
      }
    });

    return res.json({
      success: true,
      character: game.character.name,
      anime: game.character.anime,
      image: game.character.image || '',
      message: `You gave up! The character was ${game.character.name} from ${game.character.anime}.`
    });

  } catch (error) {
    console.error('Give up error:', {
      message: error.message,
      userId: req.user?._id,
      ip: req.ip
    });
    res.status(500).json({
      success: false,
      message: 'Error giving up. Please try again.'
    });
  }
});

// ===================== GET HISTORY =====================
router.get('/history', async (req, res) => {
  try {
    const games = await GameSession.find({ user: req.user._id })
      .populate('character', 'name anime image')
      .sort({ startedAt: -1 })
      .limit(20);

    const sanitizedGames = games.map(game => ({
      id: game._id,
      character: game.character?.name || 'Unknown',
      anime: game.character?.anime || 'Unknown',
      status: game.status,
      questions: game.totalQuestions || game.questions.length,
      startedAt: game.startedAt,
      endedAt: game.endedAt
    }));

    res.json({
      success: true,
      games: sanitizedGames
    });
  } catch (error) {
    console.error('History error:', {
      message: error.message,
      userId: req.user?._id
    });
    res.status(500).json({
      success: false,
      message: 'Error fetching history. Please try again.'
    });
  }
});

module.exports = router;