const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Referral = require('../models/Referral');
const OTP = require('../models/OTP');
const TwoFactor = require('../models/TwoFactor');
const { authMiddleware } = require('../middleware/auth');
const { sendOTPEmail, sendWelcomeEmail } = require('../utils/email');
const router = express.Router();

// ===== HELPER: Get Current Season =====
function getCurrentSeason() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return parseInt(`${year}${month.toString().padStart(2, '0')}`);
}

// ===== HELPER: Generate OTP =====
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
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

const verifyOTPValidation = [
  body('email')
    .trim()
    .escape()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
    .matches(/^[0-9]+$/)
    .withMessage('OTP must contain only numbers')
];

const resendOTPValidation = [
  body('email')
    .trim()
    .escape()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail()
];

// ============================================================
// REGISTER (OPTIMIZED - FASTER)
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

    console.log('========================================');
    console.log('🔍 [REGISTER] New registration attempt');
    console.log(`📝 Username: ${username}`);
    console.log(`📝 IP Address: ${ipAddress}`);
    console.log(`📝 Device Fingerprint: ${deviceFingerprint ? 'Provided' : 'Not provided'}`);

    // ===== ✅ LAYER 1: IP ADDRESS LIMIT =====
    const recentRegistrationsFromIP = await User.countDocuments({
      ipAddress: ipAddress,
      createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    console.log(`📊 Recent registrations from IP ${ipAddress}: ${recentRegistrationsFromIP}`);

    if (recentRegistrationsFromIP >= 3) {
      console.log(`🚫 IP LIMIT REACHED: ${ipAddress} has ${recentRegistrationsFromIP} registrations in 24 hours`);
      return res.status(429).json({
        success: false,
        message: 'Too many accounts created from this network. Maximum 3 accounts per IP in 24 hours.',
        code: 'IP_LIMIT',
        remaining: 3 - recentRegistrationsFromIP
      });
    }

    // ===== ✅ LAYER 2: DEVICE FINGERPRINT LOCK =====
    if (deviceFingerprint) {
      const existingDevice = await User.findOne({ deviceFingerprint: deviceFingerprint });
      
      if (existingDevice) {
        console.log(`🚫 DEVICE LOCKED: ${deviceFingerprint} already registered to: ${existingDevice.username}`);
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

    console.log(`📝 Referral Code Provided: "${cleanReferralCode}"`);

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
      
      referrer = await User.findOne({ referralCode: cleanCode });
      
      if (referrer) {
        console.log(`✅ [REGISTER] Referrer FOUND: ${referrer.username} (ID: ${referrer._id})`);
      } else {
        console.log(`❌ [REGISTER] No user found with referral code: "${cleanCode}"`);
      }
    } else {
      console.log(`ℹ️ [REGISTER] No valid referral code provided`);
    }

    // ✅ Get current season
    const currentSeason = getCurrentSeason();

    // ✅ Create user
    const user = new User({ 
      username: username.trim(), 
      email: email.toLowerCase().trim(), 
      password,
      deviceFingerprint: deviceFingerprint || null,
      ipAddress: ipAddress,
      isActive: false,
      isEmailVerified: false,
      seasonStats: {
        currentSeason: currentSeason,
        seasonWins: 0,
        seasonPlayed: 0,
        seasonStreak: 0
      }
    });

    // ===== ✅ If valid referral =====
    if (referrer) {
      user.referredBy = referrer._id;
      console.log(`✅ [REGISTER] Set user.referredBy = ${referrer._id}`);
    }

    // ✅ Generate referral code for the new user
    const prefix = username.slice(0, 4).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    user.referralCode = `${prefix}-${random}`;
    console.log(`✅ [REGISTER] Generated referral code: ${user.referralCode}`);

    // ✅ SAVE USER
    await user.save();
    console.log(`✅ [REGISTER] User ${user.username} saved successfully!`);

    // ===== ✅ Create referral document if valid referral =====
    if (referrer) {
      referralDoc = new Referral({
        referrer: referrer._id,
        referredUser: user._id,
        code: cleanReferralCode.toUpperCase().trim(),
        status: 'pending',
        registeredAt: new Date()
      });
      await referralDoc.save();
      console.log(`📝 [REGISTER] Referral document created!`);
      
      referrer.referrals.push(user._id);
      referrer.referralStats.totalReferrals = (referrer.referralStats?.totalReferrals || 0) + 1;
      await referrer.save();
      console.log(`✅ [REGISTER] Added ${user.username} to ${referrer.username}'s referrals list`);
    }

    // ===== ✅ SEND OTP (ASYNC - DON'T WAIT) =====
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Delete old OTPs for this email
    await OTP.deleteMany({ email: user.email });

    const otpRecord = new OTP({
      email: user.email,
      otp: otp,
      userId: user._id,
      expiresAt: expiresAt
    });
    await otpRecord.save();

    // ✅ Send OTP email in background (don't await)
    sendOTPEmail(user.email, otp, user.username)
      .then(() => console.log(`📧 OTP sent to ${user.email}`))
      .catch(err => console.error(`❌ Failed to send OTP to ${user.email}:`, err.message));

    console.log(`✅ [REGISTER] Registration complete for ${username}`);
    console.log('========================================');

    // ✅ Return without token - user must verify first
    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      isEmailVerified: false,
      isActive: false
    };

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please verify your email.',
      requiresVerification: true,
      email: user.email,
      userId: user._id,
      user: userResponse,
      referral: referralDoc ? {
        referrer: referrer.username,
        status: 'pending',
        message: `You've been referred by ${referrer.username}! Please verify your email to activate your account.`
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
// VERIFY OTP
// ============================================================
router.post('/verify-otp', verifyOTPValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      });
    }

    const { email, otp } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const otpRecord = await OTP.findOne({
      email: normalizedEmail,
      isVerified: false
    });

    if (!otpRecord) {
      return res.status(404).json({
        success: false,
        message: 'No pending verification found'
      });
    }

    if (otpRecord.expiresAt < new Date()) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      });
    }

    if (otpRecord.attempts >= 5) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: 'Too many failed attempts. Please request a new OTP.'
      });
    }

    if (otpRecord.otp !== otp) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${5 - otpRecord.attempts} attempts remaining.`
      });
    }

    otpRecord.isVerified = true;
    await otpRecord.save();

    const user = await User.findById(otpRecord.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isEmailVerified = true;
    user.isActive = true;
    await user.save();

    if (user.referredBy) {
      const referral = await Referral.findOne({
        referredUser: user._id,
        status: 'pending'
      });
      if (referral) {
        referral.status = 'registered';
        referral.registeredAt = new Date();
        await referral.save();
        console.log(`📝 [VERIFY] Referral activated for ${user.username}`);
      }
    }

    // ✅ Send welcome email in background
    sendWelcomeEmail(normalizedEmail, user.username)
      .then(() => console.log(`📧 Welcome email sent to ${normalizedEmail}`))
      .catch(err => console.error(`❌ Failed to send welcome email:`, err.message));

    await OTP.deleteOne({ _id: otpRecord._id });

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
      isEmailVerified: true,
      isActive: true
    };

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    console.log(`✅ Email verified: ${normalizedEmail}`);

    res.json({
      success: true,
      message: 'Email verified successfully! 🎉',
      token: token,
      user: userResponse
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP. Please try again.'
    });
  }
});

// ============================================================
// RESEND OTP
// ============================================================
router.post('/resend-otp', resendOTPValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      });
    }

    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      });
    }

    const recentOTP = await OTP.findOne({
      email: normalizedEmail,
      createdAt: { $gt: new Date(Date.now() - 60 * 1000) }
    });

    if (recentOTP) {
      return res.status(429).json({
        success: false,
        message: 'Please wait 60 seconds before requesting another OTP'
      });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await OTP.deleteMany({ email: normalizedEmail });

    const otpRecord = new OTP({
      email: normalizedEmail,
      otp: otp,
      userId: user._id,
      expiresAt: expiresAt
    });
    await otpRecord.save();

    // ✅ Send OTP in background
    sendOTPEmail(normalizedEmail, otp, user.username)
      .then(() => console.log(`📧 New OTP sent to ${normalizedEmail}`))
      .catch(err => console.error(`❌ Failed to send OTP:`, err.message));

    console.log(`📧 New OTP sent to ${normalizedEmail}: ${otp}`);

    res.json({
      success: true,
      message: 'New OTP sent to your email',
      expiresIn: 300
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend OTP. Please try again.'
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