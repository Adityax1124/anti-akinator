const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const User = require('../models/User');
const Banner = require('../models/Banner');
const Title = require('../models/Title');
const ProfilePhoto = require('../models/ProfilePhoto');

// Get all banners for user
router.get('/banners', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const allBanners = await Banner.find({ isActive: true });
    
    // Mark which ones are unlocked
    const bannersWithStatus = allBanners.map(banner => {
      const isUnlocked = user.achievements.banners.some(
        b => b.bannerId.toString() === banner._id.toString()
      );
      return {
        ...banner.toObject(),
        isUnlocked
      };
    });
    
    res.json({ success: true, banners: bannersWithStatus });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all titles for user
router.get('/titles', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const allTitles = await Title.find({ isActive: true });
    
    const titlesWithStatus = allTitles.map(title => {
      const isUnlocked = user.achievements.titles.some(
        t => t.titleId.toString() === title._id.toString()
      );
      return {
        ...title.toObject(),
        isUnlocked
      };
    });
    
    res.json({ success: true, titles: titlesWithStatus });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all profile photos for user
router.get('/photos', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const allPhotos = await ProfilePhoto.find({ isActive: true });
    
    const photosWithStatus = allPhotos.map(photo => {
      const isUnlocked = user.achievements.profilePhotos.some(
        p => p.photoId.toString() === photo._id.toString()
      );
      return {
        ...photo.toObject(),
        isUnlocked
      };
    });
    
    res.json({ success: true, photos: photosWithStatus });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get equipped items
router.get('/equipped', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      banner: user.equipped.banner,
      title: user.equipped.title,
      profilePhoto: user.equipped.profilePhoto
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Equip banner
router.post('/equip-banner', authMiddleware, async (req, res) => {
  try {
    const { bannerId } = req.body;
    const user = await User.findById(req.user._id);
    
    // Check if user owns this banner
    const ownsBanner = user.achievements.banners.some(
      b => b.bannerId.toString() === bannerId
    );
    
    if (!ownsBanner) {
      return res.status(403).json({ success: false, message: 'You don\'t own this banner' });
    }
    
    user.equipped.banner = bannerId;
    await user.save();
    
    res.json({ success: true, message: 'Banner equipped!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add this route to backend/routes/profile.js

// ===== GET PUBLIC PROFILE (for viewing other users) =====
router.get('/public/:username', authMiddleware, async (req, res) => {
  try {
    const { username } = req.params;
    
    const user = await User.findOne({ username })
      .select('-password -email -__v')
      .populate('equipped.banner', 'gifUrl name')
      .populate('equipped.title', 'displayName name rarity')
      .populate('equipped.profilePhoto', 'imageUrl name');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Don't show sensitive data
    const publicProfile = {
      username: user.username,
      stats: user.stats,
      totalGuesses: user.totalGuesses || 0,
      equipped: user.equipped,
      createdAt: user.createdAt,
      role: user.role
    };

    res.json({
      success: true,
      user: publicProfile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ===== SEARCH USERS =====
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json({
        success: true,
        users: []
      });
    }

    const users = await User.find({
      username: { $regex: q, $options: 'i' },
      _id: { $ne: req.user._id } // exclude self
    })
    .select('username stats equipped.profilePhoto')
    .populate('equipped.profilePhoto', 'imageUrl')
    .limit(10);

    res.json({
      success: true,
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Equip title
router.post('/equip-title', authMiddleware, async (req, res) => {
  try {
    const { titleId } = req.body;
    const user = await User.findById(req.user._id);
    
    const ownsTitle = user.achievements.titles.some(
      t => t.titleId.toString() === titleId
    );
    
    if (!ownsTitle) {
      return res.status(403).json({ success: false, message: 'You don\'t own this title' });
    }
    
    user.equipped.title = titleId;
    await user.save();
    
    res.json({ success: true, message: 'Title equipped!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Equip profile photo
router.post('/equip-photo', authMiddleware, async (req, res) => {
  try {
    const { photoId } = req.body;
    const user = await User.findById(req.user._id);
    
    const ownsPhoto = user.achievements.profilePhotos.some(
      p => p.photoId.toString() === photoId
    );
    
    if (!ownsPhoto) {
      return res.status(403).json({ success: false, message: 'You don\'t own this photo' });
    }
    
    user.equipped.profilePhoto = photoId;
    await user.save();
    
    res.json({ success: true, message: 'Profile photo equipped!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;