const User = require('../models/User');
const Banner = require('../models/Banner');
const Title = require('../models/Title');
const ProfilePhoto = require('../models/ProfilePhoto');
const ProfileBackground = require('../models/ProfileBackground');

// ============================================================
// ✅ GET MY PROFILE
// ============================================================
exports.getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -__v')
      .populate('equipped.banner', 'gifUrl name')
      .populate('equipped.title', 'displayName name rarity')
      .populate('equipped.profilePhoto', 'imageUrl name')
      .populate('equipped.profileBackground', 'imageUrl name thumbnailUrl category rarity')
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
      })
      .populate({
        path: 'achievements.profileBackgrounds.backgroundId',
        model: 'ProfileBackground'
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const formattedUser = {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      stats: user.stats,
      seasonStats: user.seasonStats,
      shards: user.shards,
      gems: user.gems || 0,
      totalGuesses: user.totalGuesses,
      equipped: {
        banner: user.equipped?.banner || null,
        title: user.equipped?.title || null,
        profilePhoto: user.equipped?.profilePhoto || null,
        profileBackground: user.equipped?.profileBackground || null
      },
      achievements: {
        banners: user.achievements?.banners || [],
        titles: user.achievements?.titles || [],
        profilePhotos: user.achievements?.profilePhotos || [],
        profileBackgrounds: user.achievements?.profileBackgrounds || []
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
};

// ============================================================
// ✅ GET PUBLIC PROFILE
// ============================================================
exports.getPublicProfile = async (req, res) => {
  try {
    const { username } = req.params;
    
    const user = await User.findOne({ username })
      .select('-password -email -__v')
      .populate('equipped.banner', 'gifUrl name')
      .populate('equipped.title', 'displayName name rarity')
      .populate('equipped.profilePhoto', 'imageUrl name')
      .populate('equipped.profileBackground', 'imageUrl name thumbnailUrl category rarity')
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
      })
      .populate({
        path: 'achievements.profileBackgrounds.backgroundId',
        model: 'ProfileBackground'
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const publicProfile = {
      username: user.username,
      stats: user.stats,
      totalGuesses: user.totalGuesses || 0,
      shards: user.shards || 0,
      gems: user.gems || 0,
      role: user.role,
      equipped: {
        banner: user.equipped?.banner || null,
        title: user.equipped?.title || null,
        profilePhoto: user.equipped?.profilePhoto || null,
        profileBackground: user.equipped?.profileBackground || null
      },
      achievements: {
        banners: user.achievements?.banners || [],
        titles: user.achievements?.titles || [],
        profilePhotos: user.achievements?.profilePhotos || [],
        profileBackgrounds: user.achievements?.profileBackgrounds || []
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
};

// ============================================================
// ✅ GET BANNERS
// ============================================================
exports.getBanners = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const allBanners = await Banner.find({ isActive: true });
    
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
};

// ============================================================
// ✅ GET TITLES
// ============================================================
exports.getTitles = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const allTitles = await Title.find({ isActive: true });
    
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
};

// ============================================================
// ✅ GET PROFILE PHOTOS
// ============================================================
exports.getProfilePhotos = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const allPhotos = await ProfilePhoto.find({ isActive: true });
    
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
};

// ============================================================
// ✅ GET PROFILE BACKGROUNDS
// ============================================================
exports.getProfileBackgrounds = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const allBackgrounds = await ProfileBackground.find({ isActive: true });
    
    const backgroundsWithStatus = allBackgrounds.map(bg => {
      const isUnlocked = user.achievements.profileBackgrounds.some(
        b => b.backgroundId.toString() === bg._id.toString()
      );
      return {
        ...bg.toObject(),
        isUnlocked,
        isEquipped: user.equipped.profileBackground?.toString() === bg._id.toString()
      };
    });
    
    res.json({ 
      success: true, 
      backgrounds: backgroundsWithStatus,
      equipped: user.equipped.profileBackground
    });
  } catch (error) {
    console.error('Get backgrounds error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching profile backgrounds' 
    });
  }
};

// ============================================================
// ✅ GET EQUIPPED ITEMS
// ============================================================
exports.getEquippedItems = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('equipped.banner', 'gifUrl name')
      .populate('equipped.title', 'displayName name')
      .populate('equipped.profilePhoto', 'imageUrl name')
      .populate('equipped.profileBackground', 'imageUrl name thumbnailUrl');

    res.json({
      success: true,
      banner: user.equipped?.banner || null,
      title: user.equipped?.title || null,
      profilePhoto: user.equipped?.profilePhoto || null,
      profileBackground: user.equipped?.profileBackground || null
    });
  } catch (error) {
    console.error('Get equipped error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching equipped items' 
    });
  }
};

// ============================================================
// ✅ EQUIP BANNER
// ============================================================
exports.equipBanner = async (req, res) => {
  try {
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
};

// ============================================================
// ✅ EQUIP TITLE
// ============================================================
exports.equipTitle = async (req, res) => {
  try {
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
};

// ============================================================
// ✅ EQUIP PROFILE PHOTO
// ============================================================
exports.equipProfilePhoto = async (req, res) => {
  try {
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
};

// ============================================================
// ✅ EQUIP PROFILE BACKGROUND
// ============================================================
exports.equipProfileBackground = async (req, res) => {
  try {
    const { backgroundId } = req.body;

    if (!backgroundId) {
      return res.status(400).json({
        success: false,
        message: 'Background ID is required'
      });
    }

    const user = await User.findById(req.user._id);
    
    const ownsBackground = user.achievements.profileBackgrounds.some(
      b => b.backgroundId.toString() === backgroundId
    );
    
    if (!ownsBackground) {
      return res.status(403).json({ 
        success: false, 
        message: 'You don\'t own this background' 
      });
    }

    const bgExists = await ProfileBackground.findById(backgroundId);
    if (!bgExists) {
      return res.status(404).json({
        success: false,
        message: 'Profile background not found'
      });
    }
    
    user.equipped.profileBackground = backgroundId;
    user.updatedAt = new Date();
    await user.save();

    await bgExists.incrementEquipCount();

    res.json({ 
      success: true, 
      message: 'Profile background equipped successfully!',
      background: bgExists,
      updatedAt: user.updatedAt
    });
  } catch (error) {
    console.error('Equip background error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error equipping profile background' 
    });
  }
};

// ============================================================
// ✅ UNEQUIP PROFILE BACKGROUND
// ============================================================
exports.unequipProfileBackground = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    user.equipped.profileBackground = null;
    user.updatedAt = new Date();
    await user.save();

    res.json({ 
      success: true, 
      message: 'Profile background unequipped successfully!',
      updatedAt: user.updatedAt
    });
  } catch (error) {
    console.error('Unequip background error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error unequipping profile background' 
    });
  }
};

// ============================================================
// ✅ SEARCH USERS
// ============================================================
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({
        success: true,
        users: []
      });
    }

    const sanitizedQuery = q.replace(/[<>]/g, '').trim();

    const users = await User.find({
      username: { $regex: sanitizedQuery, $options: 'i' },
      _id: { $ne: req.user._id }
    })
    .select('_id username stats shards gems equipped.profilePhoto')
    .populate('equipped.profilePhoto', 'imageUrl')
    .limit(10);

    const sanitizedUsers = users.map(user => ({
      _id: user._id,
      username: user.username,
      stats: user.stats,
      shards: user.shards,
      gems: user.gems || 0,
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
};

// ============================================================
// ✅ GET USER CARDS
// ============================================================
exports.getUserCards = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const cards = user.cards || [];
    
    const sortedCards = cards.sort((a, b) => (b.currentPower || b.powerLevel || 0) - (a.currentPower || a.powerLevel || 0));
    
    const cardsWithDetails = sortedCards.map(card => ({
      characterId: card.characterId,
      characterName: card.characterName || 'Unknown',
      powerLevel: card.powerLevel || 25,
      currentPower: card.currentPower || card.powerLevel || 25,
      basePower: card.basePower || card.powerLevel || 25,
      level: card.level || 1,
      element: card.element || 'Fire',
      rarity: card.rarity || 'Common',
      image: card.image || '',
      unlockedAt: card.unlockedAt,
      stolenFrom: card.stolenFrom,
      stolenAt: card.stolenAt,
      used: card.used || false,
      won: card.won || null,
      roundUsed: card.roundUsed || null
    }));

    res.json({
      success: true,
      cards: cardsWithDetails,
      count: cardsWithDetails.length
    });
  } catch (error) {
    console.error('Get cards error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cards'
    });
  }
};

// ============================================================
// ✅ UPDATE PROFILE (Username, etc.)
// ============================================================
exports.updateProfile = async (req, res) => {
  try {
    const { username } = req.body;
    const userId = req.user._id;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required'
      });
    }

    // Check if username is taken
    const existingUser = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') },
      _id: { $ne: userId }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username is already taken'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { 
        username: username,
        updatedAt: new Date()
      },
      { new: true }
    ).select('-password -__v');

    res.json({
      success: true,
      message: 'Profile updated successfully!',
      user
    });
  } catch (error) {
    console.error('Update profile error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error updating profile'
    });
  }
};