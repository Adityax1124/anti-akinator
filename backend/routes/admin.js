const express = require('express');
const router = express.Router();
const { adminMiddleware } = require('../middleware/auth');
const Character = require('../models/Character');
const User = require('../models/User');
const GameSession = require('../models/GameSession');
const Banner = require('../models/Banner');
const Title = require('../models/Title');
const ProfilePhoto = require('../models/ProfilePhoto');
const ShopItem = require('../models/ShopItem');

// ===== HELPER: Sanitize input =====
function sanitizeInput(str) {
  if (!str) return '';
  return str.replace(/[<>]/g, '').trim();
}

// ============================================================
// SEASON RESET (ADMIN ONLY)
// ============================================================
router.post('/reset-season', adminMiddleware, async (req, res) => {
  try {
    const { checkAndResetSeason, getCurrentSeason } = require('../utils/seasonUtils');
    
    const currentSeason = getCurrentSeason();
    console.log(`🔧 Admin ${req.user.username} triggered manual season reset...`);
    
    const resetTriggered = await checkAndResetSeason();
    
    if (resetTriggered) {
      res.json({
        success: true,
        message: `✅ Season reset completed successfully! Current season: ${currentSeason}`,
        season: currentSeason,
        reset: true
      });
    } else {
      res.json({
        success: true,
        message: `ℹ️ No reset needed. Current season: ${currentSeason} is already active.`,
        season: currentSeason,
        reset: false
      });
    }
  } catch (error) {
    console.error('Admin manual reset error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error resetting season: ' + error.message
    });
  }
});

// ============================================================
// CHARACTER CRUD (WITH POWER LEVEL)
// ============================================================
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

router.post('/characters', adminMiddleware, async (req, res) => {
  try {
    const characterData = {
      ...req.body,
      name: sanitizeInput(req.body.name),
      anime: sanitizeInput(req.body.anime),
      description: sanitizeInput(req.body.description),
      powerLevel: parseFloat(req.body.powerLevel) || 25, // ✅ ADDED
      createdBy: req.user._id
    };

    const character = new Character(characterData);
    await character.save();

    console.log(`📝 Admin ${req.user.username} created character: ${character.name} (Power: ${character.powerLevel})`);

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

router.put('/characters/:id', adminMiddleware, async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (updateData.name) updateData.name = sanitizeInput(updateData.name);
    if (updateData.anime) updateData.anime = sanitizeInput(updateData.anime);
    if (updateData.description) updateData.description = sanitizeInput(updateData.description);
    if (updateData.powerLevel) updateData.powerLevel = Number(updateData.powerLevel); // ✅ ADDED

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

router.delete('/characters/:id', adminMiddleware, async (req, res) => {
  try {
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

// ============================================================
// BANNER CRUD
// ============================================================
router.get('/banners', adminMiddleware, async (req, res) => {
  try {
    const banners = await Banner.find().sort({ createdAt: -1 });
    res.json({ success: true, banners });
  } catch (error) {
    console.error('Admin get banners error:', error.message);
    res.status(500).json({ success: false, message: 'Error fetching banners' });
  }
});

router.post('/banners', adminMiddleware, async (req, res) => {
  try {
    console.log('📥 Creating banner with data:', JSON.stringify(req.body, null, 2));

    const existingBanner = await Banner.findOne({ 
      name: { $regex: new RegExp(`^${req.body.name}$`, 'i') } 
    });
    
    if (existingBanner) {
      console.log('❌ Banner already exists:', req.body.name);
      return res.status(400).json({
        success: false,
        message: `Banner "${req.body.name}" already exists`
      });
    }

    let unlockCondition = req.body.unlockCondition || { totalGuesses: 1 };
    
    if (req.body.unlockType === 'total_guesses') {
      unlockCondition = {
        totalGuesses: Number(unlockCondition.totalGuesses) || 1
      };
    }

    const bannerData = {
      name: sanitizeInput(req.body.name),
      gifUrl: req.body.gifUrl ? req.body.gifUrl.trim() : '',
      description: req.body.description || '',
      unlockType: req.body.unlockType || 'total_guesses',
      unlockCondition: unlockCondition,
      category: req.body.category || 'shop',
      rarity: req.body.rarity || 'Rare',
      isActive: req.body.isActive !== undefined ? req.body.isActive : true
    };

    console.log('📤 Banner data to save:', JSON.stringify(bannerData, null, 2));

    const banner = new Banner(bannerData);
    await banner.save();

    console.log(`📝 Admin ${req.user.username} created banner: ${banner.name}`);

    res.status(201).json({ 
      success: true, 
      banner,
      message: 'Banner created successfully'
    });
  } catch (error) {
    console.error('❌ Admin create banner error:', error.message);
    console.error('❌ Full error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = error.errors[key].message;
      });
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: `Banner with this name already exists`
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Error creating banner: ' + error.message,
      error: error.message
    });
  }
});

// ============================================================
// TITLE CRUD
// ============================================================
router.get('/titles', adminMiddleware, async (req, res) => {
  try {
    const titles = await Title.find().sort({ createdAt: -1 });
    res.json({ success: true, titles });
  } catch (error) {
    console.error('Admin get titles error:', error.message);
    res.status(500).json({ success: false, message: 'Error fetching titles' });
  }
});

router.post('/titles', adminMiddleware, async (req, res) => {
  try {
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

router.put('/titles/:id', adminMiddleware, async (req, res) => {
  try {
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

router.delete('/titles/:id', adminMiddleware, async (req, res) => {
  try {
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

// ============================================================
// PROFILE PHOTO CRUD
// ============================================================
router.get('/profile-photos', adminMiddleware, async (req, res) => {
  try {
    const photos = await ProfilePhoto.find().sort({ createdAt: -1 });
    res.json({ success: true, photos });
  } catch (error) {
    console.error('Admin get profile photos error:', error.message);
    res.status(500).json({ success: false, message: 'Error fetching profile photos' });
  }
});

router.post('/profile-photos', adminMiddleware, async (req, res) => {
  try {
    const photoData = {
      ...req.body,
      name: sanitizeInput(req.body.name),
      imageUrl: req.body.imageUrl ? req.body.imageUrl.trim() : ''
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

router.put('/profile-photos/:id', adminMiddleware, async (req, res) => {
  try {
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

router.delete('/profile-photos/:id', adminMiddleware, async (req, res) => {
  try {
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

// ============================================================
// SHOP ITEMS CRUD (ADMIN ONLY)
// ============================================================
router.get('/shop-items', adminMiddleware, async (req, res) => {
  try {
    const shopItems = await ShopItem.find()
      .populate('itemId')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      items: shopItems
    });
  } catch (error) {
    console.error('Get shop items error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching shop items'
    });
  }
});

router.post('/shop-items', adminMiddleware, async (req, res) => {
  try {
    const { itemType, itemId, price, isActive, isLimited, startDate, endDate } = req.body;

    if (!itemType || !itemId || !price) {
      return res.status(400).json({
        success: false,
        message: 'itemType, itemId, and price are required'
      });
    }

    const existing = await ShopItem.findOne({ itemId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'This item is already in the shop'
      });
    }

    const shopItem = new ShopItem({
      itemType,
      itemId,
      price: Number(price),
      isActive: isActive !== undefined ? isActive : true,
      isLimited: isLimited || false,
      startDate: startDate || null,
      endDate: endDate || null
    });

    await shopItem.save();

    console.log(`🛒 Admin ${req.user.username} added ${itemType} to shop: ${shopItem._id}`);

    res.status(201).json({
      success: true,
      message: 'Item added to shop successfully!',
      item: shopItem
    });
  } catch (error) {
    console.error('Add shop item error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error adding item to shop'
    });
  }
});

router.put('/shop-items/:id', adminMiddleware, async (req, res) => {
  try {
    const { price, isActive, isLimited, startDate, endDate } = req.body;

    const shopItem = await ShopItem.findByIdAndUpdate(
      req.params.id,
      {
        price: Number(price),
        isActive,
        isLimited,
        startDate: startDate || null,
        endDate: endDate || null
      },
      { new: true }
    );

    if (!shopItem) {
      return res.status(404).json({
        success: false,
        message: 'Shop item not found'
      });
    }

    console.log(`🛒 Admin ${req.user.username} updated shop item: ${shopItem._id}`);

    res.json({
      success: true,
      message: 'Shop item updated successfully!',
      item: shopItem
    });
  } catch (error) {
    console.error('Update shop item error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error updating shop item'
    });
  }
});

router.delete('/shop-items/:id', adminMiddleware, async (req, res) => {
  try {
    const shopItem = await ShopItem.findByIdAndDelete(req.params.id);
    
    if (!shopItem) {
      return res.status(404).json({
        success: false,
        message: 'Shop item not found'
      });
    }

    console.log(`🛒 Admin ${req.user.username} removed shop item: ${shopItem._id}`);

    res.json({
      success: true,
      message: 'Shop item removed successfully!'
    });
  } catch (error) {
    console.error('Delete shop item error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error removing shop item'
    });
  }
});

// ============================================================
// USERS & STATS
// ============================================================
router.get('/users', adminMiddleware, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password -__v')
      .sort({ createdAt: -1 });

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