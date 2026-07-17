// /backend/routes/promotion.js
const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');
const {
  submitPromotion,
  getMySubmissions,
  getPromotionById,
  getAllPromotions,
  getPromotionDetail,
  updatePromotionStatus,
  giveReward,
  deletePromotion,
  getPromotionStats
} = require('../controllers/promotionController');

// ============================================================
// VALIDATION RULES
// ============================================================

const validateSubmission = [
  body('platform')
    .isIn(['youtube', 'instagram', 'tiktok', 'facebook', 'other'])
    .withMessage('Invalid platform selected'),
  body('videoLink')
    .trim()
    .isURL()
    .withMessage('Please enter a valid video URL')
    .isLength({ max: 500 })
    .withMessage('Video link is too long'),
  body('videoTitle')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Video title must be between 3 and 200 characters')
    .escape(),
  body('videoDescription')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Video description is too long')
    .escape(),
  body('desiredProfilePhoto')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Desired profile photo character name must be between 2 and 100 characters')
    .escape(),
  body('desiredBanner')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Desired banner character name must be between 2 and 100 characters')
    .escape(),
  body('desiredTitle')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Desired title must be between 2 and 50 characters')
    .escape()
];

const validateStatusUpdate = [
  body('status')
    .isIn(['pending', 'approved', 'rejected', 'completed'])
    .withMessage('Invalid status'),
  body('adminNotes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Admin notes too long')
    .escape()
];

const validateReward = [
  body('milestone')
    .isIn(['10k', '50k', '100k'])
    .withMessage('Invalid milestone. Must be 10k, 50k, or 100k')
];

const validatePromotionId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid promotion ID')
];

// ============================================================
// USER ROUTES (Require Authentication)
// ============================================================

// @route   POST /api/promotion/submit
// @desc    Submit a new promotion video
// @access  Private
router.post('/submit', authMiddleware, validateSubmission, submitPromotion);

// @route   GET /api/promotion/my-submissions
// @desc    Get user's promotion submissions
// @access  Private
router.get('/my-submissions', authMiddleware, getMySubmissions);

// @route   GET /api/promotion/:id
// @desc    Get single promotion submission
// @access  Private
router.get('/:id', authMiddleware, validatePromotionId, getPromotionById);

// ============================================================
// ADMIN ROUTES (Require Authentication + Admin Role)
// ============================================================

// @route   GET /api/promotion/admin/all
// @desc    Get all promotions (admin)
// @access  Private (Admin only)
router.get('/admin/all', authMiddleware, getAllPromotions);

// @route   GET /api/promotion/admin/:id
// @desc    Get single promotion detail (admin)
// @access  Private (Admin only)
router.get('/admin/:id', authMiddleware, validatePromotionId, getPromotionDetail);

// @route   PUT /api/promotion/admin/:id/status
// @desc    Update promotion status (admin)
// @access  Private (Admin only)
router.put('/admin/:id/status', authMiddleware, validatePromotionId, validateStatusUpdate, updatePromotionStatus);

// @route   POST /api/promotion/admin/:id/reward
// @desc    Give milestone reward (admin)
// @access  Private (Admin only)
router.post('/admin/:id/reward', authMiddleware, validatePromotionId, validateReward, giveReward);

// @route   DELETE /api/promotion/admin/:id
// @desc    Delete promotion (admin)
// @access  Private (Admin only)
router.delete('/admin/:id', authMiddleware, validatePromotionId, deletePromotion);

// @route   GET /api/promotion/admin/stats
// @desc    Get promotion stats (admin)
// @access  Private (Admin only)
router.get('/admin/stats', authMiddleware, getPromotionStats);

module.exports = router;