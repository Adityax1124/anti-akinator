// /backend/routes/transactions.js
const express = require('express');
const router = express.Router();

// Import middleware
const auth = require('../middleware/auth');

// Import controller
const transactionController = require('../controllers/transactionController');

// Destructure middleware
const { authMiddleware, adminMiddleware } = auth;

// ============================================================
// USER ROUTES (Authenticated)
// ============================================================

// @route   POST /api/transactions/create
// @desc    Create a new transaction (user submits payment)
// @access  Private (User)
router.post('/create', authMiddleware, transactionController.createTransaction);

// @route   POST /api/transactions/check-utr
// @desc    Check if UTR number is available
// @access  Private (User)
router.post('/check-utr', authMiddleware, transactionController.checkUtrAvailability);

// @route   GET /api/transactions/my-transactions
// @desc    Get user's own transactions
// @access  Private (User)
router.get('/my-transactions', authMiddleware, transactionController.getMyTransactions);

// ============================================================
// ADMIN ROUTES
// ============================================================

// @route   GET /api/transactions/all
// @desc    Get all transactions with filters (Admin only)
// @access  Private (Admin)
router.get('/all', authMiddleware, adminMiddleware, transactionController.getAllTransactions);

// @route   GET /api/transactions/stats
// @desc    Get transaction statistics (Admin only)
// @access  Private (Admin)
router.get('/stats', authMiddleware, adminMiddleware, transactionController.getTransactionStats);

// @route   GET /api/transactions/:id
// @desc    Get single transaction by ID (Admin only)
// @access  Private (Admin)
router.get('/:id', authMiddleware, adminMiddleware, transactionController.getTransactionById);

// @route   PUT /api/transactions/:id/verify
// @desc    Verify a transaction (Admin only)
// @access  Private (Admin)
router.put('/:id/verify', authMiddleware, adminMiddleware, transactionController.verifyTransaction);

// @route   PUT /api/transactions/:id/deliver
// @desc    Deliver item to user (Admin only)
// @access  Private (Admin)
router.put('/:id/deliver', authMiddleware, adminMiddleware, transactionController.deliverTransaction);

// @route   PUT /api/transactions/:id/reject
// @desc    Reject a transaction (Admin only)
// @access  Private (Admin)
router.put('/:id/reject', authMiddleware, adminMiddleware, transactionController.rejectTransaction);

module.exports = router;