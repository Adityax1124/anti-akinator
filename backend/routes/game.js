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

// ===================== START GAME =====================
router.post('/start', async (req, res) => {
  try {
    const characterCount = await Character.countDocuments();
    
    if (characterCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'No characters available. Please contact support.'
      });
    }

    const randomIndex = Math.floor(Math.random() * characterCount);
    const randomCharacter = await Character.findOne().skip(randomIndex);

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
      status: 'active',
      startedAt: new Date()
    });

    await game.save();

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

    const character = game.character;

    const context = `
IMPORTANT CHARACTER DATA:
Anime: ${character.anime}
Description: ${character.description.substring(0, 500)}...
Gender: ${character.traits?.gender || 'Unknown'}
Species: ${character.traits?.species || 'Unknown'}
Age: ${character.traits?.age || 'Unknown'}
Powers: ${character.traits?.powers?.slice(0, 3).join(', ') || 'None'}
Personality: ${character.traits?.personality?.slice(0, 3).join(', ') || 'Unknown'}
Affiliations: ${character.traits?.affiliations?.slice(0, 2).join(', ') || 'None'}
Relationships: ${character.traits?.relationships?.slice(0, 2).join(', ') || 'None'}
Main Character: ${character.attributes?.isMainCharacter ? 'Yes' : 'No'}
Villain: ${character.attributes?.isVillain ? 'Yes' : 'No'}
Female: ${character.attributes?.isFemale ? 'Yes' : 'No'}

USER QUESTION: "${sanitizedQuestion}"`;

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
    let usedProvider = 'none';

    try {
      const result = await askAI(messages);
      answer = result.answer || 'Maybe';
      usedProvider = result.provider || 'none';
      console.log(`✅ Answer from ${usedProvider}: "${answer}"`);
    } catch (error) {
      console.error('AI provider error:', error.message);
      return res.status(503).json({
        success: false,
        message: 'AI service unavailable. Please try again.'
      });
    }

    const validAnswers = ['Yes', 'No', 'Maybe', 'Very likely', 'Unlikely'];

    const isAnimeName = !validAnswers.some(a => 
      answer.toLowerCase().includes(a.toLowerCase())
    );

    let finalAnswer;
    if (isAnimeName) {
      finalAnswer = answer.trim();
    } else {
      const matchedAnswer = validAnswers.find(a => 
        answer.toLowerCase().includes(a.toLowerCase())
      );
      finalAnswer = matchedAnswer || 'Maybe';
    }

    console.log(`📝 Final answer: "${finalAnswer}"`);

    game.questions.push({ 
      question: sanitizedQuestion, 
      answer: finalAnswer, 
      confidence: 0.8 
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

// ===================== USE HINT =====================
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

// ===================== MAKE GUESS =====================
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
      // ===== WIN =====
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

      // ✅ NEW: Add character to user's card collection
      const character = game.character;
      const cardAdded = user.addCard(character);
      
      if (cardAdded) {
        console.log(`🃏 Card added to ${user.username}'s collection: ${character.name} (Power: ${character.powerLevel})`);
      } else {
        console.log(`ℹ️ Card already in collection: ${character.name}`);
      }

      // ===== REFERRAL REWARD CHECK =====
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
        // ===== LOSE =====
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

// ===================== GIVE UP =====================
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

// ===================== GET HISTORY =====================
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