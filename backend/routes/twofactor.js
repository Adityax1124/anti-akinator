const express = require('express');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { authMiddleware } = require('../middleware/auth');
const User = require('../models/User');
const TwoFactor = require('../models/TwoFactor');
const router = express.Router();

// ============================================================
// GENERATE 2FA SECRET & QR CODE
// ============================================================
router.post('/setup', authMiddleware, async (req, res) => {
  try {
    const user = req.user;

    // Check if user already has 2FA
    const existing2FA = await TwoFactor.findOne({ user: user._id });
    if (existing2FA && existing2FA.enabled) {
      return res.status(400).json({
        success: false,
        message: '2FA is already enabled for this account'
      });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Anti-Akinator (${user.email})`,
      length: 20,
      issuer: 'Anti-Akinator'
    });

    // Save secret to database
    await TwoFactor.findOneAndUpdate(
      { user: user._id },
      {
        user: user._id,
        secret: secret.base32,
        enabled: false,
        backupCodes: []
      },
      { upsert: true, new: true }
    );

    // Generate QR Code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      success: true,
      message: '2FA setup initiated',
      secret: secret.base32,
      qrCode: qrCodeUrl,
      otpauthUrl: secret.otpauth_url
    });

  } catch (error) {
    console.error('2FA Setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting up 2FA'
    });
  }
});

// ============================================================
// VERIFY 2FA CODE & ENABLE
// ============================================================
router.post('/verify', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    const user = req.user;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Verification code is required'
      });
    }

    // Get 2FA setup
    const twoFactor = await TwoFactor.findOne({ user: user._id });
    if (!twoFactor) {
      return res.status(400).json({
        success: false,
        message: '2FA not set up for this account'
      });
    }

    // Verify the code
    const verified = speakeasy.totp.verify({
      secret: twoFactor.secret,
      encoding: 'base32',
      token: code,
      window: 2 // Allow 2 steps before/after for time drift
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code. Please try again.'
      });
    }

    // Generate backup codes
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      const code = speakeasy.generateSecret({ length: 6 }).base32;
      backupCodes.push({ code, used: false });
    }

    // Enable 2FA
    twoFactor.enabled = true;
    twoFactor.backupCodes = backupCodes;
    await twoFactor.save();

    // Return backup codes (show only once!)
    res.json({
      success: true,
      message: '2FA enabled successfully!',
      backupCodes: backupCodes.map(b => b.code)
    });

  } catch (error) {
    console.error('2FA Verify error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying 2FA code'
    });
  }
});

// ============================================================
// DISABLE 2FA
// ============================================================
router.post('/disable', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    const user = req.user;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Verification code is required'
      });
    }

    const twoFactor = await TwoFactor.findOne({ user: user._id });
    if (!twoFactor || !twoFactor.enabled) {
      return res.status(400).json({
        success: false,
        message: '2FA is not enabled for this account'
      });
    }

    // Verify the code before disabling
    const verified = speakeasy.totp.verify({
      secret: twoFactor.secret,
      encoding: 'base32',
      token: code,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

    twoFactor.enabled = false;
    await twoFactor.save();

    res.json({
      success: true,
      message: '2FA disabled successfully'
    });

  } catch (error) {
    console.error('2FA Disable error:', error);
    res.status(500).json({
      success: false,
      message: 'Error disabling 2FA'
    });
  }
});

// ============================================================
// VERIFY 2FA DURING LOGIN
// ============================================================
router.post('/verify-login', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email and code are required'
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if 2FA is enabled
    const twoFactor = await TwoFactor.findOne({ user: user._id });
    if (!twoFactor || !twoFactor.enabled) {
      return res.status(400).json({
        success: false,
        message: '2FA is not enabled for this account'
      });
    }

    // Check if it's a backup code
    let isBackupCode = false;
    let backupCodeIndex = -1;

    for (let i = 0; i < twoFactor.backupCodes.length; i++) {
      if (twoFactor.backupCodes[i].code === code && !twoFactor.backupCodes[i].used) {
        isBackupCode = true;
        backupCodeIndex = i;
        break;
      }
    }

    let verified = false;

    if (isBackupCode) {
      // Mark backup code as used
      twoFactor.backupCodes[backupCodeIndex].used = true;
      await twoFactor.save();
      verified = true;
    } else {
      // Verify TOTP code
      verified = speakeasy.totp.verify({
        secret: twoFactor.secret,
        encoding: 'base32',
        token: code,
        window: 2
      });
    }

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid code. Please try again.'
      });
    }

    // Generate JWT token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: '2FA verification successful!',
      token: token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        stats: user.stats
      }
    });

  } catch (error) {
    console.error('2FA Login verify error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying 2FA code'
    });
  }
});

// ============================================================
// GET 2FA STATUS
// ============================================================
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const twoFactor = await TwoFactor.findOne({ user: req.user._id });

    res.json({
      success: true,
      enabled: twoFactor ? twoFactor.enabled : false,
      hasBackupCodes: twoFactor ? twoFactor.backupCodes.filter(b => !b.used).length > 0 : false,
      backupCodesLeft: twoFactor ? twoFactor.backupCodes.filter(b => !b.used).length : 0
    });

  } catch (error) {
    console.error('2FA Status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching 2FA status'
    });
  }
});

// ============================================================
// GENERATE NEW BACKUP CODES
// ============================================================
router.post('/backup-codes', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    const user = req.user;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Verification code is required'
      });
    }

    const twoFactor = await TwoFactor.findOne({ user: user._id });
    if (!twoFactor || !twoFactor.enabled) {
      return res.status(400).json({
        success: false,
        message: '2FA is not enabled for this account'
      });
    }

    // Verify current code
    const verified = speakeasy.totp.verify({
      secret: twoFactor.secret,
      encoding: 'base32',
      token: code,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

    // Generate new backup codes
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      const code = speakeasy.generateSecret({ length: 6 }).base32;
      backupCodes.push({ code, used: false });
    }

    twoFactor.backupCodes = backupCodes;
    await twoFactor.save();

    res.json({
      success: true,
      message: 'New backup codes generated!',
      backupCodes: backupCodes.map(b => b.code)
    });

  } catch (error) {
    console.error('Backup codes error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating backup codes'
    });
  }
});

module.exports = router;