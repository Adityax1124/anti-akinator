const express = require('express');
const router = express.Router();

// ✅ CORRECT: Import authMiddleware as auth
const { authMiddleware } = require('../middleware/auth');

// Import controller functions
const {
  createClan,
  joinClan,
  leaveClan,
  getAllClans,
  getMyClan,
  getClanMembers,
  getChatMessages,
  sendChatMessage,
  donateDiamonds,
  requestDiamonds,
  transferLeadership
} = require('../controllers/clanController');

// ✅ NEW: Import war card controller functions
const {
  selectWarCard,
  getWarCard,
  getClanWarCards
} = require('../controllers/clanWarController');

// Store io instance
let io;

const setIO = (ioInstance) => {
  io = ioInstance;
};

// ============================================================
// ✅ PROTECTED ROUTES (require authentication)
// ============================================================

// ===== CLAN MANAGEMENT =====
router.post('/create', authMiddleware, createClan);
router.post('/join', authMiddleware, joinClan);
router.post('/leave', authMiddleware, leaveClan);
router.get('/list', authMiddleware, getAllClans);
router.get('/my-clan', authMiddleware, getMyClan);
router.get('/members/:clanId', authMiddleware, getClanMembers);

// ===== CLAN CHAT =====
router.get('/chat/:clanId', authMiddleware, getChatMessages);
router.post('/chat/:clanId', authMiddleware, sendChatMessage);

// ===== CLAN DONATIONS =====
router.post('/donate', authMiddleware, donateDiamonds);
router.post('/request', authMiddleware, requestDiamonds);

// ===== CLAN LEADERSHIP =====
router.post('/transfer-leadership', authMiddleware, transferLeadership);

// ============================================================
// ✅ WAR CARD ROUTES (Added to clan routes)
// ============================================================

/**
 * @route   POST /api/clan/select-war-card
 * @desc    Select war card for clan war
 * @access  Private
 * @body    { cardId: string }
 */
router.post('/select-war-card', authMiddleware, selectWarCard);

/**
 * @route   GET /api/clan/war-card
 * @desc    Get your selected war card
 * @access  Private
 */
router.get('/war-card', authMiddleware, getWarCard);

/**
 * @route   GET /api/clan/:clanId/war-cards
 * @desc    Get all clan members' war cards
 * @access  Private
 */
router.get('/:clanId/war-cards', authMiddleware, getClanWarCards);

// ============================================================
// ✅ EXPORT: Router as main export with setIO attached
// ============================================================
module.exports = router;
module.exports.setIO = setIO;