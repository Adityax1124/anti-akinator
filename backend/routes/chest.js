const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const {
  getUnopenedChests,
  getUnopenedCount,
  getChestDetails,
  openChest,
  bulkOpenChests,
  getChestHistory,
  getChestStats,
  getUpcomingChests
} = require('../controllers/chestController');

// ============================================================
// ✅ ALL ROUTES REQUIRE AUTHENTICATION
// ============================================================
router.use(authMiddleware);

// ============================================================
// ✅ CHEST ROUTES
// ============================================================

/**
 * @route   GET /api/chests
 * @desc    Get all unopened chests for user
 * @access  Private
 */
router.get('/', getUnopenedChests);

/**
 * @route   GET /api/chests/count
 * @desc    Get unopened chest count (for notification badge)
 * @access  Private
 */
router.get('/count', getUnopenedCount);

/**
 * @route   GET /api/chests/history
 * @desc    Get opened chest history
 * @access  Private
 * @query   { limit: number }
 */
router.get('/history', getChestHistory);

/**
 * @route   GET /api/chests/stats
 * @desc    Get chest statistics
 * @access  Private
 */
router.get('/stats', getChestStats);

/**
 * @route   GET /api/chests/upcoming
 * @desc    Get chests expiring soon
 * @access  Private
 */
router.get('/upcoming', getUpcomingChests);

/**
 * @route   GET /api/chests/:chestId
 * @desc    Get chest details
 * @access  Private
 */
router.get('/:chestId', getChestDetails);

/**
 * @route   POST /api/chests/:chestId/open
 * @desc    Open a chest
 * @access  Private
 */
router.post('/:chestId/open', openChest);

/**
 * @route   POST /api/chests/bulk-open
 * @desc    Open multiple chests (max 10)
 * @access  Private
 * @body    { chestIds: string[] }
 */
router.post('/bulk-open', bulkOpenChests);

module.exports = router;