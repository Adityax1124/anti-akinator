const Notification = require('../models/Notification');
const TreasureChest = require('../models/TreasureChest');

// ============================================================
// ✅ GET ALL NOTIFICATIONS
// ============================================================
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 50, offset = 0, type } = req.query;

    // Build query
    const query = { userId };
    if (type) {
      query.type = type;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(query);

    // Get unread count
    const unreadCount = await Notification.getUnreadCount(userId);

    // Get unclaimed count (chests)
    const unclaimedCount = await Notification.getUnclaimedCount(userId);

    res.json({
      success: true,
      notifications,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + notifications.length
      },
      counts: {
        unread: unreadCount,
        unclaimed: unclaimedCount,
        total
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notifications: ' + error.message
    });
  }
};

// ============================================================
// ✅ GET UNREAD NOTIFICATIONS
// ============================================================
exports.getUnreadNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    const notifications = await Notification.getUnreadForUser(userId);
    const count = notifications.length;

    res.json({
      success: true,
      notifications,
      count
    });

  } catch (error) {
    console.error('Get unread notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread notifications: ' + error.message
    });
  }
};

// ============================================================
// ✅ GET UNREAD COUNT (For navbar badge)
// ============================================================
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;

    const count = await Notification.getUnreadCount(userId);

    res.json({
      success: true,
      count
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count: ' + error.message
    });
  }
};

// ============================================================
// ✅ GET NOTIFICATION DETAILS
// ============================================================
exports.getNotificationDetails = async (req, res) => {
  try {
    const userId = req.user._id;
    const { notificationId } = req.params;

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if notification belongs to user
    if (notification.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not own this notification'
      });
    }

    // Mark as read automatically when viewed
    if (!notification.isRead) {
      await notification.markAsRead();
    }

    // Get related data if chest notification
    let chestData = null;
    if (notification.type === 'chest_available' && notification.data.chestId) {
      const chest = await TreasureChest.findById(notification.data.chestId);
      if (chest) {
        chestData = {
          id: chest._id,
          isOpened: chest.isOpened,
          reward: chest.isOpened ? chest.reward : null,
          expiresAt: chest.expiresAt
        };
      }
    }

    res.json({
      success: true,
      notification,
      chestData
    });

  } catch (error) {
    console.error('Get notification details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notification details: ' + error.message
    });
  }
};

// ============================================================
// ✅ MARK NOTIFICATION AS READ
// ============================================================
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const { notificationId } = req.params;

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if notification belongs to user
    if (notification.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not own this notification'
      });
    }

    await notification.markAsRead();

    res.json({
      success: true,
      message: 'Notification marked as read',
      notification
    });

  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark as read: ' + error.message
    });
  }
};

// ============================================================
// ✅ MARK ALL AS READ
// ============================================================
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    const result = await Notification.markAllAsRead(userId);

    res.json({
      success: true,
      message: 'All notifications marked as read',
      count: result.modifiedCount || 0
    });

  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all as read: ' + error.message
    });
  }
};

// ============================================================
// ✅ DELETE NOTIFICATION
// ============================================================
exports.deleteNotification = async (req, res) => {
  try {
    const userId = req.user._id;
    const { notificationId } = req.params;

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if notification belongs to user
    if (notification.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not own this notification'
      });
    }

    await notification.deleteOne();

    res.json({
      success: true,
      message: 'Notification deleted'
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification: ' + error.message
    });
  }
};

// ============================================================
// ✅ CLEAR ALL READ NOTIFICATIONS
// ============================================================
exports.clearReadNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    const result = await Notification.clearRead(userId);

    res.json({
      success: true,
      message: 'All read notifications cleared',
      count: result.deletedCount || 0
    });

  } catch (error) {
    console.error('Clear read notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear read notifications: ' + error.message
    });
  }
};

// ============================================================
// ✅ GET UNCLAIMED NOTIFICATIONS (Chest rewards)
// ============================================================
exports.getUnclaimedNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    const notifications = await Notification.getUnclaimedForUser(userId);

    // Get chest details for each notification
    const notificationsWithChests = [];
    for (const notification of notifications) {
      let chestData = null;
      if (notification.data.chestId) {
        const chest = await TreasureChest.findById(notification.data.chestId);
        if (chest) {
          chestData = {
            id: chest._id,
            isOpened: chest.isOpened,
            expiresAt: chest.expiresAt
          };
        }
      }
      notificationsWithChests.push({
        ...notification.toObject(),
        chestData
      });
    }

    res.json({
      success: true,
      notifications: notificationsWithChests,
      count: notificationsWithChests.length
    });

  } catch (error) {
    console.error('Get unclaimed notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unclaimed notifications: ' + error.message
    });
  }
};

// ============================================================
// ✅ GET NOTIFICATIONS BY TYPE
// ============================================================
exports.getNotificationsByType = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type } = req.params;
    const { limit = 20 } = req.query;

    const notifications = await Notification.find({
      userId,
      type
    })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

    const total = await Notification.countDocuments({ userId, type });

    res.json({
      success: true,
      notifications,
      total,
      type
    });

  } catch (error) {
    console.error('Get notifications by type error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notifications: ' + error.message
    });
  }
};

// ============================================================
// ✅ GET NOTIFICATION SUMMARY (For dashboard)
// ============================================================
exports.getNotificationSummary = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get counts by type
    const typeCounts = await Notification.aggregate([
      { $match: { userId } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    const countsByType = {};
    typeCounts.forEach(item => {
      countsByType[item._id] = item.count;
    });

    // Get unread count
    const unreadCount = await Notification.getUnreadCount(userId);

    // Get unclaimed count
    const unclaimedCount = await Notification.getUnclaimedCount(userId);

    // Get recent notifications (last 5)
    const recent = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      summary: {
        unread: unreadCount,
        unclaimed: unclaimedCount,
        total: await Notification.countDocuments({ userId }),
        byType: countsByType
      },
      recent
    });

  } catch (error) {
    console.error('Get notification summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notification summary: ' + error.message
    });
  }
};

// ============================================================
// ✅ CREATE CUSTOM NOTIFICATION (Admin only - For announcements)
// ============================================================
exports.createCustomNotification = async (req, res) => {
  try {
    const { userId, title, message, type, data, priority } = req.body;

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can create custom notifications'
      });
    }

    if (!userId || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'userId, title, and message are required'
      });
    }

    const notification = await Notification.createNotification({
      userId,
      type: type || 'announcement',
      title,
      message,
      data: data || {},
      priority: priority || 'medium'
    });

    res.status(201).json({
      success: true,
      message: 'Notification created',
      notification
    });

  } catch (error) {
    console.error('Create custom notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create notification: ' + error.message
    });
  }
};

// ============================================================
// ✅ BULK CREATE NOTIFICATIONS (Admin only)
// ============================================================
exports.bulkCreateNotifications = async (req, res) => {
  try {
    const { userIds, title, message, type, data, priority } = req.body;

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can create bulk notifications'
      });
    }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'userIds array is required'
      });
    }

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'title and message are required'
      });
    }

    const notifications = [];
    for (const userId of userIds) {
      const notification = await Notification.createNotification({
        userId,
        type: type || 'announcement',
        title,
        message,
        data: data || {},
        priority: priority || 'medium'
      });
      notifications.push(notification);
    }

    res.status(201).json({
      success: true,
      message: `${notifications.length} notifications created`,
      count: notifications.length
    });

  } catch (error) {
    console.error('Bulk create notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create notifications: ' + error.message
    });
  }
};

// ============================================================
// ✅ GET WAR NOTIFICATIONS (Filtered for war page)
// ============================================================
exports.getWarNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 20 } = req.query;

    const warTypes = [
      'war_victory',
      'war_defeat',
      'war_draw',
      'war_started',
      'war_reminder',
      'war_found',
      'war_ending_soon'
    ];

    const notifications = await Notification.find({
      userId,
      type: { $in: warTypes }
    })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

    res.json({
      success: true,
      notifications,
      count: notifications.length
    });

  } catch (error) {
    console.error('Get war notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get war notifications: ' + error.message
    });
  }
};

// ============================================================
// ✅ GET CHEST NOTIFICATIONS (Filtered for chests)
// ============================================================
exports.getChestNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 20 } = req.query;

    const chestTypes = ['chest_available', 'chest_opened'];

    const notifications = await Notification.find({
      userId,
      type: { $in: chestTypes }
    })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

    // Get chest details for each notification
    const notificationsWithChests = [];
    for (const notification of notifications) {
      let chestData = null;
      if (notification.data.chestId) {
        const chest = await TreasureChest.findById(notification.data.chestId);
        if (chest) {
          chestData = {
            id: chest._id,
            isOpened: chest.isOpened,
            reward: chest.isOpened ? chest.reward : null
          };
        }
      }
      notificationsWithChests.push({
        ...notification.toObject(),
        chestData
      });
    }

    res.json({
      success: true,
      notifications: notificationsWithChests,
      count: notificationsWithChests.length
    });

  } catch (error) {
    console.error('Get chest notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chest notifications: ' + error.message
    });
  }
};