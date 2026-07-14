const User = require('../models/User');
const Character = require('../models/Character');
const Title = require('../models/Title');
const Banner = require('../models/Banner');
const ProfilePhoto = require('../models/ProfilePhoto');
const Notification = require('../models/Notification');

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

    const validTypes = ['card', 'title', 'banner', 'profilePhoto', 'shards', 'gems'];
    if (!validTypes.includes(giftType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gift type. Must be: card, title, banner, profilePhoto, shards, gems'
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

    // Create notification with gift
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
    console.error('Send gift error:', error);
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

    // Send confirmation notification
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
    console.error('Claim gift error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to claim gift: ' + error.message
    });
  }
};