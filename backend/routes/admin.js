const express = require('express');
const { body, param, validationResult } = require('express-validator');
const router = express.Router();
const { adminMiddleware } = require('../middleware/auth');
const Character = require('../models/Character');
const User = require('../models/User');
const GameSession = require('../models/GameSession');
const Banner = require('../models/Banner');
const Title = require('../models/Title');
const ProfilePhoto = require('../models/ProfilePhoto');

// ===== HELPER: Sanitize input =====
function sanitizeInput(str) {
  if (!str) return '';
  return str.replace(/[<>]/g, '').trim();
}

// ===== VALIDATION RULES =====
const validateCharacter = [
  body('name').trim().escape().isLength({ min: 1, max: 100 }).withMessage('Character name required'),
  body('anime').trim().escape().isLength({ min: 1, max: 100 }).withMessage('Anime name required'),
  body('description').trim().escape().isLength({ min: 1, max: 2000 }).withMessage('Description required')
];

const validateBanner = [
  body('name').trim().escape().isLength({ min: 1, max: 100 }).withMessage('Banner name required'),
  body('gifUrl').trim().escape().isURL().withMessage('Valid GIF URL required')
];

const validateTitle = [
  body('name').trim().escape().isLength({ min: 1, max: 100 }).withMessage('Title name required'),
  body('displayName').trim().escape().isLength({ min: 1, max: 50 }).withMessage('Display name required')
];

const validateProfilePhoto = [
  body('name').trim().escape().isLength({ min: 1, max: 100 }).withMessage('Photo name required'),
  body('imageUrl').trim().escape().isURL().withMessage('Valid image URL required')
];

const validateId = [
  param('id').isMongoId().withMessage('Invalid ID format')
];

// ===== CHARACTER CRUD =====
router.get('/characters', adminMiddleware, async (req, res) => {
  try {
    const characters = await Character.find()
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });
    
    res.json({ 
      success: true, 
      characters,
      count: characters.length
    });
  } catch (error) {
    console.error('Admin get characters error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching characters' 
    });
  }
});

router.post('/characters', adminMiddleware, validateCharacter, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      });
    }

    // Sanitize all character data
    const characterData = {
      ...req.body,
      name: sanitizeInput(req.body.name),
      anime: sanitizeInput(req.body.anime),
      description: sanitizeInput(req.body.description),
      createdBy: req.user._id
    };

    const character = new Character(characterData);
    await character.save();

    console.log(`📝 Admin ${req.user.username} created character: ${character.name}`);

    res.status(201).json({ 
      success: true, 
      character,
      message: 'Character created successfully'
    });
  } catch (error) {
    console.error('Admin create character error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating character' 
    });
  }
});

router.put('/characters/:id', adminMiddleware, validateId, validateCharacter, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      });
    }

    // Sanitize update data
    const updateData = { ...req.body };
    if (updateData.name) updateData.name = sanitizeInput(updateData.name);
    if (updateData.anime) updateData.anime = sanitizeInput(updateData.anime);
    if (updateData.description) updateData.description = sanitizeInput(updateData.description);

    const character = await Character.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!character) {
      return res.status(404).json({ 
        success: false, 
        message: 'Character not found' 
      });
    }

    console.log(`📝 Admin ${req.user.username} updated character: ${character.name}`);

    res.json({ 
      success: true, 
      character,
      message: 'Character updated successfully'
    });
  } catch (error) {
    console.error('Admin update character error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating character' 
    });
  }
});

router.delete('/characters/:id', adminMiddleware, validateId, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      });
    }

    const character = await Character.findByIdAndDelete(req.params.id);
    
    if (!character) {
      return res.status(404).json({ 
        success: false, 
        message: 'Character not found' 
      });
    }

    console.log(`🗑️ Admin ${req.user.username} deleted character: ${character.name}`);

    res.json({ 
      success: true, 
      message: 'Character deleted successfully' 
    });
  } catch (error) {
    console.error('Admin delete character error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting character' 
    });
  }
});

// ===== BANNER CRUD =====
router.get('/banners', adminMiddleware, async (req, res) => {
  try {
    const banners = await Banner.find().sort({ createdAt: -1 });
    res.json({ success: true, banners });
  } catch (error) {
    console.error('Admin get banners error:', error.message);
    res.status(500).json({ success: false, message: 'Error fetching banners' });
  }
});

router.post('/banners', adminMiddleware, validateBanner, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      });
    }

    const bannerData = {
      ...req.body,
      name: sanitizeInput(req.body.name),
      gifUrl: req.body.gifUrl.trim()
    };

    const banner = new Banner(bannerData);
    await banner.save();

    console.log(`📝 Admin ${req.user.username} created banner: ${banner.name}`);

    res.status(201).json({ 
      success: true, 
      banner,
      message: 'Banner created successfully'
    });
  } catch (error) {
    console.error('Admin create banner error:', error.message);
    res.status(500).json({ success: false, message: 'Error creating banner' });
  }
});

router.put('/banners/:id', adminMiddleware, validateId, validateBanner, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      });
    }

    const updateData = { ...req.body };
    if (updateData.name) updateData.name = sanitizeInput(updateData.name);
    if (updateData.gifUrl) updateData.gifUrl = updateData.gifUrl.trim();

    const banner = await Banner.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!banner) {
      return res.status(404).json({ 
        success: false, 
        message: 'Banner not found' 
      });
    }

    console.log(`📝 Admin ${req.user.username} updated banner: ${banner.name}`);

    res.json({ 
      success: true, 
      banner,
      message: 'Banner updated successfully'
    });
  } catch (error) {
    console.error('Admin update banner error:', error.message);
    res.status(500).json({ success: false, message: 'Error updating banner' });
  }
});

router.delete('/banners/:id', adminMiddleware, validateId, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      });
    }

    const banner = await Banner.findByIdAndDelete(req.params.id);
    
    if (!banner) {
      return res.status(404).json({ 
        success: false, 
        message: 'Banner not found' 
      });
    }

    console.log(`🗑️ Admin ${req.user.username} deleted banner: ${banner.name}`);

    res.json({ 
      success: true, 
      message: 'Banner deleted successfully' 
    });
  } catch (error) {
    console.error('Admin delete banner error:', error.message);
    res.status(500).json({ success: false, message: 'Error deleting banner' });
  }
});

// ===== TITLE CRUD =====
router.get('/titles', adminMiddleware, async (req, res) => {
  try {
    const titles = await Title.find().sort({ createdAt: -1 });
    res.json({ success: true, titles });
  } catch (error) {
    console.error('Admin get titles error:', error.message);
    res.status(500).json({ success: false, message: 'Error fetching titles' });
  }
});

router.post('/titles', adminMiddleware, validateTitle, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      });
    }

    const titleData = {
      ...req.body,
      name: sanitizeInput(req.body.name),
      displayName: sanitizeInput(req.body.displayName)
    };

    const title = new Title(titleData);
    await title.save();

    console.log(`📝 Admin ${req.user.username} created title: ${title.name}`);

    res.status(201).json({ 
      success: true, 
      title,
      message: 'Title created successfully'
    });
  } catch (error) {
    console.error('Admin create title error:', error.message);
    res.status(500).json({ success: false, message: 'Error creating title' });
  }
});

router.put('/titles/:id', adminMiddleware, validateId, validateTitle, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      });
    }

    const updateData = { ...req.body };
    if (updateData.name) updateData.name = sanitizeInput(updateData.name);
    if (updateData.displayName) updateData.displayName = sanitizeInput(updateData.displayName);

    const title = await Title.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!title) {
      return res.status(404).json({ 
        success: false, 
        message: 'Title not found' 
      });
    }

    console.log(`📝 Admin ${req.user.username} updated title: ${title.name}`);

    res.json({ 
      success: true, 
      title,
      message: 'Title updated successfully'
    });
  } catch (error) {
    console.error('Admin update title error:', error.message);
    res.status(500).json({ success: false, message: 'Error updating title' });
  }
});

router.delete('/titles/:id', adminMiddleware, validateId, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      });
    }

    const title = await Title.findByIdAndDelete(req.params.id);
    
    if (!title) {
      return res.status(404).json({ 
        success: false, 
        message: 'Title not found' 
      });
    }

    console.log(`🗑️ Admin ${req.user.username} deleted title: ${title.name}`);

    res.json({ 
      success: true, 
      message: 'Title deleted successfully' 
    });
  } catch (error) {
    console.error('Admin delete title error:', error.message);
    res.status(500).json({ success: false, message: 'Error deleting title' });
  }
});

// ===== PROFILE PHOTO CRUD =====
router.get('/profile-photos', adminMiddleware, async (req, res) => {
  try {
    const photos = await ProfilePhoto.find().sort({ createdAt: -1 });
    res.json({ success: true, photos });
  } catch (error) {
    console.error('Admin get profile photos error:', error.message);
    res.status(500).json({ success: false, message: 'Error fetching profile photos' });
  }
});

router.post('/profile-photos', adminMiddleware, validateProfilePhoto, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      });
    }

    const photoData = {
      ...req.body,
      name: sanitizeInput(req.body.name),
      imageUrl: req.body.imageUrl.trim()
    };

    const photo = new ProfilePhoto(photoData);
    await photo.save();

    console.log(`📝 Admin ${req.user.username} created profile photo: ${photo.name}`);

    res.status(201).json({ 
      success: true, 
      photo,
      message: 'Profile photo created successfully'
    });
  } catch (error) {
    console.error('Admin create profile photo error:', error.message);
    res.status(500).json({ success: false, message: 'Error creating profile photo' });
  }
});

router.put('/profile-photos/:id', adminMiddleware, validateId, validateProfilePhoto, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      });
    }

    const updateData = { ...req.body };
    if (updateData.name) updateData.name = sanitizeInput(updateData.name);
    if (updateData.imageUrl) updateData.imageUrl = updateData.imageUrl.trim();

    const photo = await ProfilePhoto.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!photo) {
      return res.status(404).json({ 
        success: false, 
        message: 'Profile photo not found' 
      });
    }

    console.log(`📝 Admin ${req.user.username} updated profile photo: ${photo.name}`);

    res.json({ 
      success: true, 
      photo,
      message: 'Profile photo updated successfully'
    });
  } catch (error) {
    console.error('Admin update profile photo error:', error.message);
    res.status(500).json({ success: false, message: 'Error updating profile photo' });
  }
});

router.delete('/profile-photos/:id', adminMiddleware, validateId, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      });
    }

    const photo = await ProfilePhoto.findByIdAndDelete(req.params.id);
    
    if (!photo) {
      return res.status(404).json({ 
        success: false, 
        message: 'Profile photo not found' 
      });
    }

    console.log(`🗑️ Admin ${req.user.username} deleted profile photo: ${photo.name}`);

    res.json({ 
      success: true, 
      message: 'Profile photo deleted successfully' 
    });
  } catch (error) {
    console.error('Admin delete profile photo error:', error.message);
    res.status(500).json({ success: false, message: 'Error deleting profile photo' });
  }
});

// ===== USERS & STATS =====
router.get('/users', adminMiddleware, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password -__v')
      .sort({ createdAt: -1 });

    // Sanitize user data (remove sensitive fields)
    const sanitizedUsers = users.map(user => ({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      stats: user.stats,
      shards: user.shards,
      createdAt: user.createdAt,
      equipped: user.equipped
    }));

    res.json({ 
      success: true, 
      users: sanitizedUsers,
      count: sanitizedUsers.length
    });
  } catch (error) {
    console.error('Admin get users error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching users' 
    });
  }
});

router.get('/stats', adminMiddleware, async (req, res) => {
  try {
    const [totalGames, wonGames, totalCharacters, totalUsers] = await Promise.all([
      GameSession.countDocuments(),
      GameSession.countDocuments({ status: 'won' }),
      Character.countDocuments(),
      User.countDocuments()
    ]);

    const winRate = totalGames > 0 ? ((wonGames / totalGames) * 100).toFixed(1) : 0;

    // Top players by win streak
    const topPlayers = await User.find()
      .select('username stats equipped.profilePhoto')
      .populate('equipped.profilePhoto', 'imageUrl')
      .sort({ 'stats.winStreak': -1 })
      .limit(10);

    const sanitizedTopPlayers = topPlayers.map(player => ({
      username: player.username,
      stats: player.stats,
      profilePhoto: player.equipped?.profilePhoto || null
    }));

    res.json({
      success: true,
      stats: {
        totalGames,
        wonGames,
        winRate: parseFloat(winRate),
        totalCharacters,
        totalUsers
      },
      topPlayers: sanitizedTopPlayers
    });
  } catch (error) {
    console.error('Admin get stats error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching stats' 
    });
  }
});

module.exports = router;