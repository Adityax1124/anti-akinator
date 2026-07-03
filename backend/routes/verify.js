const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { sendOTPEmail, sendWelcomeEmail } = require('../utils/email');
const router = express.Router();

// ===== GENERATE OTP =====
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ===== VALIDATION RULES =====
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
// SEND OTP
// ============================================================
router.post('/send-otp', resendOTPValidation, async (req, res) => {
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

    // Check if user exists
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is already verified
    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      });
    }

    // Check if OTP was recently sent (rate limit - 60 seconds)
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

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Delete old OTPs for this email
    await OTP.deleteMany({ email: normalizedEmail });

    // Save new OTP
    const otpRecord = new OTP({
      email: normalizedEmail,
      otp: otp,
      userId: user._id,
      expiresAt: expiresAt
    });
    await otpRecord.save();

    // Send OTP email
    await sendOTPEmail(normalizedEmail, otp, user.username);

    console.log(`📧 OTP sent to ${normalizedEmail}: ${otp}`);

    res.json({
      success: true,
      message: 'OTP sent to your email',
      expiresIn: 300 // 5 minutes in seconds
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again.'
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

    // Find OTP record
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

    // Check if OTP has expired
    if (otpRecord.expiresAt < new Date()) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      });
    }

    // Check attempts
    if (otpRecord.attempts >= 5) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: 'Too many failed attempts. Please request a new OTP.'
      });
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${5 - otpRecord.attempts} attempts remaining.`
      });
    }

    // Mark OTP as verified
    otpRecord.isVerified = true;
    await otpRecord.save();

    // Update user
    const user = await User.findById(otpRecord.userId);
    user.isEmailVerified = true;
    user.isActive = true;
    await user.save();

    // Send welcome email
    await sendWelcomeEmail(normalizedEmail, user.username);

    // Delete used OTP
    await OTP.deleteOne({ _id: otpRecord._id });

    console.log(`✅ Email verified: ${normalizedEmail}`);

    res.json({
      success: true,
      message: 'Email verified successfully! 🎉',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isEmailVerified: user.isEmailVerified
      }
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
// CHECK VERIFICATION STATUS
// ============================================================
router.get('/status/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      isEmailVerified: user.isEmailVerified || false
    });

  } catch (error) {
    console.error('Check verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check verification status'
    });
  }
});

module.exports = router;