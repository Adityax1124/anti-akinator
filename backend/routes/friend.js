const express = require('express');
const { body, validationResult } = require('express-validator');
const Friend = require('../models/Friend');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// ===== VALIDATION RULES =====
const validateFriendRequest = [
  body('userId')
    .isMongoId()
    .withMessage('Invalid user ID format')
];

// ============================================================
// SEND FRIEND REQUEST
// ============================================================
router.post('/request', authMiddleware, validateFriendRequest, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      });
    }

    const { userId } = req.body;
    const requesterId = req.user._id;

    if (requesterId.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot send a friend request to yourself'
      });
    }

    const recipient = await User.findById(userId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const existingFriend = await Friend.findOne({
      $or: [
        { requester: requesterId, recipient: userId },
        { requester: userId, recipient: requesterId }
      ]
    });

    if (existingFriend) {
      if (existingFriend.status === 'accepted') {
        return res.status(400).json({
          success: false,
          message: 'You are already friends with this user'
        });
      }
      if (existingFriend.status === 'pending') {
        return res.status(400).json({
          success: false,
          message: 'A friend request is already pending'
        });
      }
      if (existingFriend.status === 'blocked') {
        return res.status(400).json({
          success: false,
          message: 'You cannot send a friend request to this user'
        });
      }
    }

    const friend = new Friend({
      requester: requesterId,
      recipient: userId,
      status: 'pending',
      action: 'sent'
    });

    await friend.save();

    await friend.populate('requester', 'username');
    await friend.populate('recipient', 'username');

    res.json({
      success: true,
      message: 'Friend request sent successfully',
      friend: friend
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send friend request'
    });
  }
});

// ============================================================
// ACCEPT FRIEND REQUEST
// ============================================================
router.post('/accept', authMiddleware, validateFriendRequest, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      });
    }

    const { userId } = req.body;
    const recipientId = req.user._id;

    const friend = await Friend.findOne({
      requester: userId,
      recipient: recipientId,
      status: 'pending'
    });

    if (!friend) {
      return res.status(404).json({
        success: false,
        message: 'No pending friend request found'
      });
    }

    friend.status = 'accepted';
    friend.action = 'accepted';
    friend.updatedAt = new Date();
    await friend.save();

    await friend.populate('requester', 'username');
    await friend.populate('recipient', 'username');

    res.json({
      success: true,
      message: 'Friend request accepted',
      friend: friend
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to accept friend request'
    });
  }
});

// ============================================================
// REJECT FRIEND REQUEST
// ============================================================
router.post('/reject', authMiddleware, validateFriendRequest, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      });
    }

    const { userId } = req.body;
    const recipientId = req.user._id;

    const friend = await Friend.findOneAndDelete({
      requester: userId,
      recipient: recipientId,
      status: 'pending'
    });

    if (!friend) {
      return res.status(404).json({
        success: false,
        message: 'No pending friend request found'
      });
    }

    res.json({
      success: true,
      message: 'Friend request rejected'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to reject friend request'
    });
  }
});

// ============================================================
// UNFRIEND
// ============================================================
router.post('/unfriend', authMiddleware, validateFriendRequest, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      });
    }

    const { userId } = req.body;
    const currentUserId = req.user._id;

    const friend = await Friend.findOneAndDelete({
      $or: [
        { requester: currentUserId, recipient: userId },
        { requester: userId, recipient: currentUserId }
      ],
      status: 'accepted'
    });

    if (!friend) {
      return res.status(404).json({
        success: false,
        message: 'Friend not found'
      });
    }

    res.json({
      success: true,
      message: 'Friend removed successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to remove friend'
    });
  }
});

// ============================================================
// GET FRIEND LIST
// ============================================================
router.get('/list', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    const friends = await Friend.find({
      $or: [
        { requester: userId, status: 'accepted' },
        { recipient: userId, status: 'accepted' }
      ]
    })
    .populate('requester', 'username')
    .populate('recipient', 'username');

    const friendList = friends.map(friend => {
      const isRequester = friend.requester._id.toString() === userId.toString();
      const friendUser = isRequester ? friend.recipient : friend.requester;
      
      return {
        id: friend._id,
        userId: friendUser._id,
        username: friendUser.username,
        since: friend.updatedAt,
        status: 'online'
      };
    });

    res.json({
      success: true,
      friends: friendList,
      count: friendList.length
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get friend list'
    });
  }
});

// ============================================================
// GET PENDING REQUESTS
// ============================================================
router.get('/pending', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    const pendingRequests = await Friend.find({
      recipient: userId,
      status: 'pending'
    })
    .populate('requester', 'username')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      requests: pendingRequests,
      count: pendingRequests.length
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get pending requests'
    });
  }
});

// ============================================================
// GET FRIEND STATUS
// ============================================================
router.get('/status/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    if (currentUserId.toString() === userId) {
      return res.json({
        success: true,
        status: 'self'
      });
    }

    const friend = await Friend.findOne({
      $or: [
        { requester: currentUserId, recipient: userId },
        { requester: userId, recipient: currentUserId }
      ]
    });

    if (!friend) {
      return res.json({
        success: true,
        status: 'none'
      });
    }

    res.json({
      success: true,
      status: friend.status,
      friendId: friend._id,
      action: friend.action
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get friend status'
    });
  }
});

module.exports = router;