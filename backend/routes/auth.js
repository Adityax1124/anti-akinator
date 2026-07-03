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
    .withMessage('Invalid referral code')
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
// REGISTER (with Referral Support - FIXED)
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

    const { username, email, password, referralCode } = req.body;

    console.log('========================================');
    console.log('🔍 [REGISTER] New registration attempt');
    console.log(`📝 Username: ${username}`);
    
    // ✅ FIX: Check if referralCode is valid (not undefined, not null, not "undefined")
    const cleanReferralCode = referralCode && referralCode !== 'undefined' && referralCode.trim() !== '' 
      ? referralCode.trim() 
      : null;
    
    console.log(`📝 Referral Code Provided: "${cleanReferralCode}"`);
    console.log('========================================');

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

    // ===== ✅ HANDLE REFERRAL =====
    let referrer = null;
    let referralDoc = null;

    if (cleanReferralCode) {
      const cleanCode = cleanReferralCode.toUpperCase().trim();
      console.log(`🔍 [REGISTER] Looking for referrer with code: "${cleanCode}"`);
      
      // Find the referrer by their referral code
      referrer = await User.findOne({ referralCode: cleanCode });
      
      if (referrer) {
        console.log(`✅ [REGISTER] Referrer FOUND: ${referrer.username} (ID: ${referrer._id})`);
        console.log(`✅ [REGISTER] Referrer's referralCode: ${referrer.referralCode}`);
      } else {
        console.log(`❌ [REGISTER] No user found with referral code: "${cleanCode}"`);
        
        // DEBUG: Check all referral codes in DB
        const allCodes = await User.find({ referralCode: { $exists: true } }, { username: 1, referralCode: 1 }).limit(10);
        console.log('📋 [REGISTER] Existing referral codes in DB:', allCodes.map(u => `${u.username}: ${u.referralCode}`).join(', '));
      }
    } else {
      console.log(`ℹ️ [REGISTER] No valid referral code provided`);
    }

    // ✅ Get current season dynamically
    const currentSeason = getCurrentSeason();

    // ✅ Create user
    const user = new User({ 
      username: username.trim(), 
      email: email.toLowerCase().trim(), 
      password,
      seasonStats: {
        currentSeason: currentSeason,
        seasonWins: 0,
        seasonPlayed: 0,
        seasonStreak: 0
      }
    });

    // ===== ✅ If valid referral, save referrer info =====
    if (referrer) {
      user.referredBy = referrer._id;
      console.log(`✅ [REGISTER] Set user.referredBy = ${referrer._id}`);
      
      // Generate referral code for the new user
      const prefix = username.slice(0, 4).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      user.referralCode = `${prefix}-${random}`;
      console.log(`✅ [REGISTER] Generated referral code for new user: ${user.referralCode}`);
    } else {
      // Generate referral code for the new user (even without a referrer)
      const prefix = username.slice(0, 4).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      user.referralCode = `${prefix}-${random}`;
      console.log(`✅ [REGISTER] Generated referral code for new user (no referrer): ${user.referralCode}`);
    }

    // ✅ SAVE USER
    await user.save();
    console.log(`✅ [REGISTER] User ${user.username} saved successfully!`);
    console.log(`✅ [REGISTER] referredBy: ${user.referredBy}`);
    console.log(`✅ [REGISTER] referralCode: ${user.referralCode}`);

    // ===== ✅ Create referral document if valid referral =====
    if (referrer) {
      referralDoc = new Referral({
        referrer: referrer._id,
        referredUser: user._id,
        code: cleanReferralCode.toUpperCase().trim(),
        status: 'registered',
        registeredAt: new Date()
      });
      await referralDoc.save();
      console.log(`📝 [REGISTER] Referral document created! ID: ${referralDoc._id}`);
      
      // ✅ Update referrer's referrals list
      referrer.referrals.push(user._id);
      referrer.referralStats.totalReferrals = (referrer.referralStats?.totalReferrals || 0) + 1;
      await referrer.save();
      console.log(`✅ [REGISTER] Added ${user.username} to ${referrer.username}'s referrals list`);
    } else {
      console.log(`ℹ️ [REGISTER] No referral document created (no referrer)`);
    }

    // Generate JWT token
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
      referralStats: user.referralStats
    };

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // ===== ✅ Send response =====
    const responseMessage = referrer 
      ? `User created successfully! You were referred by ${referrer.username}. You both will get 50 Shards when you win your first game! 🎉`
      : 'User created successfully!';

    console.log(`✅ [REGISTER] Registration complete for ${username}`);
    console.log('========================================');

    res.status(201).json({
      success: true,
      message: responseMessage,
      token,
      user: userResponse,
      referral: referralDoc ? {
        referrer: referrer.username,
        status: 'registered',
        message: `You've been referred by ${referrer.username}! Win your first game to earn 50 Shards each! 🎉`
      } : null
    });

  } catch (error) {
    console.error('❌ [REGISTER] ERROR:', {
      message: error.message,
      stack: error.stack,
      ip: req.ip
    });
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
      referralStats: user.referralStats
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
    console.error('❌ [LOGIN] Error:', {
      message: error.message,
      ip: req.ip
    });
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
    console.log(`🔍 [VERIFY] Checking referral code: "${cleanCode}"`);

    const referrer = await User.findOne({ referralCode: cleanCode });

    if (!referrer) {
      console.log(`❌ [VERIFY] Invalid referral code: "${cleanCode}"`);
      return res.status(404).json({
        success: false,
        message: 'Invalid referral code'
      });
    }

    console.log(`✅ [VERIFY] Valid referral code from: ${referrer.username}`);

    res.json({
      success: true,
      referrer: {
        username: referrer.username,
        referralCode: referrer.referralCode
      },
      message: `You've been referred by ${referrer.username}! 🎉`
    });
  } catch (error) {
    console.error('❌ [VERIFY] Error:', error);
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
    console.error('❌ [GET USER] Error:', error);
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