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
// HELPER: Check if guess matches character name (PARTIAL + EXACT)
// ============================================================
function isMatchingGuess(guess, characterName) {
  const normalizedGuess = normalize(guess);
  const normalizedName = normalize(characterName);

  // ✅ EXACT MATCH
  if (normalizedGuess === normalizedName) return true;

  // ✅ PARTIAL MATCH - Check if guess is a significant part of the name
  if (normalizedName.includes(normalizedGuess) && normalizedGuess.length >= 3) {
    return true;
  }

  // ✅ PARTIAL MATCH - Check if any significant word matches
  const guessWords = normalizedGuess.split(' ');
  const nameWords = normalizedName.split(' ');
  
  const anyWordMatch = nameWords.some(word => 
    normalizedGuess.includes(word) && word.length >= 3
  );
  if (anyWordMatch) return true;

  const allWordsMatch = guessWords.every(word => nameWords.includes(word));
  if (allWordsMatch && guessWords.length > 0) return true;

  return false;
}

// ============================================================
// @desc    Get proxied image for blur game (Hides character name)
// @route   GET /api/blur-game/image/:gameId
// @access  Private
// ============================================================
exports.getBlurImage = async (req, res) => {
  try {
    const game = await BlurGameSession.findOne({
      _id: req.params.gameId,
      userId: req.user._id
    });

    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    // Check if game is active (not completed)
    if (game.isCompleted) {
      return res.status(403).json({
        success: false,
        message: 'Game already completed'
      });
    }

    // Redirect to the actual image URL - this hides the character name!
    res.redirect(game.imageUrl);
  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load image'
    });
  }
};

// ============================================================
// @desc    Start a new blur game session
// @route   POST /api/blur-game/start
// @access  Private
// ============================================================
exports.startGame = async (req, res) => {
  try {
    const userId = req.user._id;

    console.log(`🎯 Starting game for user: ${req.user.username}`);

    // Check if user already has an active game
    const existingGame = await BlurGameSession.findOne({
      userId: userId,
      isCompleted: false
    });

    if (existingGame) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (existingGame.createdAt < fiveMinutesAgo) {
        await BlurGameSession.findByIdAndDelete(existingGame._id);
        console.log('🗑️ Deleted expired game');
      } else {
        console.log(`🔄 Returning existing game: ${existingGame.characterName}`);
        return res.status(200).json({
          success: true,
          gameId: existingGame._id,
          imageUrl: `${process.env.BASE_URL || 'http://localhost:5000'}/api/blur-game/image/${existingGame._id}`,
          anime: existingGame.anime,
          characterId: existingGame.characterId,
          characterName: existingGame.characterName,
          startedAt: existingGame.createdAt,
          isExisting: true,
          maxGuesses: existingGame.maxGuesses || 3,
          wrongGuesses: existingGame.wrongGuesses || 0,
          guessedNames: existingGame.guessedNames || [],
          message: 'Resuming existing game...'
        });
      }
    }

    // Get a random character with an image
    const characters = await Character.find({ 
      image: { $ne: '', $exists: true } 
    });
    
    if (characters.length === 0) {
      console.error('❌ No characters with images found');
      return res.status(404).json({
        success: false,
        message: 'No characters with images found in database. Please add some characters first.'
      });
    }

    const randomIndex = Math.floor(Math.random() * characters.length);
    const character = characters[randomIndex];

    // Create new game session with 3 guesses allowed
    const game = new BlurGameSession({
      userId: userId,
      characterId: character._id,
      characterName: character.name,
      anime: character.anime,
      imageUrl: character.image,
      isCompleted: false,
      guessedAt: null,
      timeTaken: null,
      wonCard: false,
      isCorrect: false,
      wrongGuesses: 0,
      maxGuesses: 3,
      guessedNames: []
    });

    await game.save();

    console.log(`🎮 Blur Game started for ${req.user.username}: ${character.name} from ${character.anime}`);

    res.status(200).json({
      success: true,
      gameId: game._id,
      imageUrl: `${process.env.BASE_URL || 'http://localhost:5000'}/api/blur-game/image/${game._id}`,
      anime: character.anime,
      characterId: character._id,
      characterName: character.name,
      startedAt: new Date().toISOString(),
      isExisting: false,
      maxGuesses: 3,
      wrongGuesses: 0,
      guessedNames: [],
      message: 'Game started! You have 3 guesses. Guess within 30 seconds to win the card!'
    });

  } catch (error) {
    console.error('❌ Start blur game error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start game: ' + error.message
    });
  }
};

// ============================================================
// @desc    Submit a guess for the current game (3 GUESSES MAX)
// @route   POST /api/blur-game/guess
// @access  Private
// ============================================================
exports.submitGuess = async (req, res) => {
  try {
    const userId = req.user._id;
    const { gameId, guess, timeTaken } = req.body;

    console.log(`📝 Guess submitted for user ${req.user.username}: "${guess}"`);

    if (!gameId || !guess) {
      return res.status(400).json({
        success: false,
        message: 'Game ID and guess are required'
      });
    }

    // Find the game
    const game = await BlurGameSession.findOne({
      _id: gameId,
      userId: userId
    });

    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    // Check if game is already completed
    if (game.isCompleted) {
      return res.status(400).json({
        success: false,
        message: 'This game has already ended.',
        gameEnded: true
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

    // ✅ Check if already guessed this name
    const guessedNames = game.guessedNames || [];
    const normalizedGuess = normalize(guess);
    if (guessedNames.some(name => normalize(name) === normalizedGuess)) {
      const remaining = game.maxGuesses - game.wrongGuesses;
      return res.status(200).json({
        success: false,
        isCorrect: false,
        canRetry: true,
        gameOver: false,
        wrongGuesses: game.wrongGuesses,
        maxGuesses: game.maxGuesses,
        remainingGuesses: remaining,
        message: `⚠️ You already guessed "${guess}". Try a different name! (${remaining} guesses left)`,
        rewardMessage: 'Keep trying!'
      });
    }

    // Calculate time taken
    const timeTakenSeconds = timeTaken || Math.floor((Date.now() - game.createdAt.getTime()) / 1000);
    const finalTimeTaken = Math.min(timeTakenSeconds, 60);

    // ✅ Check if guess is correct
    const isCorrect = isMatchingGuess(guess, game.characterName);

    // ✅ IF WRONG GUESS - DO NOT END THE GAME YET!
    if (!isCorrect) {
      game.wrongGuesses = (game.wrongGuesses || 0) + 1;
      game.guessedNames.push(guess);
      
      // ✅ Check if max guesses reached (3)
      if (game.wrongGuesses >= game.maxGuesses) {
        game.isCompleted = true;
        game.guessedAt = new Date();
        game.timeTaken = finalTimeTaken;
        game.isCorrect = false;
        game.wonCard = false;
        await game.save();

        const user = await User.findById(userId);
        if (!user.blurGameStats) {
          user.blurGameStats = {
            gamesPlayed: 0,
            gamesWon: 0,
            bestTime: null,
            totalCardsWon: 0
          };
        }
        user.blurGameStats.gamesPlayed += 1;
        await user.save();

        const winRate = user.blurGameStats.gamesPlayed > 0
          ? Math.round((user.blurGameStats.gamesWon / user.blurGameStats.gamesPlayed) * 100)
          : 0;

        return res.status(200).json({
          success: true,
          isCorrect: false,
          gameOver: true,
          wonCard: false,
          characterName: game.characterName,
          anime: game.anime,
          imageUrl: game.imageUrl,
          timeTaken: finalTimeTaken,
          wrongGuesses: game.wrongGuesses,
          maxGuesses: game.maxGuesses,
          guessedNames: game.guessedNames,
          message: `❌ Game Over! You used all ${game.maxGuesses} guesses.`,
          rewardMessage: `The character was ${game.characterName}. Better luck next time!`,
          stats: {
            gamesPlayed: user.blurGameStats.gamesPlayed,
            gamesWon: user.blurGameStats.gamesWon,
            winRate: winRate,
            bestTime: user.blurGameStats.bestTime,
            totalCardsWon: user.blurGameStats.totalCardsWon
          }
        });
      }

      await game.save();

      const remaining = game.maxGuesses - game.wrongGuesses;

      return res.status(200).json({
        success: false,
        isCorrect: false,
        canRetry: true,
        gameOver: false,
        wrongGuesses: game.wrongGuesses,
        maxGuesses: game.maxGuesses,
        remainingGuesses: remaining,
        guessedNames: game.guessedNames,
        message: `❌ Wrong guess! "${guess}" is not correct. ${remaining} guess${remaining > 1 ? 'es' : ''} remaining.`,
        rewardMessage: 'Keep trying!'
      });
    }

    // ✅ CORRECT GUESS!
    const winsCard = finalTimeTaken <= 30;

    game.guessedAt = new Date();
    game.timeTaken = finalTimeTaken;
    game.isCompleted = true;
    game.isCorrect = true;
    game.wonCard = winsCard;
    game.guessedNames.push(guess);
    await game.save();

    const user = await User.findById(userId);

    if (!user.blurGameStats) {
      user.blurGameStats = {
        gamesPlayed: 0,
        gamesWon: 0,
        bestTime: null,
        totalCardsWon: 0
      };
    }

    user.blurGameStats.gamesPlayed += 1;
    user.blurGameStats.gamesWon += 1;

    if (!user.blurGameStats.bestTime || finalTimeTaken < user.blurGameStats.bestTime) {
      user.blurGameStats.bestTime = finalTimeTaken;
    }

    if (winsCard) {
      const character = await Character.findById(game.characterId);
      if (character) {
        const cardAdded = user.addCard(character);
        if (cardAdded) {
          user.blurGameStats.totalCardsWon += 1;
          console.log(`🃏 Card added to ${user.username}'s collection: ${character.name}`);
        }
      }
    }

    await user.save();

    let message = '';
    let rewardMessage = '';

    if (winsCard) {
      message = `🎉 Correct! You guessed it in ${finalTimeTaken}s!`;
      rewardMessage = `🎴 You won the ${game.characterName} card!`;
    } else {
      message = `✅ Correct! But it took you ${finalTimeTaken}s (over 30s).`;
      rewardMessage = `❌ No card won. Try to guess within 30 seconds next time!`;
    }

    const winRate = user.blurGameStats.gamesPlayed > 0
      ? Math.round((user.blurGameStats.gamesWon / user.blurGameStats.gamesPlayed) * 100)
      : 0;

    res.status(200).json({
      success: true,
      isCorrect: true,
      gameOver: true,
      winsCard: winsCard,
      characterName: game.characterName,
      anime: game.anime,
      imageUrl: game.imageUrl,
      timeTaken: finalTimeTaken,
      wrongGuesses: game.wrongGuesses,
      maxGuesses: game.maxGuesses,
      guessedNames: game.guessedNames,
      message: message,
      rewardMessage: rewardMessage,
      stats: {
        gamesPlayed: user.blurGameStats.gamesPlayed,
        gamesWon: user.blurGameStats.gamesWon,
        winRate: winRate,
        bestTime: user.blurGameStats.bestTime,
        totalCardsWon: user.blurGameStats.totalCardsWon
      }
    });

  } catch (error) {
    console.error('❌ Submit blur game guess error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit guess: ' + error.message
    });
  }
};

// ============================================================
// @desc    Abandon game (user left the page)
// @route   POST /api/blur-game/abandon
// @access  Private
// ============================================================
exports.abandonGame = async (req, res) => {
  try {
    const userId = req.user._id;
    const { gameId } = req.body;

    console.log(`🚪 Abandoning game for user ${req.user.username}`);

    if (!gameId) {
      return res.status(400).json({
        success: false,
        message: 'Game ID is required'
      });
    }

    const game = await BlurGameSession.findOne({
      _id: gameId,
      userId: userId,
      isCompleted: false
    });

    if (!game) {
      return res.status(200).json({
        success: true,
        message: 'Game already completed or not found'
      });
    }

    game.isCompleted = true;
    game.guessedAt = new Date();
    game.timeTaken = 0;
    game.wonCard = false;
    await game.save();

    const user = await User.findById(userId);
    if (!user.blurGameStats) {
      user.blurGameStats = {
        gamesPlayed: 0,
        gamesWon: 0,
        bestTime: null,
        totalCardsWon: 0
      };
    }
    user.blurGameStats.gamesPlayed += 1;
    await user.save();

    console.log(`🚪 Game abandoned by ${user.username}`);

    res.status(200).json({
      success: true,
      message: 'Game abandoned successfully'
    });

  } catch (error) {
    console.error('❌ Abandon game error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to abandon game: ' + error.message
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
      .select('characterName anime imageUrl isCorrect timeTaken wonCard createdAt wrongGuesses maxGuesses guessedNames');

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
    console.error('❌ Get blur game history error:', error);
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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

    const dateString = today.toISOString().split('T')[0];
    const seed = dateString.split('-').join('');
    const characters = await Character.find({ image: { $ne: '', $exists: true } });

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
    console.error('❌ Get daily challenge error:', error);
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

    const winRate = stats.gamesPlayed > 0
      ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
      : 0;

    const recentGames = await BlurGameSession.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('characterName timeTaken wonCard createdAt wrongGuesses maxGuesses');

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
    console.error('❌ Get blur game stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get game stats: ' + error.message
    });
  }
};

// ============================================================
// @desc    Get character for testing (admin only)
// @route   GET /api/blur-game/test-character
// @access  Private (Admin)
// ============================================================
exports.getTestCharacter = async (req, res) => {
  try {
    const characters = await Character.find({ image: { $ne: '', $exists: true } });
    
    if (characters.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No characters with images found'
      });
    }

    const randomIndex = Math.floor(Math.random() * characters.length);
    const character = characters[randomIndex];

    res.status(200).json({
      success: true,
      character: {
        id: character._id,
        name: character.name,
        anime: character.anime,
        image: character.image
      },
      totalCharacters: characters.length
    });

  } catch (error) {
    console.error('❌ Get test character error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get test character: ' + error.message
    });
  }
};