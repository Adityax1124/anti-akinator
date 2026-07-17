// /backend/controllers/adminController.js
const User = require('../models/User');
const Character = require('../models/Character');
const Title = require('../models/Title');
const Banner = require('../models/Banner');
const ProfilePhoto = require('../models/ProfilePhoto');
const ProfileBackground = require('../models/ProfileBackground');
const Notification = require('../models/Notification');
const SeasonPass = require('../models/SeasonPass');
const SeasonPassTier = require('../models/SeasonPassTier');
const Promotion = require('../models/Promotion');

// ✅ Send Gift to User
exports.sendGift = async (req, res) => {
  try {
    const { 
      userId, 
      giftType, 
      itemId, 
      itemName, 
      amount, 
      message 
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    if (!giftType) {
      return res.status(400).json({
        success: false,
        message: 'Gift type is required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const validTypes = ['card', 'title', 'banner', 'profilePhoto', 'profileBackground', 'shards', 'gems'];
    if (!validTypes.includes(giftType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gift type. Must be: card, title, banner, profilePhoto, profileBackground, shards, gems'
      });
    }

    let itemNameFinal = itemName || '';
    let itemIdFinal = null;
    let amountFinal = null;

    if (giftType === 'card') {
      if (!itemId) {
        return res.status(400).json({
          success: false,
          message: 'Card ID is required for card gift'
        });
      }
      const card = await Character.findById(itemId);
      if (!card) {
        return res.status(404).json({
          success: false,
          message: 'Card not found'
        });
      }
      itemIdFinal = itemId;
      itemNameFinal = card.name;
    } else if (giftType === 'title') {
      if (!itemId) {
        return res.status(400).json({
          success: false,
          message: 'Title ID is required for title gift'
        });
      }
      const title = await Title.findById(itemId);
      if (!title) {
        return res.status(404).json({
          success: false,
          message: 'Title not found'
        });
      }
      itemIdFinal = itemId;
      itemNameFinal = title.displayName || title.name;
    } else if (giftType === 'banner') {
      if (!itemId) {
        return res.status(400).json({
          success: false,
          message: 'Banner ID is required for banner gift'
        });
      }
      const banner = await Banner.findById(itemId);
      if (!banner) {
        return res.status(404).json({
          success: false,
          message: 'Banner not found'
        });
      }
      itemIdFinal = itemId;
      itemNameFinal = banner.name;
    } else if (giftType === 'profilePhoto') {
      if (!itemId) {
        return res.status(400).json({
          success: false,
          message: 'Profile Photo ID is required for profile photo gift'
        });
      }
      const photo = await ProfilePhoto.findById(itemId);
      if (!photo) {
        return res.status(404).json({
          success: false,
          message: 'Profile photo not found'
        });
      }
      itemIdFinal = itemId;
      itemNameFinal = photo.name;
    } else if (giftType === 'profileBackground') {
      if (!itemId) {
        return res.status(400).json({
          success: false,
          message: 'Profile Background ID is required for profile background gift'
        });
      }
      const background = await ProfileBackground.findById(itemId);
      if (!background) {
        return res.status(404).json({
          success: false,
          message: 'Profile background not found'
        });
      }
      itemIdFinal = itemId;
      itemNameFinal = background.name;
    } else if (giftType === 'shards' || giftType === 'gems') {
      if (!amount || amount < 1) {
        return res.status(400).json({
          success: false,
          message: `Amount is required for ${giftType} gift`
        });
      }
      amountFinal = amount;
      itemNameFinal = `${amount} ${giftType}`;
    }

    const notification = new Notification({
      userId: userId,
      type: 'gift',
      title: '🎁 You received a gift!',
      message: message || `You received a ${giftType} from Admin!`,
      icon: '🎁',
      color: 'gold',
      data: {
        giftType: giftType,
        itemId: itemIdFinal,
        itemName: itemNameFinal,
        amount: amountFinal,
        isClaimed: false
      },
      priority: 'high'
    });

    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Gift sent successfully!',
      notification: notification
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send gift: ' + error.message
    });
  }
};

// ✅ Claim Gift
exports.claimGift = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    if (notification.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'This notification does not belong to you'
      });
    }

    if (notification.type !== 'gift') {
      return res.status(400).json({
        success: false,
        message: 'This is not a gift notification'
      });
    }

    if (notification.data?.isClaimed) {
      return res.status(400).json({
        success: false,
        message: 'This gift has already been claimed'
      });
    }

    const giftData = notification.data;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let claimResult = { success: true, message: 'Gift claimed successfully!' };

    if (giftData.giftType === 'card') {
      const alreadyOwns = user.cards.some(c => 
        c.characterId && c.characterId.toString() === giftData.itemId.toString()
      );
      
      if (alreadyOwns) {
        user.gems += 200;
        await user.save();
        claimResult = {
          success: true,
          message: 'You already own this card! Converted to 200 gems 💎'
        };
      } else {
        const card = await Character.findById(giftData.itemId);
        if (card) {
          user.cards.push({
            characterId: card._id,
            characterName: card.name,
            basePower: card.basePower || card.powerLevel || 25,
            currentPower: card.basePower || card.powerLevel || 25,
            level: 1,
            element: card.element || 'Fire',
            rarity: card.rarity || 'Common',
            image: card.image || '',
            unlockedAt: new Date()
          });
          await user.save();
          claimResult = {
            success: true,
            message: `Card "${card.name}" added to your collection! 🃏`
          };
        }
      }
    } else if (giftData.giftType === 'title') {
      const alreadyHas = user.achievements.titles.some(t => 
        t.titleId.toString() === giftData.itemId.toString()
      );
      
      if (alreadyHas) {
        claimResult = {
          success: true,
          message: 'You already have this title!'
        };
      } else {
        user.achievements.titles.push({
          titleId: giftData.itemId,
          unlockedAt: new Date(),
          isEquipped: false
        });
        await user.save();
        claimResult = {
          success: true,
          message: `Title "${giftData.itemName}" added to your collection! 🏆`
        };
      }
    } else if (giftData.giftType === 'banner') {
      const alreadyHas = user.achievements.banners.some(b => 
        b.bannerId.toString() === giftData.itemId.toString()
      );
      
      if (alreadyHas) {
        claimResult = {
          success: true,
          message: 'You already have this banner!'
        };
      } else {
        user.achievements.banners.push({
          bannerId: giftData.itemId,
          unlockedAt: new Date(),
          isEquipped: false
        });
        await user.save();
        claimResult = {
          success: true,
          message: `Banner "${giftData.itemName}" added to your collection! 🎨`
        };
      }
    } else if (giftData.giftType === 'profilePhoto') {
      const alreadyHas = user.achievements.profilePhotos.some(p => 
        p.photoId.toString() === giftData.itemId.toString()
      );
      
      if (alreadyHas) {
        claimResult = {
          success: true,
          message: 'You already have this profile photo!'
        };
      } else {
        user.achievements.profilePhotos.push({
          photoId: giftData.itemId,
          unlockedAt: new Date(),
          isEquipped: false
        });
        await user.save();
        claimResult = {
          success: true,
          message: `Profile photo "${giftData.itemName}" added to your collection! 📸`
        };
      }
    } else if (giftData.giftType === 'profileBackground') {
      const alreadyHas = user.achievements.profileBackgrounds.some(b => 
        b.backgroundId.toString() === giftData.itemId.toString()
      );
      
      if (alreadyHas) {
        claimResult = {
          success: true,
          message: 'You already have this background!'
        };
      } else {
        user.achievements.profileBackgrounds.push({
          backgroundId: giftData.itemId,
          unlockedAt: new Date(),
          isEquipped: false
        });
        await user.save();

        const background = await ProfileBackground.findById(giftData.itemId);
        if (background) {
          await background.incrementTotalUsers();
        }

        claimResult = {
          success: true,
          message: `Profile background "${giftData.itemName}" added to your collection! 🖼️`
        };
      }
    } else if (giftData.giftType === 'shards') {
      user.shards += giftData.amount;
      await user.save();
      claimResult = {
        success: true,
        message: `+${giftData.amount} shards added! 🎴`
      };
    } else if (giftData.giftType === 'gems') {
      user.gems += giftData.amount;
      await user.save();
      claimResult = {
        success: true,
        message: `+${giftData.amount} gems added! 💎`
      };
    }

    notification.data.isClaimed = true;
    notification.data.claimedAt = new Date();
    await notification.save();

    const confirmNotif = new Notification({
      userId: userId,
      type: 'system',
      title: '✅ Gift Claimed!',
      message: `You successfully claimed: ${claimResult.message}`,
      icon: '✅',
      color: 'green',
      priority: 'medium'
    });
    await confirmNotif.save();

    res.json({
      success: true,
      message: claimResult.message,
      claimResult: claimResult
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to claim gift: ' + error.message
    });
  }
};

// ✅ Assign Profile Background to User (Admin only)
exports.assignProfileBackground = async (req, res) => {
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

    const notification = new Notification({
      userId: userId,
      type: 'system',
      title: '🖼️ New Profile Background!',
      message: `You have been granted the "${background.name}" profile background! Check your profile to equip it.`,
      icon: '🖼️',
      color: 'purple',
      priority: 'high'
    });
    await notification.save();

    res.json({
      success: true,
      message: 'Background assigned successfully!',
      user: {
        _id: user._id,
        username: user.username
      },
      background: {
        _id: background._id,
        name: background.name,
        imageUrl: background.imageUrl
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error assigning background: ' + error.message
    });
  }
};

// ✅ Get User's Profile Backgrounds (Admin view)
exports.getUserBackgrounds = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .populate('achievements.profileBackgrounds.backgroundId')
      .populate('equipped.profileBackground');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const backgrounds = user.achievements.profileBackgrounds.map(bg => ({
      ...bg.backgroundId.toObject(),
      unlockedAt: bg.unlockedAt,
      isEquipped: bg.isEquipped || false
    }));

    res.json({
      success: true,
      backgrounds,
      equipped: user.equipped.profileBackground || null,
      total: backgrounds.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user backgrounds: ' + error.message
    });
  }
};

// ✅ Create Season with proper tiers (FIXED)
exports.createSeason = async (req, res) => {
  try {
    const {
      seasonNumber,
      seasonName,
      startDate,
      endDate,
      totalTiers = 50,
      correctGuessesPerTier = 2,
      description = '',
      tierRewards = []
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
      totalTiers,
      correctGuessesPerTier,
      description: description || '',
      isActive: false,
      isPublished: false,
      tierRewards: tierRewards || []
    });

    await season.save();

    const tierPromises = [];
    for (let i = 1; i <= totalTiers; i++) {
      const existingRewards = tierRewards.find(t => t.tier === i);
      
      tierPromises.push(
        SeasonPassTier.create({
          seasonId: season._id,
          tier: i,
          rewards: existingRewards ? existingRewards.rewards : [],
          isUnlocked: false
        })
      );
    }
    await Promise.all(tierPromises);

    res.status(201).json({
      success: true,
      message: `Season ${seasonNumber} created successfully with ${totalTiers} tiers!`,
      season
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating season: ' + error.message
    });
  }
};

// ✅ Update Season
exports.updateSeason = async (req, res) => {
  try {
    const { seasonId } = req.params;
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

    const season = await SeasonPass.findById(seasonId);
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

    if (totalTiers && totalTiers !== season.totalTiers) {
      await SeasonPassTier.deleteMany({
        seasonId: season._id,
        tier: { $gt: totalTiers }
      });

      const existingTiers = await SeasonPassTier.find({ seasonId: season._id })
        .select('tier')
        .lean();
      const existingTierNumbers = existingTiers.map(t => t.tier);

      for (let i = 1; i <= totalTiers; i++) {
        if (!existingTierNumbers.includes(i)) {
          await SeasonPassTier.create({
            seasonId: season._id,
            tier: i,
            rewards: [],
            isUnlocked: false
          });
        }
      }
    }

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
};

// ✅ Delete Season
exports.deleteSeason = async (req, res) => {
  try {
    const { seasonId } = req.params;

    const season = await SeasonPass.findById(seasonId);
    if (!season) {
      return res.status(404).json({
        success: false,
        message: 'Season not found'
      });
    }

    await SeasonPassTier.deleteMany({ seasonId: season._id });
    await season.deleteOne();

    res.json({
      success: true,
      message: 'Season deleted successfully!'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting season: ' + error.message
    });
  }
};

// ✅ Activate Season
exports.activateSeason = async (req, res) => {
  try {
    const { seasonId } = req.params;

    const season = await SeasonPass.findById(seasonId);
    if (!season) {
      return res.status(404).json({
        success: false,
        message: 'Season not found'
      });
    }

    await SeasonPass.updateMany(
      { isActive: true },
      { $set: { isActive: false } }
    );

    season.isActive = true;
    await season.save();

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
};

// ✅ Deactivate Season
exports.deactivateSeason = async (req, res) => {
  try {
    const { seasonId } = req.params;

    const season = await SeasonPass.findById(seasonId);
    if (!season) {
      return res.status(404).json({
        success: false,
        message: 'Season not found'
      });
    }

    season.isActive = false;
    await season.save();

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
};

module.exports = exports;