const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const User = require('../models/User');
const Banner = require('../models/Banner');
const Title = require('../models/Title');
const ProfilePhoto = require('../models/ProfilePhoto');

// ===== HELPER: Sanitize input =====
function sanitizeInput(str) {
  if (!str) return '';
  return str.replace(/[<>]/g, '').trim();
}

// ===== VALIDATION RULES =====
const validateEquip = [
  body('bannerId').optional().isMongoId().withMessage('Invalid banner ID'),
  body('titleId').optional().isMongoId().withMessage('Invalid title ID'),
  body('photoId').optional().isMongoId().withMessage('Invalid photo ID')
];

const validateUsername = [
  param('username')
    .trim()
    .escape()
    .isLength({ min: 3, max: 20 })
    .withMessage('Invalid username')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username contains invalid characters')
];

const validateSearch = [
  query('q')
    .trim()
    .escape()
    .isLength({ min: 2, max: 20 })
    .withMessage('Search query must be 2-20 characters')
    .matches(/^[a-zA-Z0-9_\s]+$/)
    .withMessage('Search contains invalid characters')
];

// ===================== GET MY PROFILE (WITH FULL DATA & EDIT CAPABILITIES) =====================
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -__v')
      .populate('equipped.banner', 'gifUrl name')
      .populate('equipped.title', 'displayName name rarity')
      .populate('equipped.profilePhoto', 'imageUrl name')
      .populate({
        path: 'achievements.profilePhotos.photoId',
        model: 'ProfilePhoto'
      })
      .populate({
        path: 'achievements.banners.bannerId',
        model: 'Banner'
      })
      .populate({
        path: 'achievements.titles.titleId',
        model: 'Title'
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Cache busting headers
    const etag = `"${user.updatedAt?.getTime() || Date.now()}"`;
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('ETag', etag);

    const formattedUser = {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      stats: user.stats,
      seasonStats: user.seasonStats,
      shards: user.shards,
      totalGuesses: user.totalGuesses,
      equipped: {
        banner: user.equipped?.banner || null,
        title: user.equipped?.title || null,
        profilePhoto: user.equipped?.profilePhoto || null
      },
      achievements: {
        banners: user.achievements?.banners || [],
        titles: user.achievements?.titles || [],
        profilePhotos: user.achievements?.profilePhotos || []
      },
      updatedAt: user.updatedAt,
      createdAt: user.createdAt
    };

    res.json({
      success: true,
      user: formattedUser
    });
  } catch (error) {
    console.error('Get profile error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
});

// ===================== GET BANNERS =====================
router.get('/banners', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const allBanners = await Banner.find({ isActive: true });
    
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    const bannersWithStatus = allBanners.map(banner => {
      const isUnlocked = user.achievements.banners.some(
        b => b.bannerId.toString() === banner._id.toString()
      );
      return {
        ...banner.toObject(),
        isUnlocked,
        isEquipped: user.equipped.banner?.toString() === banner._id.toString()
      };
    });
    
    res.json({ 
      success: true, 
      banners: bannersWithStatus,
      equipped: user.equipped.banner
    });
  } catch (error) {
    console.error('Get banners error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching banners' 
    });
  }
});

// ===================== GET TITLES =====================
router.get('/titles', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const allTitles = await Title.find({ isActive: true });
    
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    const titlesWithStatus = allTitles.map(title => {
      const isUnlocked = user.achievements.titles.some(
        t => t.titleId.toString() === title._id.toString()
      );
      return {
        ...title.toObject(),
        isUnlocked,
        isEquipped: user.equipped.title?.toString() === title._id.toString()
      };
    });
    
    res.json({ 
      success: true, 
      titles: titlesWithStatus,
      equipped: user.equipped.title
    });
  } catch (error) {
    console.error('Get titles error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching titles' 
    });
  }
});

// ===================== GET PROFILE PHOTOS =====================
router.get('/photos', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const allPhotos = await ProfilePhoto.find({ isActive: true });
    
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    const photosWithStatus = allPhotos.map(photo => {
      const isUnlocked = user.achievements.profilePhotos.some(
        p => p.photoId.toString() === photo._id.toString()
      );
      return {
        ...photo.toObject(),
        isUnlocked,
        isEquipped: user.equipped.profilePhoto?.toString() === photo._id.toString()
      };
    });
    
    res.json({ 
      success: true, 
      photos: photosWithStatus,
      equipped: user.equipped.profilePhoto
    });
  } catch (error) {
    console.error('Get photos error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching profile photos' 
    });
  }
});

// ===================== GET EQUIPPED ITEMS =====================
router.get('/equipped', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('equipped.banner', 'gifUrl name')
      .populate('equipped.title', 'displayName name')
      .populate('equipped.profilePhoto', 'imageUrl name');

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.json({
      success: true,
      banner: user.equipped?.banner || null,
      title: user.equipped?.title || null,
      profilePhoto: user.equipped?.profilePhoto || null
    });
  } catch (error) {
    console.error('Get equipped error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching equipped items' 
    });
  }
});

// ===================== EQUIP BANNER =====================
router.post('/equip-banner', authMiddleware, validateEquip, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      });
    }

    const { bannerId } = req.body;

    if (!bannerId) {
      return res.status(400).json({
        success: false,
        message: 'Banner ID is required'
      });
    }

    const user = await User.findById(req.user._id);
    
    const ownsBanner = user.achievements.banners.some(
      b => b.bannerId.toString() === bannerId
    );
    
    if (!ownsBanner) {
      return res.status(403).json({ 
        success: false, 
        message: 'You don\'t own this banner' 
      });
    }
    
    const bannerExists = await Banner.findById(bannerId);
    if (!bannerExists) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }
    
    user.equipped.banner = bannerId;
    user.updatedAt = new Date();
    await user.save();

    console.log(`🖼️ ${user.username} equipped banner: ${bannerExists.name}`);
    
    res.json({ 
      success: true, 
      message: 'Banner equipped successfully!',
      banner: bannerExists,
      updatedAt: user.updatedAt
    });
  } catch (error) {
    console.error('Equip banner error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error equipping banner' 
    });
  }
});

// ===================== EQUIP TITLE =====================
router.post('/equip-title', authMiddleware, validateEquip, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      });
    }

    const { titleId } = req.body;

    if (!titleId) {
      return res.status(400).json({
        success: false,
        message: 'Title ID is required'
      });
    }

    const user = await User.findById(req.user._id);
    
    const ownsTitle = user.achievements.titles.some(
      t => t.titleId.toString() === titleId
    );
    
    if (!ownsTitle) {
      return res.status(403).json({ 
        success: false, 
        message: 'You don\'t own this title' 
      });
    }

    const titleExists = await Title.findById(titleId);
    if (!titleExists) {
      return res.status(404).json({
        success: false,
        message: 'Title not found'
      });
    }
    
    user.equipped.title = titleId;
    user.updatedAt = new Date();
    await user.save();

    console.log(`🏷️ ${user.username} equipped title: ${titleExists.name}`);
    
    res.json({ 
      success: true, 
      message: 'Title equipped successfully!',
      title: titleExists,
      updatedAt: user.updatedAt
    });
  } catch (error) {
    console.error('Equip title error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error equipping title' 
    });
  }
});

// ===================== EQUIP PROFILE PHOTO =====================
router.post('/equip-photo', authMiddleware, validateEquip, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      });
    }

    const { photoId } = req.body;

    if (!photoId) {
      return res.status(400).json({
        success: false,
        message: 'Photo ID is required'
      });
    }

    const user = await User.findById(req.user._id);
    
    const ownsPhoto = user.achievements.profilePhotos.some(
      p => p.photoId.toString() === photoId
    );
    
    if (!ownsPhoto) {
      return res.status(403).json({ 
        success: false, 
        message: 'You don\'t own this photo' 
      });
    }

    const photoExists = await ProfilePhoto.findById(photoId);
    if (!photoExists) {
      return res.status(404).json({
        success: false,
        message: 'Profile photo not found'
      });
    }
    
    user.equipped.profilePhoto = photoId;
    user.updatedAt = new Date();
    await user.save();

    console.log(`📸 ${user.username} equipped profile photo: ${photoExists.name}`);
    
    res.json({ 
      success: true, 
      message: 'Profile photo equipped successfully!',
      photo: photoExists,
      updatedAt: user.updatedAt
    });
  } catch (error) {
    console.error('Equip photo error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error equipping profile photo' 
    });
  }
});

// ===================== GET PUBLIC PROFILE (READ-ONLY, SHOWS TOP 10 PHOTOS) =====================
router.get('/public/:username', validateUsername, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      });
    }

    const { username } = req.params;
    const sanitizedUsername = sanitizeInput(username);
    
    const user = await User.findOne({ username: sanitizedUsername })
      .select('-password -email -__v')
      .populate('equipped.banner', 'gifUrl name')
      .populate('equipped.title', 'displayName name rarity')
      .populate('equipped.profilePhoto', 'imageUrl name')
      .populate({
        path: 'achievements.profilePhotos.photoId',
        model: 'ProfilePhoto'
      })
      .populate({
        path: 'achievements.banners.bannerId',
        model: 'Banner'
      })
      .populate({
        path: 'achievements.titles.titleId',
        model: 'Title'
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('Pragma', 'cache');
    res.setHeader('Expires', new Date(Date.now() + 300000).toUTCString());

    // ===== FORMAT PUBLIC PROFILE WITH ACHIEVEMENTS =====
    const publicProfile = {
      username: user.username,
      stats: user.stats,
      totalGuesses: user.totalGuesses || 0,
      shards: user.shards || 0,
      role: user.role,
      equipped: {
        banner: user.equipped?.banner || null,
        title: user.equipped?.title || null,
        profilePhoto: user.equipped?.profilePhoto || null
      },
      achievements: {
        banners: user.achievements?.banners || [],
        titles: user.achievements?.titles || [],
        profilePhotos: user.achievements?.profilePhotos || []
      },
      createdAt: user.createdAt
    };

    res.json({
      success: true,
      user: publicProfile
    });
  } catch (error) {
    console.error('Get public profile error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching user profile'
    });
  }
});

// ===================== ✅ FIXED: SEARCH USERS (with _id) =====================
router.get('/search', authMiddleware, validateSearch, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      });
    }

    const { q } = req.query;
    const sanitizedQuery = sanitizeInput(q);
    
    if (!sanitizedQuery || sanitizedQuery.length < 2) {
      return res.json({
        success: true,
        users: []
      });
    }

    // ✅ FIXED: Include _id in search results
    const users = await User.find({
      username: { $regex: sanitizedQuery, $options: 'i' },
      _id: { $ne: req.user._id }
    })
    .select('_id username stats shards equipped.profilePhoto')
    .populate('equipped.profilePhoto', 'imageUrl')
    .limit(10);

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const sanitizedUsers = users.map(user => ({
      _id: user._id,
      username: user.username,
      stats: user.stats,
      shards: user.shards,
      profilePhoto: user.equipped?.profilePhoto || null
    }));

    res.json({
      success: true,
      users: sanitizedUsers,
      count: sanitizedUsers.length
    });
  } catch (error) {
    console.error('Search users error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error searching users'
    });
  }
});

// ===================== 🃏 GET USER CARDS =====================
router.get('/cards', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const cards = user.cards || [];
    
    // Sort by power level (highest first)
    const sortedCards = cards.sort((a, b) => b.powerLevel - a.powerLevel);
    
    // Get character details for each card
    const cardsWithDetails = sortedCards.map(card => ({
      characterId: card.characterId,
      characterName: card.characterName,
      powerLevel: card.powerLevel,
      image: card.image || '',
      unlockedAt: card.unlockedAt,
      stolenFrom: card.stolenFrom,
      stolenAt: card.stolenAt
    }));

    res.json({
      success: true,
      cards: cardsWithDetails,
      count: cardsWithDetails.length  // ✅ COUNT ADDED
    });
  } catch (error) {
    console.error('Get cards error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cards'
    });
  }
});

module.exports = router;