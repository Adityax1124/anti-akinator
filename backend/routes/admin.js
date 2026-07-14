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

// ✅ NEW: Import admin controller functions
const {
  sendGift
} = require('../controllers/adminController');

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
// CHARACTER CRUD (WITH COMPLETE DATA)
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
    // ✅ COMPLETE CHARACTER DATA
    const characterData = {
      // Basic Info
      name: sanitizeInput(req.body.name),
      anime: sanitizeInput(req.body.anime),
      image: req.body.image || '',
      description: sanitizeInput(req.body.description) || '',
      crucialHint: sanitizeInput(req.body.crucialHint) || '',
      
      // Appearance
      appearance: {
        hairColor: req.body.appearance?.hairColor || 'Unknown',
        eyeColor: req.body.appearance?.eyeColor || 'Unknown',
        skinColor: req.body.appearance?.skinColor || 'Unknown',
        height: req.body.appearance?.height || 'Unknown',
        build: req.body.appearance?.build || 'Unknown',
        distinctiveFeatures: req.body.appearance?.distinctiveFeatures || 'Unknown',
        clothing: req.body.appearance?.clothing || 'Unknown',
        accessories: req.body.appearance?.accessories || 'Unknown'
      },
      
      // Identity
      identity: {
        gender: req.body.identity?.gender || 'Unknown',
        age: req.body.identity?.age || 'Unknown',
        birthday: req.body.identity?.birthday || 'Unknown',
        species: req.body.identity?.species || 'Unknown',
        nationality: req.body.identity?.nationality || 'Unknown',
        occupation: req.body.identity?.occupation || 'Unknown'
      },
      
      // Status
      status: {
        isAlive: req.body.status?.isAlive !== undefined ? req.body.status.isAlive : true,
        isDeceased: req.body.status?.isDeceased || false,
        deathDetails: req.body.status?.deathDetails || 'Unknown',
        currentStatus: req.body.status?.currentStatus || 'Alive'
      },
      
      // Personality
      personality: {
        traits: req.body.personality?.traits || [],
        likes: req.body.personality?.likes || [],
        dislikes: req.body.personality?.dislikes || [],
        goals: req.body.personality?.goals || 'Unknown',
        fears: req.body.personality?.fears || 'Unknown'
      },
      
      // Abilities
      abilities: {
        powers: req.body.abilities?.powers || [],
        techniques: req.body.abilities?.techniques || [],
        weapons: req.body.abilities?.weapons || [],
        fightingStyle: req.body.abilities?.fightingStyle || 'Unknown',
        specialAbilities: req.body.abilities?.specialAbilities || 'Unknown'
      },
      
      // Relationships
      relationships: {
        family: req.body.relationships?.family || 'Unknown',
        friends: req.body.relationships?.friends || [],
        rivals: req.body.relationships?.rivals || [],
        mentors: req.body.relationships?.mentors || [],
        students: req.body.relationships?.students || [],
        master: req.body.relationships?.master || 'Unknown',
        affiliatedGroups: req.body.relationships?.affiliatedGroups || []
      },
      
      // Background
      background: {
        origin: req.body.background?.origin || 'Unknown',
        backstory: req.body.background?.backstory || 'Unknown',
        keyEvents: req.body.background?.keyEvents || [],
        achievements: req.body.background?.achievements || [],
        notableFights: req.body.background?.notableFights || []
      },
      
      // Attributes
      attributes: {
        isMainCharacter: req.body.attributes?.isMainCharacter || false,
        isVillain: req.body.attributes?.isVillain || false,
        isHero: req.body.attributes?.isHero || false,
        isFemale: req.body.attributes?.isFemale || false,
        isChild: req.body.attributes?.isChild || false,
        isElder: req.body.attributes?.isElder || false,
        hasSpecialPower: req.body.attributes?.hasSpecialPower || false,
        hasWeapon: req.body.attributes?.hasWeapon || false,
        hasFamily: req.body.attributes?.hasFamily || false,
        isFromAnime: req.body.attributes?.isFromAnime !== undefined ? req.body.attributes.isFromAnime : true
      },
      
      // Battle Data
      powerLevel: parseFloat(req.body.powerLevel) || 25,
      basePower: parseFloat(req.body.basePower) || parseFloat(req.body.powerLevel) || 25,
      element: req.body.element || 'Fire',
      rarity: req.body.rarity || 'Common',
      
      // Legacy Traits
      traits: {
        gender: req.body.traits?.gender || req.body.identity?.gender || 'Unknown',
        species: req.body.traits?.species || req.body.identity?.species || 'Human',
        age: req.body.traits?.age || null,
        occupation: req.body.traits?.occupation || req.body.identity?.occupation || '',
        powers: req.body.traits?.powers || req.body.abilities?.powers || [],
        personality: req.body.traits?.personality || req.body.personality?.traits || [],
        affiliations: req.body.traits?.affiliations || req.body.relationships?.affiliatedGroups || [],
        relationships: req.body.traits?.relationships || [],
        keyEvents: req.body.traits?.keyEvents || req.body.background?.keyEvents || []
      },
      
      createdBy: req.user._id
    };

    const character = new Character(characterData);
    await character.save();

    console.log(`📝 Admin ${req.user.username} created character: ${character.name} (Power: ${character.powerLevel}, Element: ${character.element}, Rarity: ${character.rarity})`);

    res.status(201).json({ 
      success: true, 
      character,
      message: 'Character created successfully'
    });
  } catch (error) {
    console.error('Admin create character error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating character: ' + error.message
    });
  }
});

router.put('/characters/:id', adminMiddleware, async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    // Sanitize
    if (updateData.name) updateData.name = sanitizeInput(updateData.name);
    if (updateData.anime) updateData.anime = sanitizeInput(updateData.anime);
    if (updateData.description) updateData.description = sanitizeInput(updateData.description);
    if (updateData.crucialHint) updateData.crucialHint = sanitizeInput(updateData.crucialHint);
    
    // Update nested fields
    if (updateData.appearance) {
      updateData.appearance = {
        hairColor: updateData.appearance.hairColor || 'Unknown',
        eyeColor: updateData.appearance.eyeColor || 'Unknown',
        skinColor: updateData.appearance.skinColor || 'Unknown',
        height: updateData.appearance.height || 'Unknown',
        build: updateData.appearance.build || 'Unknown',
        distinctiveFeatures: updateData.appearance.distinctiveFeatures || 'Unknown',
        clothing: updateData.appearance.clothing || 'Unknown',
        accessories: updateData.appearance.accessories || 'Unknown'
      };
    }
    
    if (updateData.identity) {
      updateData.identity = {
        gender: updateData.identity.gender || 'Unknown',
        age: updateData.identity.age || 'Unknown',
        birthday: updateData.identity.birthday || 'Unknown',
        species: updateData.identity.species || 'Unknown',
        nationality: updateData.identity.nationality || 'Unknown',
        occupation: updateData.identity.occupation || 'Unknown'
      };
    }
    
    if (updateData.status) {
      updateData.status = {
        isAlive: updateData.status.isAlive !== undefined ? updateData.status.isAlive : true,
        isDeceased: updateData.status.isDeceased || false,
        deathDetails: updateData.status.deathDetails || 'Unknown',
        currentStatus: updateData.status.currentStatus || 'Alive'
      };
    }
    
    if (updateData.personality) {
      updateData.personality = {
        traits: updateData.personality.traits || [],
        likes: updateData.personality.likes || [],
        dislikes: updateData.personality.dislikes || [],
        goals: updateData.personality.goals || 'Unknown',
        fears: updateData.personality.fears || 'Unknown'
      };
    }
    
    if (updateData.abilities) {
      updateData.abilities = {
        powers: updateData.abilities.powers || [],
        techniques: updateData.abilities.techniques || [],
        weapons: updateData.abilities.weapons || [],
        fightingStyle: updateData.abilities.fightingStyle || 'Unknown',
        specialAbilities: updateData.abilities.specialAbilities || 'Unknown'
      };
    }
    
    if (updateData.relationships) {
      updateData.relationships = {
        family: updateData.relationships.family || 'Unknown',
        friends: updateData.relationships.friends || [],
        rivals: updateData.relationships.rivals || [],
        mentors: updateData.relationships.mentors || [],
        students: updateData.relationships.students || [],
        master: updateData.relationships.master || 'Unknown',
        affiliatedGroups: updateData.relationships.affiliatedGroups || []
      };
    }
    
    if (updateData.background) {
      updateData.background = {
        origin: updateData.background.origin || 'Unknown',
        backstory: updateData.background.backstory || 'Unknown',
        keyEvents: updateData.background.keyEvents || [],
        achievements: updateData.background.achievements || [],
        notableFights: updateData.background.notableFights || []
      };
    }
    
    if (updateData.attributes) {
      updateData.attributes = {
        isMainCharacter: updateData.attributes.isMainCharacter || false,
        isVillain: updateData.attributes.isVillain || false,
        isHero: updateData.attributes.isHero || false,
        isFemale: updateData.attributes.isFemale || false,
        isChild: updateData.attributes.isChild || false,
        isElder: updateData.attributes.isElder || false,
        hasSpecialPower: updateData.attributes.hasSpecialPower || false,
        hasWeapon: updateData.attributes.hasWeapon || false,
        hasFamily: updateData.attributes.hasFamily || false,
        isFromAnime: updateData.attributes.isFromAnime !== undefined ? updateData.attributes.isFromAnime : true
      };
    }
    
    // Battle Data
    if (updateData.powerLevel) updateData.powerLevel = Number(updateData.powerLevel);
    if (updateData.basePower) updateData.basePower = Number(updateData.basePower);
    if (updateData.element) updateData.element = updateData.element;
    if (updateData.rarity) updateData.rarity = updateData.rarity;

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
      message: 'Error updating character: ' + error.message
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

router.put('/banners/:id', adminMiddleware, async (req, res) => {
  try {
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

router.delete('/banners/:id', adminMiddleware, async (req, res) => {
  try {
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
      gems: user.gems || 0,
      createdAt: user.createdAt,
      equipped: user.equipped,
      clanId: user.clanId || null
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
      .select('username stats equipped.profilePhoto gems')
      .populate('equipped.profilePhoto', 'imageUrl')
      .sort({ 'stats.winStreak': -1 })
      .limit(10);

    const sanitizedTopPlayers = topPlayers.map(player => ({
      username: player.username,
      stats: player.stats,
      gems: player.gems || 0,
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

// ============================================================
// ✅ SEND GIFT TO USER (ADMIN ONLY)
// ============================================================
router.post('/gift', adminMiddleware, sendGift);

module.exports = router;