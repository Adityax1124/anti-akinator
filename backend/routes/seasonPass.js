const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const {
  getActiveSeason,
  getUserProgress,
  claimTierReward,
  getSeasonLeaderboard,
  getSeasonHistory
} = require('../controllers/seasonPassController');

// ============================================================
// ✅ ALL ROUTES REQUIRE AUTHENTICATION
// ============================================================
router.use(authMiddleware);

// ============================================================
// ✅ SEASON PASS ROUTES
// ============================================================

/**
 * @route   GET /api/season-pass/active
 * @desc    Get currently active season pass
 * @access  Private
 */
router.get('/active', getActiveSeason);

/**
 * @route   GET /api/season-pass/progress
 * @desc    Get user's season pass progress
 * @access  Private
 */
router.get('/progress', getUserProgress);

/**
 * @route   POST /api/season-pass/claim/:tier
 * @desc    Claim reward for a specific tier
 * @access  Private
 * @params  tier: number
 * @body    { rewardIndex: number }
 */
router.post('/claim/:tier', claimTierReward);

/**
 * @route   GET /api/season-pass/leaderboard
 * @desc    Get season pass leaderboard
 * @access  Private
 * @query   { limit: number }
 */
router.get('/leaderboard', getSeasonLeaderboard);

/**
 * @route   GET /api/season-pass/history
 * @desc    Get user's season pass history
 * @access  Private
 */
router.get('/history', getSeasonHistory);

module.exports = router;