// /backend/routes/blurGame.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');
const {
  startGame,
  submitGuess,
  getGameHistory,
  getDailyChallenge,
  getGameStats,
  abandonGame,
  getTestCharacter,
  getBlurImage
} = require('../controllers/blurGameController');

// ============================================================
// VALIDATION RULES
// ============================================================

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
// ROUTES (ALL REQUIRE AUTHENTICATION)
// ============================================================

// @route   POST /api/blur-game/start
// @desc    Start a new blur game session
// @access  Private
router.post('/start', authMiddleware, startGame);

// @route   POST /api/blur-game/guess
// @desc    Submit a guess for the current game
// @access  Private
router.post('/guess', authMiddleware, validateGuess, submitGuess);

// @route   POST /api/blur-game/abandon
// @desc    Abandon game (user left the page)
// @access  Private
router.post('/abandon', authMiddleware, abandonGame);

// @route   GET /api/blur-game/image/:gameId
// @desc    Get proxied image for blur game (hides character name)
// @access  Private
router.get('/image/:gameId', authMiddleware, getBlurImage);

// @route   GET /api/blur-game/history
// @desc    Get user's game history
// @access  Private
router.get('/history', authMiddleware, getGameHistory);

// @route   GET /api/blur-game/daily
// @desc    Get today's daily challenge character
// @access  Private
router.get('/daily', authMiddleware, getDailyChallenge);

// @route   GET /api/blur-game/stats
// @desc    Get user's blur game stats
// @access  Private
router.get('/stats', authMiddleware, getGameStats);

// @route   GET /api/blur-game/test-character
// @desc    Get character for testing (admin only)
// @access  Private (Admin)
router.get('/test-character', authMiddleware, getTestCharacter);

module.exports = router;