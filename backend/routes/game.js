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
// ✅ NEW: GET ANIME OPTIONS (4 random anime)
// ============================================================
router.get('/anime-options', async (req, res) => {
  try {
    // Get all unique anime names from Character collection
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

    // Pick 4 random anime
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
// ✅ MODIFIED: START GAME WITH SELECTED ANIME
// ============================================================
router.post('/start', async (req, res) => {
  try {
    const { anime } = req.body;

    // ✅ Check if user selected an anime
    if (!anime) {
      return res.status(400).json({
        success: false,
        message: 'Please select an anime first!'
      });
    }

    // ✅ Find characters from selected anime
    const characters = await Character.find({ anime: anime });
    
    if (!characters || characters.length === 0) {
      return res.status(400).json({
        success: false,
        message: `No characters found for "${anime}". Please try another anime.`
      });
    }

    // Pick random character from that anime
    const randomIndex = Math.floor(Math.random() * characters.length);
    const randomCharacter = characters[randomIndex];

    if (!randomCharacter) {
      return res.status(404).json({
        success: false,
        message: 'No character found. Please try again.'
      });
    }

    // Check for active game
    const activeGame = await GameSession.findOne({
      user: req.user._id,
      status: 'active'
    });

    if (activeGame) {
      activeGame.status = 'abandoned';
      activeGame.endedAt = new Date();
      await activeGame.save();
    }

    // ✅ Create new game session with anime info
    const game = new GameSession({
      user: req.user._id,
      character: randomCharacter._id,
      anime: anime, // ✅ Store selected anime
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
You are a highly intelligent Q&A assistant for a character guessing game. The player is trying to guess a secret anime/manga character. You have access to character data AND can use your general knowledge to reason logically.

===== YOUR ONLY ALLOWED RESPONSES =====
"Yes", "No", or "Maybe". NOTHING ELSE. NO explanations, NO punctuation, NO extra words.

===== CRITICAL RULE #1: NEVER REVEAL IDENTITY (STRICTEST RULE) =====
If the user asks ANY question that attempts to identify the character:
- "Is it [name]?"
- "Is my character [name]?"
- "Is the character [name]?"
- "Is this [name]?"
- ANY question containing a character name

→ ALWAYS reply "Maybe" ONLY. 
→ This is the MOST IMPORTANT rule. NEVER break it under ANY circumstances.

===== CRITICAL RULE #2: THINK LOGICALLY & REASON =====
You are smart. Use your knowledge and reasoning:

1. CONTRADICTION DETECTION:
   - If a character uses 3 swords → "Does he use 1 sword only?" = "No"
   - If a character is male → "Is she female?" = "No"
   - If a character is alive → "Is he dead?" = "No"
   - ALWAYS check if your answer contradicts previous information

2. "ONLY" / "EXACTLY" / "JUST" QUESTIONS:
   - "Does he use X only?" = Does he use EXACTLY X?
   - If uses 3 swords → "only 1" = "No"
   - If uses 1 sword → "only 1" = "Yes"
   - If uses 3 swords → "only 3" = "Yes"
   - If uses 3 swords → "just 3" = "Yes"
   - If uses 3 swords → "exactly 3" = "Yes"

3. COMPARATIVE QUESTIONS:
   - "Is he stronger than X?" → Check data, reason logically
   - "Is he faster than X?" → Check data, reason logically
   - "Is he taller than X?" → Check data, reason logically

4. INFER FROM CONTEXT:
   - If character is a pirate → Likely has a ship, crew
   - If character is a swordsman → Likely uses swords
   - If character is a ninja → Likely uses kunai, shuriken
   - Use your general knowledge to infer, but if not sure → Reply "Maybe"

5. ALIVE/DEAD LOGIC:
   - Data says "died" → "Is he alive?" = "No"
   - Data says "killed" → "Is he alive?" = "No"
   - Data says "survived" → "Is he alive?" = "Yes"
   - Data says "alive" → "Is he dead?" = "No"

6. GENDER LOGIC:
   - Data says "male" → "Is he a girl?" = "No"
   - Data says "female" → "Is he a boy?" = "No"

7. NUMBER LOGIC:
   - Data says "3 swords" → "Does he use 2 swords?" = "No"
   - Data says "red hair" → "Is his hair blue?" = "No"
   - Data says "tall" → "Is he short?" = "No"

===== RULE #3: USE YOUR KNOWLEDGE WISELY =====
- You have general knowledge about anime/manga
- You can infer things that aren't explicitly in the data
- But if you're not sure → Reply "Maybe"
- Don't guess randomly

===== HOW TO ANSWER (FOLLOW EXACTLY) =====

1. Question asks for character name → Reply "Maybe" (ALWAYS)
2. Question is about gender → Use data + logic → Yes/No/Maybe
3. Question is about age → Use data + logic → Yes/No/Maybe
4. Question is about appearance → Use data + logic → Yes/No/Maybe
5. Question is about weapons/abilities → Use data + logic → Yes/No/Maybe
6. Question is about relationships → Use data + logic → Yes/No/Maybe
7. Question is about alive/dead → Use data + logic → Yes/No/Maybe
8. Question is about "only" or "exactly" → Use logical reasoning → Yes/No/Maybe
9. Question contains a character name → Reply "Maybe" (STRICTEST RULE)

===== REMEMBER (YOUR BRAIN) =====
- You have knowledge of anime/manga
- You can reason logically
- You can infer from context
- But NEVER reveal the character's name
- If the user asks "Is it [name]?" → ALWAYS "Maybe"
- If data has the info → Reply "Yes" or "No"
- If data does NOT have the info → Reply "Maybe"
- If you're unsure → Reply "Maybe"
- Reply with ONLY one word: Yes, No, or Maybe

===== EXAMPLES OF SMART REASONING =====

Data: Character uses 3 swords, male, alive, pirate, has scar on eye
User: "Is he from One Piece?"
AI: "Maybe" (identity question → ALWAYS Maybe)

User: "Does he use 3 swords?"
AI: "Yes" (matches data exactly)

User: "Does he use 1 sword only?"
AI: "No" (data says 3 swords, not 1)

User: "Does he use only 3 swords?"
AI: "Yes" (data says exactly 3 swords)

User: "Is he a girl?"
AI: "No" (data says male)

User: "Is he alive?"
AI: "Yes" (data says alive)

User: "Does he have a scar?"
AI: "Yes" (data mentions scar)

User: "Is he a pirate?"
AI: "Yes" (data says pirate - inferred from context)

User: "Is he Luffy?"
AI: "Maybe" (identity question → ALWAYS Maybe)

Data: Character has 3 swords, male, alive
User: "Does he use 2 swords?"
AI: "No" (data says 3, not 2)

User: "Does he use exactly 3 swords?"
AI: "Yes" (data says 3)

Data: Character has a devil fruit ability
User: "Can he swim?"
AI: "No" (devil fruit users can't swim - inferred knowledge)

Data: Character is a swordsman with a sword
User: "Does he have a sword?"
AI: "Yes" (swordsman has a sword)

User: "Is he Zoro?"
AI: "Maybe" (ALWAYS Maybe for identity)

===== YOUR SUPERPOWER =====
You don't just answer questions. You THINK. You REASON. You CONNECT THE DOTS.
But you NEVER reveal the name. That's the golden rule.

ALWAYS REMEMBER: 
- Character identity = ALWAYS "Maybe"
- Everything else = Use logic + data = Yes/No/Maybe`;

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