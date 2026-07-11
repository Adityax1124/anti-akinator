const express = require('express');
const { body, validationResult } = require('express-validator');
const Character = require('../models/Character');
const GameSession = require('../models/GameSession');
const User = require('../models/User');
const Referral = require('../models/Referral');
const ProfilePhoto = require('../models/ProfilePhoto');
const { checkAndUnlockAchievements, unlockProfilePhoto } = require('../utils/achievementUtils');
const { getCurrentSeason } = require('../utils/seasonUtils');
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

// ============================================================
// GET ANIME OPTIONS (4 random anime)
// ============================================================
router.get('/anime-options', async (req, res) => {
  try {
    const allAnime = await Character.distinct('anime');
    
    if (!allAnime || allAnime.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No anime found in database.'
      });
    }

    if (allAnime.length < 4) {
      return res.status(400).json({
        success: false,
        message: 'Not enough anime in database. Need at least 4.',
        total: allAnime.length
      });
    }

    const shuffled = allAnime.sort(() => 0.5 - Math.random());
    const selectedAnime = shuffled.slice(0, 4);

    res.json({
      success: true,
      anime: selectedAnime,
      total: allAnime.length
    });

  } catch (error) {
    console.error('Get anime options error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get anime options'
    });
  }
});

// ============================================================
// START GAME WITH SELECTED ANIME
// ============================================================
router.post('/start', async (req, res) => {
  try {
    const { anime } = req.body;

    if (!anime) {
      return res.status(400).json({
        success: false,
        message: 'Please select an anime first!'
      });
    }

    const characters = await Character.find({ anime: anime });
    
    if (!characters || characters.length === 0) {
      return res.status(400).json({
        success: false,
        message: `No characters found for "${anime}". Please try another anime.`
      });
    }

    const randomIndex = Math.floor(Math.random() * characters.length);
    const randomCharacter = characters[randomIndex];

    if (!randomCharacter) {
      return res.status(404).json({
        success: false,
        message: 'No character found. Please try again.'
      });
    }

    const activeGame = await GameSession.findOne({
      user: req.user._id,
      status: 'active'
    });

    if (activeGame) {
      activeGame.status = 'abandoned';
      activeGame.endedAt = new Date();
      await activeGame.save();
    }

    const game = new GameSession({
      user: req.user._id,
      character: randomCharacter._id,
      anime: anime,
      status: 'active',
      startedAt: new Date()
    });

    await game.save();

    console.log(`🎮 Game started: ${game._id} for user ${req.user.username} | Anime: ${anime} | Character: ${randomCharacter.name}`);

    res.json({
      success: true,
      gameId: game._id,
      anime: anime,
      characterCount: characters.length,
      message: `Game started! Guess the character from ${anime}.`
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

// ============================================================
// ASK QUESTION (100% AI PARSE)
// ============================================================
router.post('/question', [...validateGameId, ...validateQuestion], async (req, res) => {
  try {
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

    if (game.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this game'
      });
    }

    if (game.totalQuestions >= 10) {
      return res.status(400).json({
        success: false,
        message: 'You have used all 10 questions. Please make a guess.',
        limitReached: true
      });
    }

    // ✅ DUPLICATE QUESTION CHECK
    const isDuplicate = game.questions.some(q => 
      q.question.toLowerCase().trim() === sanitizedQuestion.toLowerCase().trim()
    );

    if (isDuplicate) {
      return res.status(400).json({
        success: false,
        message: '❌ You already asked this question! Try something else.',
        isDuplicate: true
      });
    }

    const character = game.character;

    const context = `
CHARACTER NAME: ${character.name} (CONFIDENTIAL - USE FOR KNOWLEDGE, NEVER REVEAL)
Anime: ${character.anime}
Description: ${character.description ? character.description.substring(0, 500) : 'None'}...
Gender: ${character.traits?.gender || 'Unknown'}
Species: ${character.traits?.species || 'Unknown'}
Age: ${character.traits?.age || 'Unknown'}
Powers: ${character.traits?.powers?.slice(0, 3).join(', ') || 'None'}
Personality: ${character.traits?.personality?.slice(0, 3).join(', ') || 'Unknown'}
Affiliations: ${character.traits?.affiliations?.slice(0, 2).join(', ') || 'None'}
Relationships: ${character.traits?.relationships?.slice(0, 2).join(', ') || 'None'}

USER QUESTION: "${sanitizedQuestion}"`;

    const systemPrompt = `
You are a YES/NO answer machine. You DO NOT think. You DO NOT reason. You just answer.

===== YOUR ONLY ALLOWED OUTPUT =====
"Yes", "No", or "Maybe". NOTHING ELSE. Just one word.

===== HOW TO ANSWER =====
1. If the question asks "Is it [name]?" or contains ANY character name → Say "Maybe"
2. For ALL OTHER questions → Say "Yes" or "No" based on what you know
3. If you are unsure → Say "Maybe"

===== RULES =====
- "Does he use 3 swords?" → If character uses 3 swords → "Yes"
- "Does he use 1 sword only?" → If character uses 3 swords → "No"
- "Is he alive?" → If character is alive → "Yes"
- "Is he dead?" → If character is alive → "No"
- "Is it [name]?" → ALWAYS "Maybe"
- "Is he from [anime]?" → ALWAYS "Maybe"

===== REMEMBER =====
- You have the character name → Use it
- You NEVER say the name → Say "Maybe" for identity questions
- Just say Yes, No, or Maybe. Nothing else.
`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: context }
    ];

    let answer = "Maybe";
    let usedProvider = 'none';

    try {
      const result = await askAI(messages);
      answer = result.answer || 'Maybe';
      usedProvider = result.provider || 'none';
      console.log(`🤖 AI Raw Answer: "${answer}"`);
    } catch (error) {
      console.error('AI provider error:', error.message);
      return res.status(503).json({
        success: false,
        message: 'AI service unavailable. Please try again.'
      });
    }

    // ============================================================
    // ✅ FORCE PARSE AI ANSWER (100% RELIABLE)
    // ============================================================
    let finalAnswer = 'Maybe';
    const lowerAnswer = answer.toLowerCase().trim();

    // Check if answer contains a character name (identity question)
    const identityKeywords = ['is it', 'is he', 'is she', 'is this', 'is that', 'are you'];
    const isIdentityQuestion = identityKeywords.some(kw => lowerAnswer.includes(kw));
    
    if (isIdentityQuestion) {
      // If the answer itself contains a name, it's an identity question
      finalAnswer = 'Maybe';
      console.log(`🔒 Identity question detected → "Maybe"`);
    } else {
      // Parse Yes/No
      if (lowerAnswer.includes('yes')) {
        finalAnswer = 'Yes';
      } else if (lowerAnswer.includes('no')) {
        finalAnswer = 'No';
      } else if (lowerAnswer.includes('maybe')) {
        finalAnswer = 'Maybe';
      } else {
        // If AI says something else, default to Maybe
        finalAnswer = 'Maybe';
        console.log(`⚠️ Unknown response: "${answer}", defaulting to "Maybe"`);
      }
    }

    console.log(`📝 Final answer: "${finalAnswer}"`);

    game.questions.push({ 
      question: sanitizedQuestion, 
      answer: finalAnswer, 
      confidence: 1.0 
    });
    game.totalQuestions += 1;
    await game.save();

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

// ============================================================
// USE HINT
// ============================================================
router.post('/hint', validateGameId, async (req, res) => {
  try {
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

    if (game.hintUsed) {
      return res.status(400).json({
        success: false,
        message: 'Hint already used for this game!'
      });
    }

    if (user.shards < 50) {
      return res.status(400).json({
        success: false,
        message: `Not enough Character Shards! You have ${user.shards}, need 50.`,
        shards: user.shards
      });
    }

    user.shards -= 50;
    game.hintUsed = true;

    await user.save();
    await game.save();

    const hint = game.character.crucialHint || 'No hint available for this character.';

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

// ============================================================
// MAKE GUESS
// ============================================================
router.post('/guess', [...validateGameId, ...validateGuess], async (req, res) => {
  try {
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

    const wrongGuesses = game.guesses ? game.guesses.filter(g => !g.isCorrect) : [];
    if (wrongGuesses.length >= 3) {
      return res.status(400).json({
        success: false,
        message: 'Game already ended. Start a new game.'
      });
    }

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

    game.guesses.push({ guess: sanitizedGuess, isCorrect });

    if (isCorrect) {
      game.status = 'won';
      game.endedAt = new Date();
      game.totalQuestions = game.questions.length;
      await game.save();

      const user = await User.findById(req.user._id);
      
      user.stats.gamesPlayed += 1;
      user.stats.gamesWon += 1;
      user.stats.winStreak += 1;
      user.totalGuesses += 1;

      const currentSeason = getCurrentSeason();
      
      if (!user.seasonStats) {
        user.seasonStats = {
          currentSeason: currentSeason,
          seasonWins: 0,
          seasonPlayed: 0,
          seasonStreak: 0
        };
      }
      
      user.seasonStats.currentSeason = currentSeason;
      user.seasonStats.seasonWins += 1;
      user.seasonStats.seasonPlayed += 1;
      user.seasonStats.seasonStreak += 1;

      const anime = game.character.anime;
      const currentAnimeGuesses = user.animeGuesses?.get(anime) || 0;
      user.animeGuesses.set(anime, currentAnimeGuesses + 1);

      user.shards += 10;

      const character = game.character;
      const cardAdded = user.addCard(character);
      
      if (cardAdded) {
        console.log(`🃏 Card added to ${user.username}'s collection: ${character.name} (Power: ${character.powerLevel})`);
      } else {
        console.log(`ℹ️ Card already in collection: ${character.name}`);
      }

      const isFirstWin = user.stats.gamesWon === 1;

      if (user.referredBy && isFirstWin) {
        const referral = await Referral.findOne({
          referredUser: user._id,
          status: { $ne: 'completed' }
        });

        if (referral && !referral.referrerRewards.firstWin) {
          const referrer = await User.findById(referral.referrer);
          
          if (referrer) {
            referrer.shards += 50;
            referrer.referralStats.shardsEarned = (referrer.referralStats?.shardsEarned || 0) + 50;
            referrer.referralStats.completedReferrals = (referrer.referralStats?.completedReferrals || 0) + 1;
            await referrer.save();

            user.shards += 50;

            referral.referrerRewards.firstWin = true;
            referral.referredUserRewards.welcomeBonus = true;
            referral.status = 'completed';
            referral.firstWinAt = new Date();
            referral.completedAt = new Date();
            await referral.save();

            console.log(`🎉 Referral reward: ${referrer.username} and ${user.username} both got 50 Shards!`);
          }
        }
      }

      const unlockedAchievements = await checkAndUnlockAchievements(user._id);
      const photoUnlock = await unlockProfilePhoto(user._id, game.character._id);

      let allUnlocked = [];
      if (photoUnlock) allUnlocked.push(photoUnlock);
      if (unlockedAchievements.length > 0) allUnlocked = allUnlocked.concat(unlockedAchievements);

      await user.save();

      console.log(`🏆 ${user.username} won! Season stats:`, {
        wins: user.seasonStats.seasonWins,
        streak: user.seasonStats.seasonStreak,
        played: user.seasonStats.seasonPlayed,
        season: user.seasonStats.currentSeason
      });

      return res.json({
        success: true,
        isCorrect: true,
        character: game.character.name,
        anime: game.character.anime,
        image: game.character.image || '',
        powerLevel: game.character.powerLevel || 25,
        message: `🎉 Correct! It was ${game.character.name}!`,
        questionsUsed: game.totalQuestions,
        unlockedItems: allUnlocked,
        shards: user.shards,
        cardAdded: cardAdded,
        cardCount: user.cards.length
      });

    } else {
      const newWrongGuesses = game.guesses.filter(g => !g.isCorrect);
      
      if (newWrongGuesses.length >= 3) {
        game.status = 'lost';
        game.endedAt = new Date();
        game.totalQuestions = game.questions.length;
        await game.save();

        const currentSeason = getCurrentSeason();
        
        await User.findByIdAndUpdate(req.user._id, {
          $inc: { 
            'stats.gamesPlayed': 1,
            'seasonStats.seasonPlayed': 1
          },
          $set: { 
            'stats.winStreak': 0,
            'seasonStats.seasonStreak': 0,
            'seasonStats.currentSeason': currentSeason
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
          powerLevel: game.character.powerLevel || 25,
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

// ============================================================
// GIVE UP
// ============================================================
router.post('/giveup', validateGameId, async (req, res) => {
  try {
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

    const currentSeason = getCurrentSeason();

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 
        'stats.gamesPlayed': 1,
        'seasonStats.seasonPlayed': 1
      },
      $set: { 
        'stats.winStreak': 0,
        'seasonStats.seasonStreak': 0,
        'seasonStats.currentSeason': currentSeason
      }
    });

    return res.json({
      success: true,
      character: game.character.name,
      anime: game.character.anime,
      image: game.character.image || '',
      powerLevel: game.character.powerLevel || 25,
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

// ============================================================
// GET HISTORY
// ============================================================
router.get('/history', async (req, res) => {
  try {
    const games = await GameSession.find({ user: req.user._id })
      .populate('character', 'name anime image powerLevel')
      .sort({ startedAt: -1 })
      .limit(20);

    const sanitizedGames = games.map(game => ({
      id: game._id,
      character: game.character?.name || 'Unknown',
      anime: game.character?.anime || 'Unknown',
      powerLevel: game.character?.powerLevel || 25,
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