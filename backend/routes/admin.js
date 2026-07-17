// /backend/routes/admin.js
const express = require('express');
const router = express.Router();
const { adminMiddleware } = require('../middleware/auth');
const Character = require('../models/Character');
const User = require('../models/User');
const GameSession = require('../models/GameSession');
const Banner = require('../models/Banner');
const Title = require('../models/Title');
const ProfilePhoto = require('../models/ProfilePhoto');
const ProfileBackground = require('../models/ProfileBackground');
const ShopItem = require('../models/ShopItem');
const SeasonPass = require('../models/SeasonPass');
const SeasonPassTier = require('../models/SeasonPassTier');
const Transaction = require('../models/Transaction');
const Promotion = require('../models/Promotion');

const {
  sendGift
} = require('../controllers/adminController');

const {
  getAllPromotions,
  getPromotionDetail,
  updatePromotionStatus,
  giveReward,
  deletePromotion,
  getPromotionStats
} = require('../controllers/promotionController');

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
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching characters' 
    });
  }
});

router.post('/characters', adminMiddleware, async (req, res) => {
  try {
    const characterData = {
      name: sanitizeInput(req.body.name),
      anime: sanitizeInput(req.body.anime),
      image: req.body.image || '',
      description: sanitizeInput(req.body.description) || '',
      crucialHint: sanitizeInput(req.body.crucialHint) || '',
      
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
      
      identity: {
        gender: req.body.identity?.gender || 'Unknown',
        age: req.body.identity?.age || 'Unknown',
        birthday: req.body.identity?.birthday || 'Unknown',
        species: req.body.identity?.species || 'Unknown',
        nationality: req.body.identity?.nationality || 'Unknown',
        occupation: req.body.identity?.occupation || 'Unknown'
      },
      
      status: {
        isAlive: req.body.status?.isAlive !== undefined ? req.body.status.isAlive : true,
        isDeceased: req.body.status?.isDeceased || false,
        deathDetails: req.body.status?.deathDetails || 'Unknown',
        currentStatus: req.body.status?.currentStatus || 'Alive'
      },
      
      personality: {
        traits: req.body.personality?.traits || [],
        likes: req.body.personality?.likes || [],
        dislikes: req.body.personality?.dislikes || [],
        goals: req.body.personality?.goals || 'Unknown',
        fears: req.body.personality?.fears || 'Unknown'
      },
      
      abilities: {
        powers: req.body.abilities?.powers || [],
        techniques: req.body.abilities?.techniques || [],
        weapons: req.body.abilities?.weapons || [],
        fightingStyle: req.body.abilities?.fightingStyle || 'Unknown',
        specialAbilities: req.body.abilities?.specialAbilities || 'Unknown'
      },
      
      relationships: {
        family: req.body.relationships?.family || 'Unknown',
        friends: req.body.relationships?.friends || [],
        rivals: req.body.relationships?.rivals || [],
        mentors: req.body.relationships?.mentors || [],
        students: req.body.relationships?.students || [],
        master: req.body.relationships?.master || 'Unknown',
        affiliatedGroups: req.body.relationships?.affiliatedGroups || []
      },
      
      background: {
        origin: req.body.background?.origin || 'Unknown',
        backstory: req.body.background?.backstory || 'Unknown',
        keyEvents: req.body.background?.keyEvents || [],
        achievements: req.body.background?.achievements || [],
        notableFights: req.body.background?.notableFights || []
      },
      
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
      
      powerLevel: parseFloat(req.body.powerLevel) || 25,
      basePower: parseFloat(req.body.basePower) || parseFloat(req.body.powerLevel) || 25,
      element: req.body.element || 'Fire',
      rarity: req.body.rarity || 'Common',
      
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

    res.status(201).json({ 
      success: true, 
      character,
      message: 'Character created successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error creating character: ' + error.message
    });
  }
});

router.put('/characters/:id', adminMiddleware, async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    if (updateData.name) updateData.name = sanitizeInput(updateData.name);
    if (updateData.anime) updateData.anime = sanitizeInput(updateData.anime);
    if (updateData.description) updateData.description = sanitizeInput(updateData.description);
    if (updateData.crucialHint) updateData.crucialHint = sanitizeInput(updateData.crucialHint);
    
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

    res.json({ 
      success: true, 
      character,
      message: 'Character updated successfully'
    });
  } catch (error) {
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

    res.json({ 
      success: true, 
      message: 'Character deleted successfully' 
    });
  } catch (error) {
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
    res.status(500).json({ success: false, message: 'Error fetching banners' });
  }
});

router.post('/banners', adminMiddleware, async (req, res) => {
  try {
    const existingBanner = await Banner.findOne({ 
      name: { $regex: new RegExp(`^${req.body.name}$`, 'i') } 
    });
    
    if (existingBanner) {
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

    const banner = new Banner(bannerData);
    await banner.save();

    res.status(201).json({ 
      success: true, 
      banner,
      message: 'Banner created successfully'
    });
  } catch (error) {
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
      message: 'Error creating banner: ' + error.message
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

    res.json({ 
      success: true, 
      banner,
      message: 'Banner updated successfully'
    });
  } catch (error) {
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

    res.json({ 
      success: true, 
      message: 'Banner deleted successfully' 
    });
  } catch (error) {
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

    res.status(201).json({ 
      success: true, 
      title,
      message: 'Title created successfully'
    });
  } catch (error) {
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

    res.json({ 
      success: true, 
      title,
      message: 'Title updated successfully'
    });
  } catch (error) {
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

    res.json({ 
      success: true, 
      message: 'Title deleted successfully' 
    });
  } catch (error) {
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

    res.status(201).json({ 
      success: true, 
      photo,
      message: 'Profile photo created successfully'
    });
  } catch (error) {
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

    res.json({ 
      success: true, 
      photo,
      message: 'Profile photo updated successfully'
    });
  } catch (error) {
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

    res.json({ 
      success: true, 
      message: 'Profile photo deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting profile photo' });
  }
});

// ============================================================
// PROFILE BACKGROUND CRUD (ADMIN ONLY)
// ============================================================

router.get('/profile-backgrounds', adminMiddleware, async (req, res) => {
  try {
    const backgrounds = await ProfileBackground.find()
      .sort({ createdAt: -1 });
    
    res.json({ 
      success: true, 
      backgrounds,
      count: backgrounds.length
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching profile backgrounds' 
    });
  }
});

router.post('/profile-backgrounds', adminMiddleware, async (req, res) => {
  try {
    const {
      name,
      description,
      imageUrl,
      thumbnailUrl,
      category,
      rarity,
      unlockType,
      unlockData,
      isActive,
      isDefault
    } = req.body;

    if (!name || !imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Name and imageUrl are required'
      });
    }

    const existing = await ProfileBackground.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Background "${name}" already exists`
      });
    }

    const background = new ProfileBackground({
      name: sanitizeInput(name),
      description: description || '',
      imageUrl: imageUrl.trim(),
      thumbnailUrl: thumbnailUrl ? thumbnailUrl.trim() : null,
      category: category || 'anime',
      rarity: rarity || 'Common',
      unlockType: unlockType || 'admin_gift',
      unlockData: unlockData || null,
      isActive: isActive !== undefined ? isActive : true,
      isDefault: isDefault || false,
      createdBy: req.user._id
    });

    await background.save();

    res.status(201).json({ 
      success: true, 
      background,
      message: 'Profile background created successfully'
    });
  } catch (error) {
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
    
    res.status(500).json({ 
      success: false, 
      message: 'Error creating profile background: ' + error.message
    });
  }
});

router.put('/profile-backgrounds/:id', adminMiddleware, async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    if (updateData.name) updateData.name = sanitizeInput(updateData.name);
    if (updateData.imageUrl) updateData.imageUrl = updateData.imageUrl.trim();
    if (updateData.thumbnailUrl) updateData.thumbnailUrl = updateData.thumbnailUrl.trim();
    
    const background = await ProfileBackground.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!background) {
      return res.status(404).json({ 
        success: false, 
        message: 'Profile background not found' 
      });
    }

    res.json({ 
      success: true, 
      background,
      message: 'Profile background updated successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error updating profile background: ' + error.message
    });
  }
});

router.delete('/profile-backgrounds/:id', adminMiddleware, async (req, res) => {
  try {
    const background = await ProfileBackground.findById(req.params.id);
    
    if (!background) {
      return res.status(404).json({ 
        success: false, 
        message: 'Profile background not found' 
      });
    }

    if (background.isDefault) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the default background'
      });
    }

    await background.deleteOne();

    res.json({ 
      success: true, 
      message: 'Profile background deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting profile background: ' + error.message
    });
  }
});

router.post('/assign-background', adminMiddleware, async (req, res) => {
  try {
    const { userId, backgroundId } = req.body;

    if (!userId || !backgroundId) {
      return res.status(400).json({
        success: false,
        message: 'userId and backgroundId are required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const background = await ProfileBackground.findById(backgroundId);
    if (!background) {
      return res.status(404).json({
        success: false,
        message: 'Profile background not found'
      });
    }

    if (user.hasProfileBackground(backgroundId)) {
      return res.status(400).json({
        success: false,
        message: 'User already owns this background'
      });
    }

    const result = user.addProfileBackground(backgroundId);
    await user.save();

    await background.incrementTotalUsers();

    res.json({
      success: true,
      message: 'Background assigned successfully!',
      user: {
        _id: user._id,
        username: user.username
      },
      background: {
        _id: background._id,
        name: background.name
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error assigning background: ' + error.message
    });
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

    res.status(201).json({
      success: true,
      message: 'Item added to shop successfully!',
      item: shopItem
    });
  } catch (error) {
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

    res.json({
      success: true,
      message: 'Shop item updated successfully!',
      item: shopItem
    });
  } catch (error) {
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

    res.json({
      success: true,
      message: 'Shop item removed successfully!'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error removing shop item'
    });
  }
});

// ============================================================
// USERS
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
      clanId: user.clanId || null,
      seasonPass: user.seasonPass || null,
      transactionHistory: user.transactionHistory || []
    }));

    res.json({ 
      success: true, 
      users: sanitizedUsers,
      count: sanitizedUsers.length
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching users' 
    });
  }
});

// ============================================================
// ADMIN STATS
// ============================================================
router.get('/stats', adminMiddleware, async (req, res) => {
  try {
    const [totalGames, wonGames, totalCharacters, totalUsers, totalTransactions] = await Promise.all([
      GameSession.countDocuments(),
      GameSession.countDocuments({ status: 'won' }),
      Character.countDocuments(),
      User.countDocuments(),
      Transaction.countDocuments()
    ]);

    const winRate = totalGames > 0 ? ((wonGames / totalGames) * 100).toFixed(1) : 0;

    const pendingTransactions = await Transaction.countDocuments({ status: 'pending' });

    const revenueResult = await Transaction.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$paidAmount' } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

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
        totalUsers,
        totalTransactions,
        pendingTransactions,
        totalRevenue
      },
      topPlayers: sanitizedTopPlayers
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching stats' 
    });
  }
});

// ============================================================
// SEASON PASS ADMIN ROUTES
// ============================================================

router.get('/seasons', adminMiddleware, async (req, res) => {
  try {
    const seasons = await SeasonPass.find()
      .sort({ seasonNumber: -1 });
    
    res.json({
      success: true,
      seasons
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching seasons'
    });
  }
});

router.get('/seasons/:seasonId', adminMiddleware, async (req, res) => {
  try {
    const season = await SeasonPass.findById(req.params.seasonId);
    
    if (!season) {
      return res.status(404).json({
        success: false,
        message: 'Season not found'
      });
    }

    const tiers = await SeasonPassTier.find({ seasonId: season._id })
      .sort({ tier: 1 });

    res.json({
      success: true,
      season,
      tiers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching season'
    });
  }
});

router.post('/seasons', adminMiddleware, async (req, res) => {
  try {
    const {
      seasonNumber,
      seasonName,
      startDate,
      endDate,
      totalTiers,
      correctGuessesPerTier,
      description
    } = req.body;

    if (!seasonNumber || !seasonName || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'seasonNumber, seasonName, startDate, and endDate are required'
      });
    }

    const existing = await SeasonPass.findOne({ seasonNumber });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Season ${seasonNumber} already exists`
      });
    }

    const season = new SeasonPass({
      seasonNumber,
      seasonName,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      totalTiers: totalTiers || 100,
      correctGuessesPerTier: correctGuessesPerTier || 2,
      description: description || '',
      isActive: false,
      isPublished: false
    });

    await season.save();

    const tierPromises = [];
    for (let i = 1; i <= season.totalTiers; i++) {
      tierPromises.push(
        SeasonPassTier.create({
          seasonId: season._id,
          tier: i,
          rewards: [],
          isUnlocked: false
        })
      );
    }
    await Promise.all(tierPromises);

    res.status(201).json({
      success: true,
      message: `Season ${seasonNumber} created successfully!`,
      season
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating season: ' + error.message
    });
  }
});

router.put('/seasons/:seasonId', adminMiddleware, async (req, res) => {
  try {
    const {
      seasonName,
      startDate,
      endDate,
      totalTiers,
      correctGuessesPerTier,
      description,
      isActive,
      isPublished
    } = req.body;

    const season = await SeasonPass.findById(req.params.seasonId);
    if (!season) {
      return res.status(404).json({
        success: false,
        message: 'Season not found'
      });
    }

    if (seasonName) season.seasonName = seasonName;
    if (startDate) season.startDate = new Date(startDate);
    if (endDate) season.endDate = new Date(endDate);
    if (totalTiers) season.totalTiers = totalTiers;
    if (correctGuessesPerTier) season.correctGuessesPerTier = correctGuessesPerTier;
    if (description !== undefined) season.description = description;
    if (isActive !== undefined) season.isActive = isActive;
    if (isPublished !== undefined) season.isPublished = isPublished;

    await season.save();

    res.json({
      success: true,
      message: 'Season updated successfully!',
      season
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating season: ' + error.message
    });
  }
});

router.post('/seasons/:seasonId/activate', adminMiddleware, async (req, res) => {
  try {
    const season = await SeasonPass.findById(req.params.seasonId);
    if (!season) {
      return res.status(404).json({
        success: false,
        message: 'Season not found'
      });
    }

    await SeasonPass.activateSeason(season.seasonNumber);

    res.json({
      success: true,
      message: `Season ${season.seasonNumber} activated successfully!`,
      season
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error activating season: ' + error.message
    });
  }
});

router.post('/seasons/:seasonId/deactivate', adminMiddleware, async (req, res) => {
  try {
    const season = await SeasonPass.findById(req.params.seasonId);
    if (!season) {
      return res.status(404).json({
        success: false,
        message: 'Season not found'
      });
    }

    await SeasonPass.deactivateSeason(season.seasonNumber);

    res.json({
      success: true,
      message: `Season ${season.seasonNumber} deactivated successfully!`,
      season
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deactivating season: ' + error.message
    });
  }
});

router.put('/seasons/:seasonId/tiers/:tier', adminMiddleware, async (req, res) => {
  try {
    const { seasonId, tier } = req.params;
    const { rewards } = req.body;

    const tierDoc = await SeasonPassTier.findOne({ seasonId, tier });
    if (!tierDoc) {
      return res.status(404).json({
        success: false,
        message: 'Tier not found'
      });
    }

    tierDoc.rewards = rewards || [];
    await tierDoc.save();

    const season = await SeasonPass.findById(seasonId);
    if (season) {
      const existingTier = season.tierRewards.find(t => t.tier === parseInt(tier));
      if (existingTier) {
        existingTier.rewards = rewards || [];
      } else {
        season.tierRewards.push({
          tier: parseInt(tier),
          rewards: rewards || []
        });
      }
      await season.save();
    }

    res.json({
      success: true,
      message: `Tier ${tier} rewards updated successfully!`,
      tier: tierDoc
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating tier: ' + error.message
    });
  }
});

router.get('/seasons/:seasonId/leaderboard', adminMiddleware, async (req, res) => {
  try {
    const { seasonId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const leaderboard = await User.getSeasonPassLeaderboard(seasonId, limit);

    res.json({
      success: true,
      leaderboard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching leaderboard: ' + error.message
    });
  }
});

// ============================================================
// SEND GIFT TO USER (ADMIN ONLY)
// ============================================================
router.post('/gift', adminMiddleware, sendGift);

// ============================================================
// TRANSACTION MANAGEMENT (ADMIN ONLY)
// ============================================================

router.get('/transactions', adminMiddleware, async (req, res) => {
  try {
    const { 
      status, 
      itemType, 
      search, 
      startDate, 
      endDate,
      limit = 50, 
      page = 1,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    
    if (status && status !== 'all') query.status = status;
    if (itemType && itemType !== 'all') query.itemType = itemType;
    
    if (search) {
      const userMatches = await User.find({
        $or: [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      
      const userIds = userMatches.map(u => u._id);
      
      query.$or = [
        { utrNumber: { $regex: search, $options: 'i' } },
        { userId: { $in: userIds } }
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const transactions = await Transaction.find(query)
      .populate('userId', 'username email phoneNumber profilePhoto')
      .populate('verifiedBy', 'username email')
      .sort(sort)
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(query);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching transactions: ' + error.message
    });
  }
});

router.get('/transactions/stats', adminMiddleware, async (req, res) => {
  try {
    const stats = await Transaction.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$paidAmount' }
        }
      }
    ]);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyStats = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            status: '$status'
          },
          count: { $sum: 1 },
          amount: { $sum: '$paidAmount' }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);

    const typeStats = await Transaction.aggregate([
      {
        $group: {
          _id: '$itemType',
          count: { $sum: 1 },
          totalAmount: { $sum: '$paidAmount' }
        }
      }
    ]);

    const revenueResult = await Transaction.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$paidAmount' } } }
    ]);

    res.json({
      success: true,
      data: {
        statusBreakdown: stats,
        dailyStats,
        typeBreakdown: typeStats,
        totalTransactions: await Transaction.countDocuments(),
        pendingTransactions: await Transaction.countDocuments({ status: 'pending' }),
        verifiedTransactions: await Transaction.countDocuments({ status: 'verified' }),
        deliveredTransactions: await Transaction.countDocuments({ status: 'delivered' }),
        rejectedTransactions: await Transaction.countDocuments({ status: 'rejected' }),
        totalRevenue: revenueResult.length > 0 ? revenueResult[0].total : 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching transaction stats: ' + error.message
    });
  }
});

router.get('/transactions/:id', adminMiddleware, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('userId', 'username email phoneNumber profilePhoto')
      .populate('verifiedBy', 'username email');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching transaction: ' + error.message
    });
  }
});

router.put('/transactions/:id/verify', adminMiddleware, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    if (transaction.status === 'verified' || transaction.status === 'delivered') {
      return res.status(400).json({
        success: false,
        message: `Transaction is already ${transaction.status}`
      });
    }

    await transaction.markAsVerified(req.user._id);

    res.json({
      success: true,
      message: 'Transaction verified successfully',
      data: {
        transactionId: transaction._id,
        status: transaction.status,
        verifiedAt: transaction.verifiedAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verifying transaction: ' + error.message
    });
  }
});

router.put('/transactions/:id/deliver', adminMiddleware, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    if (transaction.status === 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Item has already been delivered'
      });
    }

    if (transaction.status === 'pending') {
      await transaction.markAsVerified(req.user._id);
    }

    const user = await User.findById(transaction.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let deliveryMessage = '';
    switch (transaction.itemType) {
      case 'shards':
        const shardCount = transaction.itemDetails.shardCount || parseInt(transaction.itemName) || 0;
        const result = user.addShards(shardCount);
        if (!result.success) {
          return res.status(400).json({
            success: false,
            message: result.message
          });
        }
        deliveryMessage = `${shardCount} shards added to user's account`;
        break;
        
      case 'seasonpass':
        const seasonId = transaction.itemDetails.seasonId || null;
        const durationDays = transaction.itemDetails.durationDays || 30;
        
        user.activateSeasonPass(seasonId, durationDays);
        deliveryMessage = `Season Pass activated for ${durationDays} days`;
        break;
        
      case 'bundle':
        if (transaction.itemDetails.shards) {
          user.addShards(transaction.itemDetails.shards);
        }
        if (transaction.itemDetails.seasonPass) {
          user.activateSeasonPass(
            transaction.itemDetails.seasonId || null,
            transaction.itemDetails.durationDays || 30
          );
        }
        deliveryMessage = 'Bundle items delivered';
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Unknown item type'
        });
    }

    await user.save();

    user.addTransaction(transaction._id);
    await user.save();

    await transaction.markAsDelivered();

    transaction.notes = `${deliveryMessage} | Delivered by ${req.user.username}`;
    transaction.verifiedBy = req.user._id;
    transaction.verifiedAt = transaction.verifiedAt || new Date();
    await transaction.save();

    res.json({
      success: true,
      message: 'Item delivered successfully',
      data: {
        transactionId: transaction._id,
        status: transaction.status,
        deliveredAt: transaction.deliveredAt,
        deliveryMessage
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error delivering item: ' + error.message
    });
  }
});

router.put('/transactions/:id/reject', adminMiddleware, async (req, res) => {
  try {
    const { reason } = req.body;
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    if (transaction.status === 'verified' || transaction.status === 'delivered') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject a ${transaction.status} transaction`
      });
    }

    await transaction.reject(req.user._id, reason || 'Transaction rejected by admin');

    res.json({
      success: true,
      message: 'Transaction rejected successfully',
      data: {
        transactionId: transaction._id,
        status: transaction.status,
        reason: transaction.notes
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error rejecting transaction: ' + error.message
    });
  }
});

// ============================================================
// ✅ PROMOTION MANAGEMENT (ADMIN ONLY)
// ============================================================

router.get('/promotions', adminMiddleware, getAllPromotions);

router.get('/promotions/:id', adminMiddleware, getPromotionDetail);

router.put('/promotions/:id/status', adminMiddleware, updatePromotionStatus);

router.post('/promotions/:id/reward', adminMiddleware, giveReward);

router.delete('/promotions/:id', adminMiddleware, deletePromotion);

router.get('/promotions/stats', adminMiddleware, getPromotionStats);

module.exports = router;