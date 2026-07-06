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

// Store io instance
let io;

const setIO = (ioInstance) => {
  io = ioInstance;
};

// Protected routes (require authentication)
// Use authMiddleware instead of auth
router.post('/create', authMiddleware, createClan);
router.post('/join', authMiddleware, joinClan);
router.post('/leave', authMiddleware, leaveClan);
router.get('/list', authMiddleware, getAllClans);
router.get('/my-clan', authMiddleware, getMyClan);
router.get('/members/:clanId', authMiddleware, getClanMembers);
router.get('/chat/:clanId', authMiddleware, getChatMessages);
router.post('/chat/:clanId', authMiddleware, sendChatMessage);
router.post('/donate', authMiddleware, donateDiamonds);
router.post('/request', authMiddleware, requestDiamonds);
router.post('/transfer-leadership', authMiddleware, transferLeadership);

module.exports = { router, setIO };