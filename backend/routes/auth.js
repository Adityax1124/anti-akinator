const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Referral = require('../models/Referral');
const TwoFactor = require('../models/TwoFactor');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// ===== HELPER: Get Current Season =====
function getCurrentSeason() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return parseInt(`${year}${month.toString().padStart(2, '0')}`);
}

// ===== VALIDATION RULES =====
const registerValidation = [
  body('username')
    .trim()
    .escape()
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be 3-20 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .trim()
    .escape()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number'),
  body('referralCode')
    .optional()
    .trim()
    .escape()
    .isLength({ min: 6, max: 20 })
    .withMessage('Invalid referral code'),
  body('deviceFingerprint')
    .optional()
    .isString()
    .withMessage('Invalid device fingerprint')
];

const loginValidation = [
  body('email')
    .trim()
    .escape()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// ============================================================
// REGISTER (WITHOUT OTP - Direct Activation)
// ============================================================
router.post('/register', registerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      });
    }

    const { username, email, password, referralCode, deviceFingerprint } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;


    // ===== LAYER 1: IP ADDRESS LIMIT (100 per 24 hours) =====
    const recentRegistrationsFromIP = await User.countDocuments({
      ipAddress: ipAddress,
      createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    if (recentRegistrationsFromIP >= 100) {
      return res.status(429).json({
        success: false,
        message: 'Too many accounts created from this network. Maximum 100 accounts per IP in 24 hours.',
        code: 'IP_LIMIT',
        remaining: 100 - recentRegistrationsFromIP
      });
    }

    // ===== LAYER 2: DEVICE FINGERPRINT LOCK =====
    if (deviceFingerprint) {
      const existingDevice = await User.findOne({ deviceFingerprint: deviceFingerprint });
      
      if (existingDevice) {
        return res.status(429).json({
          success: false,
          message: 'This device already has an account. Only one account per device is allowed.',
          code: 'DEVICE_LOCKED'
        });
      }
    }

    // Clean referral code
    const cleanReferralCode = referralCode && referralCode !== 'undefined' && referralCode.trim() !== '' 
      ? referralCode.trim() 
      : null;


    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { email: email.toLowerCase() }, 
        { username: { $regex: new RegExp(`^${username}$`, 'i') } }
      ] 
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email or username'
      });
    }

    // ===== HANDLE REFERRAL =====
    let referrer = null;
    let referralDoc = null;

    if (cleanReferralCode) {
      const cleanCode = cleanReferralCode.toUpperCase().trim();
      
      referrer = await User.findOne({ referralCode: cleanCode });
      
      if (referrer) {
      } else {
      }
    } else {
    }

    // Get current season
    const currentSeason = getCurrentSeason();

    // ✅ Create user - DIRECTLY ACTIVE (no OTP)
    const user = new User({ 
      username: username.trim(), 
      email: email.toLowerCase().trim(), 
      password,
      deviceFingerprint: deviceFingerprint || null,
      ipAddress: ipAddress,
      isActive: true,        // ✅ Directly active
      isEmailVerified: true, // ✅ Directly verified
      seasonStats: {
        currentSeason: currentSeason,
        seasonWins: 0,
        seasonPlayed: 0,
        seasonStreak: 0
      }
    });

    // If valid referral
    if (referrer) {
      user.referredBy = referrer._id;
    }

    // Generate referral code for the new user
    const prefix = username.slice(0, 4).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    user.referralCode = `${prefix}-${random}`;

    // SAVE USER
    await user.save();

    // Create referral document if valid referral
    if (referrer) {
      referralDoc = new Referral({
        referrer: referrer._id,
        referredUser: user._id,
        code: cleanReferralCode.toUpperCase().trim(),
        status: 'registered',
        registeredAt: new Date()
      });
      await referralDoc.save();
      
      referrer.referrals.push(user._id);
      referrer.referralStats.totalReferrals = (referrer.referralStats?.totalReferrals || 0) + 1;
      await referrer.save();
    }


    // ✅ Generate token (user is already verified)
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      stats: user.stats,
      shards: user.shards,
      seasonStats: user.seasonStats,
      referralCode: user.referralCode,
      referredBy: user.referredBy,
      referralStats: user.referralStats,
      deviceFingerprint: user.deviceFingerprint,
      isEmailVerified: true,
      isActive: true
    };

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful! 🎉',
      token: token,
      user: userResponse,
      referral: referralDoc ? {
        referrer: referrer.username,
        status: 'registered',
        message: `You've been referred by ${referrer.username}!`
      } : null
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating user. Please try again.'
    });
  }
});

// ============================================================
// LOGIN
// ============================================================
router.post('/login', loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (user.isLocked && user.isLocked()) {
      return res.status(423).json({
        success: false,
        message: 'Account is locked due to too many failed attempts. Please try again later.'
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incrementFailedAttempts();
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    await user.resetFailedAttempts();

    const twoFactor = await TwoFactor.findOne({ user: user._id });

    if (twoFactor && twoFactor.enabled) {
      return res.json({
        success: true,
        requires2FA: true,
        email: user.email,
        userId: user._id,
        message: '2FA verification required'
      });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      stats: user.stats,
      shards: user.shards,
      seasonStats: user.seasonStats,
      referralCode: user.referralCode,
      referredBy: user.referredBy,
      referralStats: user.referralStats,
      deviceFingerprint: user.deviceFingerprint,
      isEmailVerified: user.isEmailVerified || false
    };

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userResponse
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error logging in. Please try again.'
    });
  }
});

// ============================================================
// VERIFY REFERRAL CODE
// ============================================================
router.post('/verify-referral', async (req, res) => {
  try {
    const { referralCode } = req.body;

    if (!referralCode) {
      return res.status(400).json({
        success: false,
        message: 'Referral code is required'
      });
    }

    const cleanCode = referralCode.toUpperCase().trim();

    const referrer = await User.findOne({ referralCode: cleanCode });

    if (!referrer) {
      return res.status(404).json({
        success: false,
        message: 'Invalid referral code'
      });
    }


    res.json({
      success: true,
      referrer: {
        username: referrer.username,
        referralCode: referrer.referralCode
      },
      message: `You've been referred by ${referrer.username}! 🎉`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to verify referral code'
    });
  }
});

// ============================================================
// GET CURRENT USER
// ============================================================
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('equipped.banner', 'gifUrl')
      .populate('equipped.title', 'displayName displayType')
      .populate('equipped.profilePhoto', 'imageUrl');

    res.json({
      success: true,
      user: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user data'
    });
  }
});

// ============================================================
// LOGOUT
// ============================================================
router.post('/logout', authMiddleware, (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;