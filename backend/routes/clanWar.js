const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const {
  selectWarCard,
  getWarCard,
  getClanWarCards,
  startWar,
  getWarStatus,
  getWarDetails,
  cancelWarSearch,
  attack,
  getWarHistory,
  getWarLeaderboard,
  getSearchStatus,
  getBattleStatus
} = require('../controllers/clanWarController');

// ============================================================
// ✅ ALL ROUTES REQUIRE AUTHENTICATION
// ============================================================
router.use(authMiddleware);

// ============================================================
// ✅ WAR CARD ROUTES
// ============================================================

/**
 * @route   POST /api/clan-war/select-war-card
 * @desc    Select war card for clan war
 * @access  Private
 * @body    { cardId: string }
 */
router.post('/select-war-card', selectWarCard);

/**
 * @route   GET /api/clan-war/war-card
 * @desc    Get your selected war card
 * @access  Private
 */
router.get('/war-card', getWarCard);

/**
 * @route   GET /api/clan-war/:clanId/war-cards
 * @desc    Get all clan members' war cards
 * @access  Private
 */
router.get('/:clanId/war-cards', getClanWarCards);

// ============================================================
// ✅ WAR MANAGEMENT ROUTES
// ============================================================

/**
 * @route   POST /api/clan-war/start
 * @desc    Start a war (Leader only)
 * @access  Private
 * @body    { memberIds: string[] } - Array of 10 user IDs
 */
router.post('/start', startWar);

/**
 * @route   GET /api/clan-war/status
 * @desc    Get current war status for user's clan
 * @access  Private
 */
router.get('/status', getWarStatus);

/**
 * @route   GET /api/clan-war/search-status
 * @desc    Check if clan is searching for war
 * @access  Private
 */
router.get('/search-status', getSearchStatus);

/**
 * @route   POST /api/clan-war/cancel-search
 * @desc    Cancel war search (Leader only)
 * @access  Private
 */
router.post('/cancel-search', cancelWarSearch);

/**
 * @route   GET /api/clan-war/details/:warId
 * @desc    Get full war details
 * @access  Private
 */
router.get('/details/:warId', getWarDetails);

/**
 * @route   GET /api/clan-war/battle-status/:warId
 * @desc    Get lightweight battle status (for polling)
 * @access  Private
 */
router.get('/battle-status/:warId', getBattleStatus);

// ============================================================
// ✅ BATTLE ROUTES
// ============================================================

/**
 * @route   POST /api/clan-war/attack
 * @desc    Attack opponent in war
 * @access  Private
 * @body    { warId: string, targetUserId: string }
 */
router.post('/attack', attack);

// ============================================================
// ✅ HISTORY & LEADERBOARD ROUTES
// ============================================================

/**
 * @route   GET /api/clan-war/history/:clanId
 * @desc    Get war history for a clan
 * @access  Private
 * @query   { limit: number }
 */
router.get('/history/:clanId', getWarHistory);

/**
 * @route   GET /api/clan-war/leaderboard
 * @desc    Get top 20 clans leaderboard
 * @access  Private
 * @query   { limit: number }
 */
router.get('/leaderboard', getWarLeaderboard);

module.exports = router;