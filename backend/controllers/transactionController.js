// /backend/controllers/transactionController.js
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const SeasonPass = require('../models/SeasonPass'); // ✅ ADDED THIS IMPORT

// @desc    Create a new transaction
exports.createTransaction = async (req, res) => {
  try {
    const { utrNumber, paidAmount, expectedAmount, itemType, itemName, itemDetails } = req.body;
    const userId = req.user._id;

    if (!utrNumber || !paidAmount || !expectedAmount || !itemType || !itemName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    if (paidAmount < 1 || expectedAmount < 1) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be at least 1'
      });
    }

    const existingTransaction = await Transaction.findOne({ utrNumber: utrNumber.toUpperCase() });
    if (existingTransaction) {
      return res.status(400).json({
        success: false,
        message: 'This UTR number has already been used.'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const transaction = new Transaction({
      userId,
      utrNumber: utrNumber.toUpperCase(),
      paidAmount: Number(paidAmount),
      expectedAmount: Number(expectedAmount),
      itemType,
      itemName,
      itemDetails: itemDetails || {},
      status: 'pending',
      metadata: {
        ipAddress: req.ip || req.connection?.remoteAddress || 'Unknown',
        userAgent: req.headers['user-agent'] || 'Unknown',
        deviceInfo: req.headers['device-info'] || 'Unknown'
      }
    });

    await transaction.save();

    res.status(201).json({
      success: true,
      message: 'Payment verification submitted successfully!',
      data: {
        transactionId: transaction._id,
        status: transaction.status,
        createdAt: transaction.createdAt
      }
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'This UTR number has already been used.'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to submit payment verification.'
    });
  }
};

// ✅ FIXED: Check UTR availability - Properly exported
exports.checkUtrAvailability = async (req, res) => {
  try {
    const { utrNumber } = req.body;

    // Validate input
    if (!utrNumber) {
      return res.status(400).json({
        success: false,
        message: 'UTR number is required'
      });
    }

    // Check if UTR exists in database
    const existing = await Transaction.findOne({ 
      utrNumber: utrNumber.toUpperCase().trim() 
    });

    // Always return a valid JSON response
    return res.status(200).json({
      success: true,
      available: !existing,
      message: existing ? 'UTR number already used' : 'UTR number is available'
    });

  } catch (error) {
    // Always return JSON, never throw an unhandled error
    return res.status(500).json({
      success: false,
      message: 'Failed to check UTR availability. Please try again.'
    });
  }
};

// @desc    Get user's transactions
exports.getMyTransactions = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, limit = 20, page = 1 } = req.query;

    const query = { userId };
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .select('utrNumber paidAmount expectedAmount itemName itemType status createdAt deliveredAt');

    const total = await Transaction.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions'
    });
  }
};

// @desc    Get transaction by ID (Admin)
exports.getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findById(id)
      .populate('userId', 'username email phoneNumber')
      .populate('verifiedBy', 'username email');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.status(200).json({
      success: true,
      data: transaction
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction'
    });
  }
};

// @desc    Get all transactions (Admin)
exports.getAllTransactions = async (req, res) => {
  try {
    const { status, itemType, search, startDate, endDate, limit = 50, page = 1, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const query = {};
    if (status) query.status = status;
    if (itemType) query.itemType = itemType;

    if (search) {
      const userMatches = await User.find({
        $or: [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      const userIds = userMatches.map(u => u._id);
      query.$or = [
        { utrNumber: { $regex: search, $options: 'i' } },
        { userId: { $in: userIds } }
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const transactions = await Transaction.find(query)
      .populate('userId', 'username email phoneNumber profilePhoto')
      .populate('verifiedBy', 'username email')
      .sort(sort)
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(query);

    const stats = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalPaidAmount: { $sum: '$paidAmount' },
          totalExpectedAmount: { $sum: '$expectedAmount' },
          pendingCount: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          verifiedCount: { $sum: { $cond: [{ $eq: ['$status', 'verified'] }, 1, 0] } },
          deliveredCount: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          rejectedCount: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        transactions,
        stats: stats[0] || {
          totalTransactions: 0,
          totalPaidAmount: 0,
          totalExpectedAmount: 0,
          pendingCount: 0,
          verifiedCount: 0,
          deliveredCount: 0,
          rejectedCount: 0
        },
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions'
    });
  }
};

// @desc    Verify transaction (Admin)
exports.verifyTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user._id;

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    if (transaction.status === 'verified' || transaction.status === 'delivered') {
      return res.status(400).json({
        success: false,
        message: `Transaction is already ${transaction.status}`
      });
    }

    transaction.status = 'verified';
    transaction.verifiedBy = adminId;
    transaction.verifiedAt = new Date();
    transaction.updatedAt = new Date();
    await transaction.save();

    res.status(200).json({
      success: true,
      message: 'Transaction verified successfully',
      data: {
        transactionId: transaction._id,
        status: transaction.status,
        verifiedAt: transaction.verifiedAt
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to verify transaction'
    });
  }
};

// @desc    Deliver item (Admin) - ✅ FIXED with seasonId
exports.deliverTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user._id;

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    if (transaction.status === 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Item has already been delivered'
      });
    }

    if (transaction.status === 'pending') {
      transaction.status = 'verified';
      transaction.verifiedBy = adminId;
      transaction.verifiedAt = new Date();
    }

    const user = await User.findById(transaction.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let deliveryMessage = '';
    switch (transaction.itemType) {
      case 'shards':
        const shardCount = transaction.itemDetails.shardCount || parseInt(transaction.itemName) || 0;
        user.shards = (user.shards || 0) + shardCount;
        deliveryMessage = `${shardCount} shards added to user's account`;
        break;

      case 'seasonpass':
        const durationDays = transaction.itemDetails.durationDays || 30;
        
        // ✅ Get the active season if no seasonId provided
        let seasonId = transaction.itemDetails.seasonId || null;
        if (!seasonId) {
          const activeSeason = await SeasonPass.getActiveSeason();
          if (activeSeason) {
            seasonId = activeSeason._id;
          } else {
          }
        }
        
        // ✅ Initialize seasonPass if not exists
        if (!user.seasonPass) {
          user.seasonPass = {};
        }
        
        // ✅ Set ALL fields INCLUDING seasonId
        user.seasonPass.active = true;
        user.seasonPass.seasonId = seasonId;  // ← CRITICAL FIX!
        user.seasonPass.purchasedAt = new Date();
        user.seasonPass.expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
        user.seasonPass.currentTier = 1;
        user.seasonPass.correctGuesses = 0;
        user.seasonPass.progress = 0;
        user.seasonPass.unlockedTiers = [];
        user.seasonPass.claimedRewards = [];
        user.seasonPass.isCompleted = false;
        user.seasonPass.joinedAt = new Date();
        
        deliveryMessage = `Season Pass activated for ${durationDays} days`;
        break;

      case 'bundle':
        if (transaction.itemDetails.shards) {
          user.shards = (user.shards || 0) + transaction.itemDetails.shards;
        }
        if (transaction.itemDetails.seasonPass) {
          if (!user.seasonPass) user.seasonPass = {};
          
          // ✅ Get active season for bundle as well
          let bundleSeasonId = transaction.itemDetails.seasonId || null;
          if (!bundleSeasonId) {
            const activeSeason = await SeasonPass.getActiveSeason();
            if (activeSeason) {
              bundleSeasonId = activeSeason._id;
            }
          }
          
          user.seasonPass.active = true;
          user.seasonPass.seasonId = bundleSeasonId;  // ← CRITICAL FIX!
          user.seasonPass.purchasedAt = new Date();
          user.seasonPass.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          user.seasonPass.currentTier = 1;
          user.seasonPass.correctGuesses = 0;
          user.seasonPass.progress = 0;
          user.seasonPass.unlockedTiers = [];
          user.seasonPass.claimedRewards = [];
          user.seasonPass.isCompleted = false;
          user.seasonPass.joinedAt = new Date();
        }
        deliveryMessage = 'Bundle items delivered';
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Unknown item type'
        });
    }

    await user.save();

    if (!user.transactionHistory) {
      user.transactionHistory = [];
    }
    user.transactionHistory.push(transaction._id);
    await user.save();

    transaction.status = 'delivered';
    transaction.deliveredAt = new Date();
    transaction.updatedAt = new Date();
    transaction.notes = `${deliveryMessage} | Delivered by ${req.user.username || 'admin'}`;
    await transaction.save();

    res.status(200).json({
      success: true,
      message: 'Item delivered successfully',
      data: {
        transactionId: transaction._id,
        status: transaction.status,
        deliveredAt: transaction.deliveredAt,
        deliveryMessage
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to deliver item'
    });
  }
};

// @desc    Reject transaction (Admin)
exports.rejectTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user._id;

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    if (transaction.status === 'verified' || transaction.status === 'delivered') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject a ${transaction.status} transaction`
      });
    }

    transaction.status = 'rejected';
    transaction.verifiedBy = adminId;
    transaction.verifiedAt = new Date();
    transaction.updatedAt = new Date();
    transaction.notes = reason || 'Transaction rejected by admin';
    await transaction.save();

    res.status(200).json({
      success: true,
      message: 'Transaction rejected successfully',
      data: {
        transactionId: transaction._id,
        status: transaction.status,
        reason: transaction.notes
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to reject transaction'
    });
  }
};

// @desc    Get transaction statistics (Admin)
exports.getTransactionStats = async (req, res) => {
  try {
    const stats = await Transaction.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$paidAmount' }
        }
      }
    ]);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyStats = await Transaction.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            status: '$status'
          },
          count: { $sum: 1 },
          amount: { $sum: '$paidAmount' }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    const typeStats = await Transaction.aggregate([
      {
        $group: {
          _id: '$itemType',
          count: { $sum: 1 },
          totalAmount: { $sum: '$paidAmount' }
        }
      }
    ]);

    const revenueResult = await Transaction.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$paidAmount' } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        statusBreakdown: stats,
        dailyStats,
        typeBreakdown: typeStats,
        totalTransactions: await Transaction.countDocuments(),
        pendingTransactions: await Transaction.countDocuments({ status: 'pending' }),
        verifiedTransactions: await Transaction.countDocuments({ status: 'verified' }),
        deliveredTransactions: await Transaction.countDocuments({ status: 'delivered' }),
        rejectedTransactions: await Transaction.countDocuments({ status: 'rejected' }),
        totalRevenue: revenueResult.length > 0 ? revenueResult[0].total : 0
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get transaction statistics'
    });
  }
};