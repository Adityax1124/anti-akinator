const express = require('express');
const Character = require('../models/Character');
const GameSession = require('../models/GameSession');
const User = require('../models/User');
const ProfilePhoto = require('../models/ProfilePhoto');
const { checkAndUnlockAchievements, unlockProfilePhoto } = require('../utils/achievementUtils');
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
Main: ${character.attributes.isMainCharacter ? 'Yes' : 'No'}
Villain: ${character.attributes.isVillain ? 'Yes' : 'No'}
Female: ${character.attributes.isFemale ? 'Yes' : 'No'}

USER: "${question}"`;

    // ===== SHORT SYSTEM PROMPT =====
    const systemPrompt = `
You are the answer engine for an Anti-Akinator game.
You are NOT the player and must NEVER identify or guess the secret character. Use ONLY the provided character data. Never use reasoning, inference, deduction, outside knowledge, anime knowledge, or combinations of facts. If a fact is not explicitly provided, treat it as unknown.
If the user asks whether the character is any specific person (name, nickname, alias, title), ALWAYS reply:
Maybe
Never confirm, deny, eliminate, or hint at the character's identity, even if the answer seems obvious from the data.
Answer only from explicit facts in the provided data. If the answer is not explicitly stated, reply:
Maybe
Allowed replies only:
Yes
No
Maybe
Very likely
Unlikely
Return exactly one allowed reply with no explanation, punctuation, or extra words.
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

// ===================== MAKE GUESS =====================
router.post('/guess', async (req, res) => {
  try {
    const { gameId, guess } = req.body;

    if (!guess || guess.trim().length === 0) {
      return res.status(400).json({
        message: 'Please enter a guess',
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
      user.stats.gamesPlayed += 1;
      user.stats.gamesWon += 1;
      user.stats.winStreak += 1;
      user.totalGuesses += 1;

      const anime = game.character.anime;
      const currentAnimeGuesses = user.animeGuesses?.get(anime) || 0;
      user.animeGuesses.set(anime, currentAnimeGuesses + 1);

      const unlockedAchievements = await checkAndUnlockAchievements(user._id);
      const photoUnlock = await unlockProfilePhoto(user._id, game.character._id);

      let allUnlocked = [];
      if (photoUnlock) allUnlocked.push(photoUnlock);
      if (unlockedAchievements.length > 0) allUnlocked = allUnlocked.concat(unlockedAchievements);

      await user.save();

      res.json({
        success: true,
        isCorrect: true,
        character: game.character.name,
        anime: game.character.anime,
        image: game.character.image || '',
        message: `🎉 Correct! It was ${game.character.name}!`,
        questionsUsed: game.totalQuestions,
        unlockedItems: allUnlocked
      });

    } else {
      const wrongGuesses = game.guesses.filter(g => !g.isCorrect);
      
      if (wrongGuesses.length >= 3) {
        game.status = 'lost';
        game.endedAt = new Date();
        game.totalQuestions = game.questions.length;
        await game.save();

        await User.findByIdAndUpdate(req.user._id, {
          $inc: { 'stats.gamesPlayed': 1 },
          $set: { 'stats.winStreak': 0 }
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
          message: `❌ Not ${guess}. Try again! (${3 - wrongGuesses.length} guesses left)`,
          remainingGuesses: 3 - wrongGuesses.length
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

    const game = await GameSession.findById(gameId).populate('character');

    if (!game || game.status !== 'active') {
      return res.status(400).json({
        message: 'Invalid game session',
        success: false
      });
    }

    if (game.user.toString() !== req.user._id.toString()) {
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
      $set: { 'stats.winStreak': 0 }
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