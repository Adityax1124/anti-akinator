const express = require('express');
const Groq = require('groq-sdk');
const Character = require('../models/Character');
const GameSession = require('../models/GameSession');
const User = require('../models/User');
const ProfilePhoto = require('../models/ProfilePhoto');
const { checkAndUnlockAchievements, unlockProfilePhoto } = require('../utils/achievementUtils');
const router = express.Router();

// Initialize Groq
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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

    // ===== SHORTENED CHARACTER DATA =====
    const context = `
SECRET CHARACTER:
Anime: ${character.anime}
Description: ${character.description}
Gender: ${character.traits.gender}
Species: ${character.traits.species}
Age: ${character.traits.age || 'Unknown'}
Occupation: ${character.traits.occupation || 'Unknown'}
Powers: ${character.traits.powers.join(', ') || 'None'}
Personality: ${character.traits.personality.join(', ') || 'Unknown'}
Affiliations: ${character.traits.affiliations.join(', ') || 'None'}
Key Events: ${character.traits.keyEvents.join(', ') || 'None'}
Main Character: ${character.attributes.isMainCharacter}
Villain: ${character.attributes.isVillain}
Female: ${character.attributes.isFemale}
Has Powers: ${character.attributes.hasPowers}

USER'S QUESTION: "${question}"

ANSWER based ONLY on the data above.`;

    // ===== SHORT, POWERFUL SYSTEM PROMPT =====
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a strict YES/NO question-answering engine.

CRITICAL RULES:
1. You DO NOT know the character's name. Never reveal it.
2. If the user asks ANY question about the character's identity (e.g., "Is it Luffy?", "Is my character Naruto?", "Is this Zoro?"), you MUST ALWAYS answer "Maybe".
3. NEVER answer Yes, No, Very likely, or Unlikely to identity questions.
4. For all other questions, answer based ONLY on the provided character data.
5. Valid answers: Yes, No, Maybe, Very likely, Unlikely.
6. If unsure, answer "Maybe".
7. Be concise. Only return one word.`
        },
        {
          role: "user",
          content: context
        }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.1,
      max_tokens: 10
    });

    let answer = completion.choices[0]?.message?.content || "Maybe";
    const validAnswers = ['Yes', 'No', 'Maybe', 'Very likely', 'Unlikely'];
    const matchedAnswer = validAnswers.find(a => answer.toLowerCase().includes(a.toLowerCase()));
    answer = matchedAnswer || 'Maybe';

    // Save question
    game.questions.push({ question, answer, confidence: 0.8 });
    game.totalQuestions += 1;
    await game.save();

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.totalQuestions': 1 }
    });

    res.json({
      success: true,
      answer: answer,
      questionCount: game.totalQuestions
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