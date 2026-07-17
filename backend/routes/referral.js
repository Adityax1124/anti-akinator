const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Referral = require('../models/Referral');

// ===== GENERATE REFERRAL CODE =====
function generateReferralCode(username) {
  const prefix = username.slice(0, 4).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${random}`;
}

// ===== GET REFERRAL INFO =====
router.get('/info', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.referralCode) {
      user.referralCode = generateReferralCode(user.username);
      await user.save();
    }

    // Get referral statistics
    const totalReferrals = await Referral.countDocuments({
      referrer: user._id
    });

    const completedReferrals = await Referral.countDocuments({
      referrer: user._id,
      status: 'completed'
    });

    const pendingReferrals = await Referral.countDocuments({
      referrer: user._id,
      status: { $ne: 'completed' }
    });

    const shardsEarned = user.referralStats?.shardsEarned || 0;

    // Get recent referrals
    const recentReferrals = await Referral.find({
      referrer: user._id
    })
    .populate('referredUser', 'username createdAt')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

    res.json({
      success: true,
      referralCode: user.referralCode,
      referralLink: `${process.env.CLIENT_URL || 'http://localhost:5173'}/register?ref=${user.referralCode}`,
      stats: {
        totalReferrals,
        completedReferrals,
        pendingReferrals,
        shardsEarned
      },
      recentReferrals: recentReferrals.map(ref => ({
        username: ref.referredUser?.username || 'Unknown',
        status: ref.status,
        registeredAt: ref.registeredAt,
        firstGuessAt: ref.firstGuessAt,
        completedAt: ref.completedAt
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch referral info'
    });
  }
});

// ===== VERIFY REFERRAL CODE =====
router.post('/verify', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Referral code is required'
      });
    }

    // Find user with this referral code
    const referrer = await User.findOne({ referralCode: code.toUpperCase() });

    if (!referrer) {
      return res.status(404).json({
        success: false,
        message: 'Invalid referral code'
      });
    }

    // Can't refer yourself
    if (req.user && referrer._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot use your own referral code'
      });
    }

    res.json({
      success: true,
      referrerId: referrer._id,
      referrerUsername: referrer.username,
      message: `You've been referred by ${referrer.username}!`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to verify referral code'
    });
  }
});

// ===== GET REFERRAL LEADERBOARD =====
router.get('/leaderboard', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const topReferrers = await User.aggregate([
      {
        $match: {
          'referralStats.totalReferrals': { $gt: 0 }
        }
      },
      {
        $project: {
          username: 1,
          totalReferrals: '$referralStats.totalReferrals',
          shardsEarned: '$referralStats.shardsEarned',
          completedReferrals: '$referralStats.completedReferrals'
        }
      },
      {
        $sort: { totalReferrals: -1, shardsEarned: -1 }
      },
      {
        $limit: parseInt(limit)
      }
    ]);

    res.json({
      success: true,
      leaderboard: topReferrers.map((user, index) => ({
        rank: index + 1,
        username: user.username,
        totalReferrals: user.totalReferrals || 0,
        shardsEarned: user.shardsEarned || 0,
        completedReferrals: user.completedReferrals || 0
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch referral leaderboard'
    });
  }
});

module.exports = router;