// /backend/controllers/blurGameController.js
const Character = require('../models/Character');
const User = require('../models/User');
const BlurGameSession = require('../models/BlurGameSession');

// ============================================================
// HELPER: Normalize string for matching
// ============================================================
function normalize(str) {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================================
// HELPER: Check if guess matches character name
// ============================================================
function isMatchingGuess(guess, characterName) {
  const normalizedGuess = normalize(guess);
  const normalizedName = normalize(characterName);

  // Exact match
  if (normalizedGuess === normalizedName) return true;

  // Check if guess is a substring of the name
  if (normalizedName.includes(normalizedGuess) && normalizedGuess.length >= 3) {
    return true;
  }

  // Check if all words in guess are in the name
  const guessWords = normalizedGuess.split(' ');
  const nameWords = normalizedName.split(' ');
  const allWordsMatch = guessWords.every(word => nameWords.includes(word));
  if (allWordsMatch && guessWords.length > 0) {
    return true;
  }

  return false;
}

// ============================================================
// @desc    Start a new blur game session
// @route   POST /api/blur-game/start
// @access  Private
// ============================================================
exports.startGame = async (req, res) => {
  try {
    const userId = req.user._id;

    // Check if user already has an active game
    const existingGame = await BlurGameSession.findOne({
      userId: userId,
      isCompleted: false
    });

    if (existingGame) {
      // If game is older than 5 minutes, delete it and create new
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (existingGame.createdAt < fiveMinutesAgo) {
        await BlurGameSession.findByIdAndDelete(existingGame._id);
      } else {
        return res.status(400).json({
          success: false,
          message: 'You already have an active game. Please complete it first.',
          gameId: existingGame._id,
          imageUrl: existingGame.imageUrl,
          startedAt: existingGame.createdAt
        });
      }
    }

    // Get a random character
    const characters = await Character.find({ image: { $ne: '' } });
    if (characters.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No characters with images found in database. Please add some characters first.'
      });
    }

    const randomIndex = Math.floor(Math.random() * characters.length);
    const character = characters[randomIndex];

    // Create new game session
    const game = new BlurGameSession({
      userId: userId,
      characterId: character._id,
      characterName: character.name,
      anime: character.anime,
      imageUrl: character.image,
      isCompleted: false,
      guessedAt: null,
      timeTaken: null,
      wonCard: false
    });

    await game.save();

    // Log the game start
    console.log(`🎮 Blur Game started for ${req.user.username}: ${character.name} from ${character.anime}`);

    res.status(200).json({
      success: true,
      gameId: game._id,
      imageUrl: character.image,
      anime: character.anime,
      characterId: character._id,
      startedAt: game.createdAt,
      message: 'Game started! Guess the character before the image becomes clear.'
    });

  } catch (error) {
    console.error('Start blur game error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start game: ' + error.message
    });
  }
};

// ============================================================
// @desc    Submit a guess for the current game
// @route   POST /api/blur-game/guess
// @access  Private
// ============================================================
exports.submitGuess = async (req, res) => {
  try {
    const userId = req.user._id;
    const { gameId, guess, timeTaken } = req.body;

    if (!gameId || !guess) {
      return res.status(400).json({
        success: false,
        message: 'Game ID and guess are required'
      });
    }

    // Find the game
    const game = await BlurGameSession.findOne({
      _id: gameId,
      userId: userId,
      isCompleted: false
    });

    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found or already completed'
      });
    }

    // Check if game is too old (more than 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (game.createdAt < fiveMinutesAgo) {
      game.isCompleted = true;
      await game.save();
      return res.status(400).json({
        success: false,
        message: 'Game has expired. Please start a new game.'
      });
    }

    // Calculate time taken
    const timeTakenSeconds = timeTaken || Math.floor((Date.now() - game.createdAt.getTime()) / 1000);

    // Check if guess is correct
    const isCorrect = isMatchingGuess(guess, game.characterName);

    // Determine if user wins the card (only if guessed within 30 seconds)
    const winsCard = isCorrect && timeTakenSeconds <= 30;

    // Update game
    game.guessedAt = new Date();
    game.timeTaken = timeTakenSeconds;
    game.isCompleted = true;
    game.wonCard = winsCard;
    await game.save();

    // Get user
    const user = await User.findById(userId);

    // Update user stats
    if (!user.blurGameStats) {
      user.blurGameStats = {
        gamesPlayed: 0,
        gamesWon: 0,
        bestTime: null,
        totalCardsWon: 0
      };
    }

    user.blurGameStats.gamesPlayed += 1;

    if (isCorrect) {
      user.blurGameStats.gamesWon += 1;

      // Update best time
      if (!user.blurGameStats.bestTime || timeTakenSeconds < user.blurGameStats.bestTime) {
        user.blurGameStats.bestTime = timeTakenSeconds;
      }

      // If won card, add to user's collection
      if (winsCard) {
        const character = await Character.findById(game.characterId);
        if (character) {
          const cardAdded = user.addCard(character);
          if (cardAdded) {
            user.blurGameStats.totalCardsWon += 1;
            console.log(`🃏 Card added to ${user.username}'s collection: ${character.name}`);
          } else {
            console.log(`ℹ️ Card already in collection: ${character.name}`);
          }
        }
      }
    }

    await user.save();

    // Prepare response message
    let message = '';
    let rewardMessage = '';

    if (isCorrect) {
      if (winsCard) {
        message = `🎉 Correct! You guessed it in ${timeTakenSeconds}s!`;
        rewardMessage = `🎴 You won the ${game.characterName} card!`;
      } else {
        message = `✅ Correct! But it took you ${timeTakenSeconds}s (over 30s).`;
        rewardMessage = `❌ No card won. Try to guess within 30 seconds next time!`;
      }
    } else {
      message = `❌ Wrong guess! The character was ${game.characterName}.`;
      rewardMessage = `💡 Better luck next time!`;
    }

    res.status(200).json({
      success: true,
      isCorrect: isCorrect,
      winsCard: winsCard,
      characterName: game.characterName,
      anime: game.anime,
      imageUrl: game.imageUrl,
      timeTaken: timeTakenSeconds,
      message: message,
      rewardMessage: rewardMessage,
      stats: {
        gamesPlayed: user.blurGameStats.gamesPlayed,
        gamesWon: user.blurGameStats.gamesWon,
        bestTime: user.blurGameStats.bestTime,
        totalCardsWon: user.blurGameStats.totalCardsWon
      }
    });

  } catch (error) {
    console.error('Submit blur game guess error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit guess: ' + error.message
    });
  }
};

// ============================================================
// @desc    Get user's game history
// @route   GET /api/blur-game/history
// @access  Private
// ============================================================
exports.getGameHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 20, page = 1 } = req.query;

    const skip = (page - 1) * limit;

    const games = await BlurGameSession.find({ userId: userId })
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .select('characterName anime imageUrl isCorrect timeTaken wonCard createdAt');

    const total = await BlurGameSession.countDocuments({ userId: userId });

    res.status(200).json({
      success: true,
      data: {
        games,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get blur game history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get game history: ' + error.message
    });
  }
};

// ============================================================
// @desc    Get daily challenge character
// @route   GET /api/blur-game/daily
// @access  Private
// ============================================================
exports.getDailyChallenge = async (req, res) => {
  try {
    // Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if user already completed today's challenge
    const existingGame = await BlurGameSession.findOne({
      userId: req.user._id,
      createdAt: { $gte: today },
      isCompleted: true
    });

    if (existingGame) {
      return res.status(200).json({
        success: true,
        isCompleted: true,
        characterName: existingGame.characterName,
        timeTaken: existingGame.timeTaken,
        wonCard: existingGame.wonCard,
        message: 'You already completed today\'s challenge!'
      });
    }

    // Get a random character for today (same for all users)
    // Use date-based seed for consistency
    const dateString = today.toISOString().split('T')[0];
    const seed = dateString.split('-').join('');
    const characters = await Character.find({ image: { $ne: '' } });

    if (characters.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No characters found'
      });
    }

    const randomIndex = parseInt(seed.slice(-2)) % characters.length;
    const character = characters[randomIndex];

    res.status(200).json({
      success: true,
      isCompleted: false,
      characterId: character._id,
      characterName: character.name,
      anime: character.anime,
      imageUrl: character.image,
      date: dateString,
      message: 'Today\'s daily challenge! Guess the character within 30 seconds to win the card!'
    });

  } catch (error) {
    console.error('Get daily challenge error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get daily challenge: ' + error.message
    });
  }
};

// ============================================================
// @desc    Get user's blur game stats
// @route   GET /api/blur-game/stats
// @access  Private
// ============================================================
exports.getGameStats = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const stats = user.blurGameStats || {
      gamesPlayed: 0,
      gamesWon: 0,
      bestTime: null,
      totalCardsWon: 0
    };

    // Get win rate percentage
    const winRate = stats.gamesPlayed > 0
      ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
      : 0;

    // Get recent games (last 5)
    const recentGames = await BlurGameSession.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('characterName timeTaken wonCard createdAt');

    res.status(200).json({
      success: true,
      data: {
        gamesPlayed: stats.gamesPlayed,
        gamesWon: stats.gamesWon,
        winRate: winRate,
        bestTime: stats.bestTime,
        totalCardsWon: stats.totalCardsWon,
        recentGames: recentGames
      }
    });

  } catch (error) {
    console.error('Get blur game stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get game stats: ' + error.message
    });
  }
};