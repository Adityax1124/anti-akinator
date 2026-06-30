const express = require('express');
const Character = require('../models/Character');
const GameSession = require('../models/GameSession');
const User = require('../models/User');
const ProfilePhoto = require('../models/ProfilePhoto');
const { checkAndUnlockAchievements, unlockProfilePhoto } = require('../utils/achievementUtils');
const { checkAndResetSeason } = require('../utils/seasonUtils');
const { askAI } = require('../utils/aiRouter');
const router = express.Router();

// Helper: normalize string for flexible matching
function normalize(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ===================== START GAME =====================
router.post('/start', async (req, res) => {
  try {
    const characters = await Character.find();
    if (characters.length === 0) {
      return res.status(400).json({
        message: 'No characters available. Please add some first.',
        success: false
      });
    }

    const randomCharacter = characters[Math.floor(Math.random() * characters.length)];

    const game = new GameSession({
      user: req.user._id,
      character: randomCharacter._id,
      status: 'active'
    });

    await game.save();

    res.json({
      success: true,
      gameId: game._id,
      message: 'Game started! Ask your first question.'
    });
  } catch (error) {
    console.error('Start game error:', error);
    res.status(500).json({
      message: 'Error starting game',
      success: false
    });
  }
});

// ===================== ASK QUESTION =====================
router.post('/question', async (req, res) => {
  try {
    const { gameId, question } = req.body;

    if (!question || question.trim().length === 0) {
      return res.status(400).json({
        message: 'Please ask a question',
        success: false
      });
    }

    const game = await GameSession.findById(gameId).populate('character');
    if (!game || game.status !== 'active') {
      return res.status(400).json({
        message: 'Invalid or ended game session',
        success: false
      });
    }

    if (game.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'Not authorized',
        success: false
      });
    }

    // ===== CHECK 10 QUESTION LIMIT =====
    if (game.totalQuestions >= 10) {
      return res.status(400).json({
        message: 'You have used all 10 questions for this game! Use the Guess button.',
        success: false,
        limitReached: true
      });
    }

    const character = game.character;

    // ===== OPTIMIZED CHARACTER DATA (Reduced Tokens) =====
    const context = `
Anime: ${character.anime}
Description: ${character.description.substring(0, 150)}...
Gender: ${character.traits.gender}
Species: ${character.traits.species}
Age: ${character.traits.age || 'Unknown'}
Powers: ${character.traits.powers.slice(0, 3).join(', ') || 'None'}
Personality: ${character.traits.personality.slice(0, 3).join(', ') || 'Unknown'}
Affiliations: ${character.traits.affiliations.slice(0, 2).join(', ') || 'None'}
Relationships: ${character.traits.relationships.slice(0, 2).join(', ') || 'None'}
Main: ${character.attributes.isMainCharacter ? 'Yes' : 'No'}
Villain: ${character.attributes.isVillain ? 'Yes' : 'No'}
Female: ${character.attributes.isFemale ? 'Yes' : 'No'}

USER: "${question}"`;

    // ===== SYSTEM PROMPT =====
    const systemPrompt = `
You are the answer engine for an Anti-Akinator game.

YOUR JOB:
- Answer YES/NO questions about a secret anime character.
- Use your anime knowledge to understand character traits, relationships, and abilities.
- You are ALLOWED to infer answers from the provided data and your knowledge.
- You are SMART enough to understand what "one eye closed" means if the description says "has a scar over his left eye".

CRITICAL RULES – NEVER BREAK THESE:
1. You DO NOT know the character's name. The name is NEVER provided to you.
2. You CANNOT reveal, hint at, or confirm the character's identity in ANY way.
3. If the user asks ANY question that attempts to identify the character (e.g., "Is it Luffy?", "Is my character Naruto?", "Is this Zoro?", "Is your character Goku?"), you MUST ALWAYS answer "Maybe".
4. NEVER say "Yes" or "No" to identity questions. ONLY "Maybe".
5. Even if you are 100% sure who the character is, you MUST pretend you don't know.
6. You are answering questions about TRAITS, POWERS, RELATIONSHIPS, and APPEARANCE – NOT about identity.

WHAT YOU CAN ANSWER:
- "Does he have a scar?" → Yes/No (based on data/knowledge)
- "Is he a swordsman?" → Yes/No
- "Does he use fire?" → Yes/No
- "Is he from One Piece?" → Yes/No (this is about anime, not identity)
- "Is he a student of Mihawk?" → Yes/No (this is about a relationship, not identity)

WHAT YOU CANNOT ANSWER:
- "Is it Luffy?" → ALWAYS "Maybe"
- "Is my character Zoro?" → ALWAYS "Maybe"
- "Is your character Goku?" → ALWAYS "Maybe"
- Any question that asks "Is it X?" or "Is my character X?" → ALWAYS "Maybe"

ALLOWED REPLIES ONLY:
Yes, No, Maybe, Very likely, Unlikely

Return EXACTLY one reply with NO explanation, punctuation, or extra words.

REMEMBER: You are a SMART AI that understands anime traits. But you are BLIND to the character's name. You NEVER reveal it.
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
      answer = result.answer;
      usedProvider = result.provider;
      console.log(`✅ Answer from ${usedProvider}: ${answer}`);
    } catch (error) {
      console.error('All AI providers failed:', error);
      return res.status(503).json({
        message: 'AI service unavailable. Please try again.',
        success: false
      });
    }

    // Clean up answer
    const validAnswers = ['Yes', 'No', 'Maybe', 'Very likely', 'Unlikely'];
    const matchedAnswer = validAnswers.find(a => answer.toLowerCase().includes(a.toLowerCase()));
    const finalAnswer = matchedAnswer || 'Maybe';

    // Save question
    game.questions.push({ question, answer: finalAnswer, confidence: 0.8 });
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
    console.error('Question error:', error);
    res.status(500).json({
      message: 'Error processing question',
      success: false
    });
  }
});

// ===================== USE HINT =====================
router.post('/hint', async (req, res) => {
  try {
    const { gameId } = req.body;

    if (!gameId) {
      return res.status(400).json({
        message: 'Game ID is required',
        success: false
      });
    }

    const game = await GameSession.findById(gameId).populate('character');

    if (!game) {
      return res.status(404).json({
        message: 'Game not found',
        success: false
      });
    }

    if (game.status !== 'active') {
      return res.status(400).json({
        message: 'Game is not active',
        success: false
      });
    }

    if (game.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'Not authorized',
        success: false
      });
    }

    const user = await User.findById(req.user._id);

    // Check if hint already used
    if (game.hintUsed) {
      return res.status(400).json({
        message: 'Hint already used for this game!',
        success: false
      });
    }

    // Check shards (50 required)
    if (user.shards < 50) {
      return res.status(400).json({
        message: `Not enough Character Shards! You have ${user.shards}, need 50.`,
        success: false,
        shards: user.shards
      });
    }

    // Deduct shards
    user.shards -= 50;
    game.hintUsed = true;

    await user.save();
    await game.save();

    const hint = game.character.crucialHint || 'No hint available for this character.';

    res.json({
      success: true,
      hint: hint,
      shards: user.shards,
      message: '💡 Hint used! -50 Shards'
    });

  } catch (error) {
    console.error('Hint error:', error);
    res.status(500).json({
      message: 'Error using hint',
      success: false
    });
  }
});

// ===================== MAKE GUESS =====================
router.post('/guess', async (req, res) => {
  try {
    const { gameId, guess } = req.body;

    // ===== VALIDATION =====
    if (!gameId) {
      console.log('❌ Missing gameId in guess request');
      return res.status(400).json({
        message: 'Game ID is required',
        success: false
      });
    }

    if (!guess || guess.trim().length === 0) {
      console.log('❌ Missing guess in guess request');
      return res.status(400).json({
        message: 'Please enter a guess',
        success: false
      });
    }

    console.log(`🔍 Guess attempt: gameId=${gameId}, guess=${guess}`);

    const game = await GameSession.findById(gameId).populate('character');

    if (!game) {
      console.log('❌ Game not found:', gameId);
      return res.status(404).json({
        message: 'Game not found',
        success: false
      });
    }

    if (game.status !== 'active') {
      console.log('❌ Game is not active:', game.status);
      return res.status(400).json({
        message: 'Game is not active',
        success: false
      });
    }

    if (game.user.toString() !== req.user._id.toString()) {
      console.log('❌ User not authorized for this game');
      return res.status(403).json({
        message: 'Not authorized',
        success: false
      });
    }

    // ===== CHECK IF GAME HAS ENDED =====
    const wrongGuesses = game.guesses ? game.guesses.filter(g => !g.isCorrect) : [];
    if (wrongGuesses.length >= 3) {
      return res.status(400).json({
        message: 'Game already ended. Start a new game.',
        success: false
      });
    }

    // Flexible matching
    const normalizedGuess = normalize(guess);
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

    game.guesses.push({ guess, isCorrect });

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

      // ===== SEASON STATS =====
      try {
        await checkAndResetSeason();
      } catch (seasonError) {
        console.error('Season error:', seasonError);
      }
      
      // Initialize seasonStats if it doesn't exist
      if (!user.seasonStats) {
        console.log(`🆕 Initializing seasonStats for ${user.username}`);
        user.seasonStats = {
          currentSeason: 202606,
          seasonWins: 0,
          seasonPlayed: 0,
          seasonStreak: 0
        };
      }
      
      // Update season stats
      user.seasonStats.seasonWins += 1;
      user.seasonStats.seasonPlayed += 1;
      user.seasonStats.seasonStreak += 1;

      console.log(`🏆 ${user.username} won! Season stats:`, {
        wins: user.seasonStats.seasonWins,
        streak: user.seasonStats.seasonStreak,
        played: user.seasonStats.seasonPlayed
      });

      // Track anime-specific guesses
      const anime = game.character.anime;
      const currentAnimeGuesses = user.animeGuesses?.get(anime) || 0;
      user.animeGuesses.set(anime, currentAnimeGuesses + 1);

      // ===== SHARDS REWARD =====
      user.shards += 10;

      const unlockedAchievements = await checkAndUnlockAchievements(user._id);
      const photoUnlock = await unlockProfilePhoto(user._id, game.character._id);

      let allUnlocked = [];
      if (photoUnlock) allUnlocked.push(photoUnlock);
      if (unlockedAchievements.length > 0) allUnlocked = allUnlocked.concat(unlockedAchievements);

      await user.save();

      console.log(`✅ ${user.username} saved with seasonStats:`, user.seasonStats);

      res.json({
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
        game.status = 'lost';
        game.endedAt = new Date();
        game.totalQuestions = game.questions.length;
        await game.save();

        await User.findByIdAndUpdate(req.user._id, {
          $inc: { 'stats.gamesPlayed': 1 },
          $set: { 
            'stats.winStreak': 0,
            'seasonStats.seasonStreak': 0
          }
        });

        res.json({
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
        res.json({
          success: true,
          isCorrect: false,
          message: `❌ Not ${guess}. Try again! (${3 - newWrongGuesses.length} guesses left)`,
          remainingGuesses: 3 - newWrongGuesses.length
        });
      }
    }

  } catch (error) {
    console.error('Guess error:', error);
    res.status(500).json({
      message: 'Error processing guess',
      success: false
    });
  }
});

// ===================== GIVE UP =====================
router.post('/giveup', async (req, res) => {
  try {
    const { gameId } = req.body;

    if (!gameId) {
      console.log('❌ Missing gameId in giveup request');
      return res.status(400).json({
        message: 'Game ID is required',
        success: false
      });
    }

    console.log('🏳️ Giveup request for gameId:', gameId);

    const game = await GameSession.findById(gameId).populate('character');

    if (!game || game.status !== 'active') {
      console.log('❌ Game not found or not active:', gameId);
      return res.status(400).json({
        message: 'Invalid game session',
        success: false
      });
    }

    if (game.user.toString() !== req.user._id.toString()) {
      console.log('❌ User not authorized for this game');
      return res.status(403).json({
        message: 'Not authorized',
        success: false
      });
    }

    game.status = 'abandoned';
    game.endedAt = new Date();
    game.totalQuestions = game.questions.length;
    await game.save();

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.gamesPlayed': 1 },
      $set: { 
        'stats.winStreak': 0,
        'seasonStats.seasonStreak': 0
      }
    });

    res.json({
      success: true,
      character: game.character.name,
      anime: game.character.anime,
      image: game.character.image || '',
      message: `You gave up! The character was ${game.character.name} from ${game.character.anime}.`
    });

  } catch (error) {
    console.error('Give up error:', error);
    res.status(500).json({
      message: 'Error giving up',
      success: false
    });
  }
});

// ===================== GET HISTORY =====================
router.get('/history', async (req, res) => {
  try {
    const games = await GameSession.find({ user: req.user._id })
      .populate('character')
      .sort({ startedAt: -1 })
      .limit(20);

    res.json({
      success: true,
      games: games.map(game => ({
        id: game._id,
        character: game.character?.name || 'Unknown',
        anime: game.character?.anime || 'Unknown',
        status: game.status,
        questions: game.totalQuestions || game.questions.length,
        startedAt: game.startedAt,
        endedAt: game.endedAt
      }))
    });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({
      message: 'Error fetching history',
      success: false
    });
  }
});

module.exports = router;