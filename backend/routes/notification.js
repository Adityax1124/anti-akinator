const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const {
  getNotifications,
  getUnreadNotifications,
  getUnreadCount,
  getNotificationDetails,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications,
  getUnclaimedNotifications,
  getNotificationsByType,
  getNotificationSummary,
  getWarNotifications,
  getChestNotifications,
  createCustomNotification,
  bulkCreateNotifications
} = require('../controllers/notificationController');

// ============================================================
// ✅ ALL ROUTES REQUIRE AUTHENTICATION
// ============================================================
router.use(authMiddleware);

// ============================================================
// ✅ NOTIFICATION ROUTES
// ============================================================

/**
 * @route   GET /api/notifications
 * @desc    Get all notifications for user
 * @access  Private
 * @query   { limit: number, offset: number, type: string }
 */
router.get('/', getNotifications);

/**
 * @route   GET /api/notifications/unread
 * @desc    Get unread notifications
 * @access  Private
 */
router.get('/unread', getUnreadNotifications);

/**
 * @route   GET /api/notifications/unread/count
 * @desc    Get unread notification count (for navbar badge)
 * @access  Private
 */
router.get('/unread/count', getUnreadCount);

/**
 * @route   GET /api/notifications/unclaimed
 * @desc    Get unclaimed chest notifications
 * @access  Private
 */
router.get('/unclaimed', getUnclaimedNotifications);

/**
 * @route   GET /api/notifications/summary
 * @desc    Get notification summary (dashboard)
 * @access  Private
 */
router.get('/summary', getNotificationSummary);

/**
 * @route   GET /api/notifications/war
 * @desc    Get war notifications
 * @access  Private
 * @query   { limit: number }
 */
router.get('/war', getWarNotifications);

/**
 * @route   GET /api/notifications/chest
 * @desc    Get chest notifications
 * @access  Private
 * @query   { limit: number }
 */
router.get('/chest', getChestNotifications);

/**
 * @route   GET /api/notifications/type/:type
 * @desc    Get notifications by type
 * @access  Private
 * @query   { limit: number }
 */
router.get('/type/:type', getNotificationsByType);

/**
 * @route   GET /api/notifications/:notificationId
 * @desc    Get notification details
 * @access  Private
 */
router.get('/:notificationId', getNotificationDetails);

/**
 * @route   PUT /api/notifications/:notificationId/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put('/:notificationId/read', markAsRead);

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/read-all', markAllAsRead);

/**
 * @route   DELETE /api/notifications/:notificationId
 * @desc    Delete notification
 * @access  Private
 */
router.delete('/:notificationId', deleteNotification);

/**
 * @route   DELETE /api/notifications/clear-read
 * @desc    Clear all read notifications
 * @access  Private
 */
router.delete('/clear-read', clearReadNotifications);

// ============================================================
// ✅ ADMIN ONLY ROUTES
// ============================================================

/**
 * @route   POST /api/notifications/custom
 * @desc    Create custom notification (Admin only)
 * @access  Private (Admin)
 * @body    { userId: string, title: string, message: string, type: string, data: object, priority: string }
 */
router.post('/custom', createCustomNotification);

/**
 * @route   POST /api/notifications/bulk
 * @desc    Bulk create notifications (Admin only)
 * @access  Private (Admin)
 * @body    { userIds: string[], title: string, message: string, type: string, data: object, priority: string }
 */
router.post('/bulk', bulkCreateNotifications);

// ============================================================
// ✅ EXPORT: Router directly
// ============================================================
module.exports = router;