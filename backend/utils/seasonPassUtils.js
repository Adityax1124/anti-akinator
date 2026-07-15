const SeasonPass = require('../models/SeasonPass');
const SeasonPassTier = require('../models/SeasonPassTier');
const User = require('../models/User');

// ============================================================
// ✅ UPDATE USER SEASON PASS PROGRESS
// ============================================================
async function updateSeasonPassProgress(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    const season = await SeasonPass.getActiveSeason();
    if (!season) {
      return { success: false, message: 'No active season' };
    }

    const hasProgress = user.seasonPass && user.seasonPass.seasonId && 
                        user.seasonPass.seasonId.toString() === season._id.toString();

    if (!hasProgress) {
      user.seasonPass = {
        seasonId: season._id,
        currentTier: 1,
        correctGuesses: 0,
        progress: 0,
        unlockedTiers: [{ tier: 1, unlockedAt: new Date() }],
        claimedRewards: [],
        isCompleted: false,
        joinedAt: new Date()
      };
    }

    const correctGuesses = user.stats?.gamesWon || 0;
    const previousGuesses = user.seasonPass.correctGuesses || 0;

    if (correctGuesses !== previousGuesses) {
      user.seasonPass.correctGuesses = correctGuesses;
      
      const newTier = Math.floor(correctGuesses / season.correctGuessesPerTier) + 1;
      const finalTier = Math.min(newTier, season.totalTiers);
      
      const tierAdvanced = finalTier > user.seasonPass.currentTier;
      
      user.seasonPass.currentTier = finalTier;
      user.seasonPass.progress = season.getProgressToNextTier(correctGuesses);
      
      if (finalTier >= season.totalTiers && !user.seasonPass.isCompleted) {
        user.seasonPass.isCompleted = true;
        user.seasonPass.completedAt = new Date();
        await giveCompletionRewards(user, season);
      }
      
      if (tierAdvanced) {
        for (let i = user.seasonPass.currentTier; i <= finalTier; i++) {
          const alreadyUnlocked = user.seasonPass.unlockedTiers.some(t => t.tier === i);
          if (!alreadyUnlocked) {
            user.seasonPass.unlockedTiers.push({ tier: i, unlockedAt: new Date() });
          }
        }
      }
      
      await user.save();
      
      return {
        success: true,
        previousTier: user.seasonPass.currentTier - (tierAdvanced ? 1 : 0),
        newTier: user.seasonPass.currentTier,
        tierAdvanced,
        progress: user.seasonPass.progress,
        isCompleted: user.seasonPass.isCompleted,
        correctGuesses: user.seasonPass.correctGuesses
      };
    }

    return {
      success: true,
      currentTier: user.seasonPass.currentTier,
      progress: user.seasonPass.progress,
      correctGuesses: user.seasonPass.correctGuesses
    };

  } catch (error) {
    console.error('Update season pass progress error:', error);
    return { success: false, message: error.message };
  }
}

// ============================================================
// ✅ GIVE COMPLETION REWARDS
// ============================================================
async function giveCompletionRewards(user, season) {
  try {
    if (!season.completionRewards || season.completionRewards.length === 0) {
      return { success: true, message: 'No completion rewards' };
    }

    const rewards = [];
    
    for (const reward of season.completionRewards) {
      const result = await claimReward(user, reward);
      rewards.push(result);
    }

    await user.save();

    return {
      success: true,
      rewards: rewards,
      message: 'Completion rewards claimed!'
    };

  } catch (error) {
    console.error('Give completion rewards error:', error);
    return { success: false, message: error.message };
  }
}

// ============================================================
// ✅ CLAIM REWARD HELPER (UPDATED with Profile Background)
// ============================================================
async function claimReward(user, reward) {
  const Character = require('../models/Character');
  const Title = require('../models/Title');
  const Banner = require('../models/Banner');
  const ProfilePhoto = require('../models/ProfilePhoto');
  const ProfileBackground = require('../models/ProfileBackground');

  switch (reward.type) {
    case 'shards':
      user.shards = (user.shards || 0) + (reward.amount || 0);
      return {
        type: 'shards',
        amount: reward.amount,
        message: `+${reward.amount} Shards`
      };

    case 'gems':
      user.gems = (user.gems || 0) + (reward.amount || 0);
      return {
        type: 'gems',
        amount: reward.amount,
        message: `+${reward.amount} Gems`
      };

    case 'card':
      if (!reward.itemId) {
        throw new Error('Card ID is required');
      }
      const card = await Character.findById(reward.itemId);
      if (!card) {
        throw new Error('Card not found');
      }
      
      const cardAdded = user.addCard(card);
      if (!cardAdded) {
        user.gems = (user.gems || 0) + 200;
        return {
          type: 'gems',
          amount: 200,
          message: `Already own ${card.name}. Converted to 200 Gems!`
        };
      }
      return {
        type: 'card',
        card: {
          id: card._id,
          name: card.name,
          rarity: card.rarity,
          element: card.element,
          image: card.image,
          power: card.powerLevel || card.basePower || 25
        },
        message: `🃏 ${card.name} added to collection!`
      };

    case 'title':
      if (!reward.itemId) {
        throw new Error('Title ID is required');
      }
      const title = await Title.findById(reward.itemId);
      if (!title) {
        throw new Error('Title not found');
      }
      
      const alreadyHasTitle = user.achievements.titles.some(t => 
        t.titleId.toString() === reward.itemId.toString()
      );
      
      if (alreadyHasTitle) {
        user.gems = (user.gems || 0) + 100;
        return {
          type: 'gems',
          amount: 100,
          message: `Already have this title. Converted to 100 Gems!`
        };
      }
      
      user.achievements.titles.push({
        titleId: reward.itemId,
        unlockedAt: new Date(),
        isEquipped: false
      });
      return {
        type: 'title',
        title: {
          id: title._id,
          name: title.name,
          displayName: title.displayName,
          displayType: title.displayType
        },
        message: `🏆 Title "${title.displayName}" added!`
      };

    case 'banner':
      if (!reward.itemId) {
        throw new Error('Banner ID is required');
      }
      const banner = await Banner.findById(reward.itemId);
      if (!banner) {
        throw new Error('Banner not found');
      }
      
      const alreadyHasBanner = user.achievements.banners.some(b => 
        b.bannerId.toString() === reward.itemId.toString()
      );
      
      if (alreadyHasBanner) {
        user.gems = (user.gems || 0) + 100;
        return {
          type: 'gems',
          amount: 100,
          message: `Already have this banner. Converted to 100 Gems!`
        };
      }
      
      user.achievements.banners.push({
        bannerId: reward.itemId,
        unlockedAt: new Date(),
        isEquipped: false
      });
      return {
        type: 'banner',
        banner: {
          id: banner._id,
          name: banner.name,
          gifUrl: banner.gifUrl
        },
        message: `🎨 Banner "${banner.name}" added!`
      };

    case 'profilePhoto':
      if (!reward.itemId) {
        throw new Error('Profile Photo ID is required');
      }
      const photo = await ProfilePhoto.findById(reward.itemId);
      if (!photo) {
        throw new Error('Profile photo not found');
      }
      
      const alreadyHasPhoto = user.achievements.profilePhotos.some(p => 
        p.photoId.toString() === reward.itemId.toString()
      );
      
      if (alreadyHasPhoto) {
        user.gems = (user.gems || 0) + 100;
        return {
          type: 'gems',
          amount: 100,
          message: `Already have this photo. Converted to 100 Gems!`
        };
      }
      
      user.achievements.profilePhotos.push({
        photoId: reward.itemId,
        unlockedAt: new Date(),
        isEquipped: false
      });
      return {
        type: 'profilePhoto',
        photo: {
          id: photo._id,
          name: photo.name,
          imageUrl: photo.imageUrl
        },
        message: `📸 Profile photo "${photo.name}" added!`
      };

    // ✅ NEW: Profile Background reward
    case 'profileBackground':
      if (!reward.itemId) {
        throw new Error('Profile Background ID is required');
      }
      const background = await ProfileBackground.findById(reward.itemId);
      if (!background) {
        throw new Error('Profile background not found');
      }
      
      const alreadyHasBackground = user.achievements.profileBackgrounds.some(b => 
        b.backgroundId.toString() === reward.itemId.toString()
      );
      
      if (alreadyHasBackground) {
        user.gems = (user.gems || 0) + 100;
        return {
          type: 'gems',
          amount: 100,
          message: `Already have this background. Converted to 100 Gems!`
        };
      }
      
      user.achievements.profileBackgrounds.push({
        backgroundId: reward.itemId,
        unlockedAt: new Date(),
        isEquipped: false
      });

      // Increment total users for this background
      await background.incrementTotalUsers();

      return {
        type: 'profileBackground',
        background: {
          id: background._id,
          name: background.name,
          imageUrl: background.imageUrl,
          thumbnailUrl: background.thumbnailUrl,
          category: background.category,
          rarity: background.rarity
        },
        message: `🖼️ Profile background "${background.name}" added!`
      };

    default:
      throw new Error('Unknown reward type');
  }
}

// ============================================================
// ✅ CHECK AND UPDATE SEASON PASS ON GAME WIN
// ============================================================
async function checkSeasonPassOnWin(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    const season = await SeasonPass.getActiveSeason();
    if (!season) {
      return { success: false, message: 'No active season' };
    }

    const hasProgress = user.seasonPass && user.seasonPass.seasonId && 
                        user.seasonPass.seasonId.toString() === season._id.toString();

    if (!hasProgress) {
      user.seasonPass = {
        seasonId: season._id,
        currentTier: 1,
        correctGuesses: 0,
        progress: 0,
        unlockedTiers: [{ tier: 1, unlockedAt: new Date() }],
        claimedRewards: [],
        isCompleted: false,
        joinedAt: new Date()
      };
    }

    user.seasonPass.correctGuesses += 1;
    
    const newTier = Math.floor(user.seasonPass.correctGuesses / season.correctGuessesPerTier) + 1;
    const finalTier = Math.min(newTier, season.totalTiers);
    
    const tierAdvanced = finalTier > user.seasonPass.currentTier;
    
    user.seasonPass.currentTier = finalTier;
    user.seasonPass.progress = season.getProgressToNextTier(user.seasonPass.correctGuesses);
    
    if (finalTier >= season.totalTiers && !user.seasonPass.isCompleted) {
      user.seasonPass.isCompleted = true;
      user.seasonPass.completedAt = new Date();
      await giveCompletionRewards(user, season);
    }
    
    if (tierAdvanced) {
      for (let i = user.seasonPass.currentTier; i <= finalTier; i++) {
        const alreadyUnlocked = user.seasonPass.unlockedTiers.some(t => t.tier === i);
        if (!alreadyUnlocked) {
          user.seasonPass.unlockedTiers.push({ tier: i, unlockedAt: new Date() });
        }
      }
    }
    
    await user.save();

    const unlockedTiers = user.seasonPass.unlockedTiers.map(t => t.tier);
    
    return {
      success: true,
      seasonId: season._id,
      seasonNumber: season.seasonNumber,
      currentTier: user.seasonPass.currentTier,
      previousTier: user.seasonPass.currentTier - (tierAdvanced ? 1 : 0),
      tierAdvanced,
      progress: user.seasonPass.progress,
      isCompleted: user.seasonPass.isCompleted,
      correctGuesses: user.seasonPass.correctGuesses,
      unlockedTiers: unlockedTiers,
      hasNewUnlock: tierAdvanced
    };

  } catch (error) {
    console.error('Check season pass on win error:', error);
    return { success: false, message: error.message };
  }
}

// ============================================================
// ✅ GET USER SEASON PASS REWARDS STATUS
// ============================================================
async function getUserRewardsStatus(userId, seasonId) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    if (!user.seasonPass || user.seasonPass.seasonId.toString() !== seasonId.toString()) {
      return {
        success: true,
        hasProgress: false,
        message: 'No progress for this season'
      };
    }

    const season = await SeasonPass.findById(seasonId);
    if (!season) {
      return { success: false, message: 'Season not found' };
    }

    const unlockedTiers = user.seasonPass.unlockedTiers || [];
    const claimedRewards = user.seasonPass.claimedRewards || [];

    const tiers = await SeasonPassTier.find({ seasonId: season._id })
      .sort({ tier: 1 });

    const tierStatus = tiers.map(tier => {
      const isUnlocked = unlockedTiers.some(t => t.tier === tier.tier);
      const rewards = tier.rewards.map((reward, index) => {
        const isClaimed = claimedRewards.some(
          r => r.tier === tier.tier && r.rewardIndex === index
        );
        return {
          ...reward.toObject(),
          isClaimed,
          isClaimable: isUnlocked && !isClaimed
        };
      });

      return {
        tier: tier.tier,
        isUnlocked,
        rewards,
        allClaimed: rewards.every(r => r.isClaimed),
        hasClaimable: rewards.some(r => r.isClaimable)
      };
    });

    return {
      success: true,
      hasProgress: true,
      tierStatus,
      totalUnlocked: unlockedTiers.length,
      totalTiers: season.totalTiers
    };

  } catch (error) {
    console.error('Get user rewards status error:', error);
    return { success: false, message: error.message };
  }
}

// ============================================================
// ✅ SEED SEASON PASS TIERS
// ============================================================
async function seedSeasonPassTiers(seasonId) {
  try {
    const season = await SeasonPass.findById(seasonId);
    if (!season) {
      return { success: false, message: 'Season not found' };
    }

    await SeasonPassTier.deleteMany({ seasonId: season._id });

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

    return {
      success: true,
      message: `${season.totalTiers} tiers created for season ${season.seasonNumber}`
    };

  } catch (error) {
    console.error('Seed season pass tiers error:', error);
    return { success: false, message: error.message };
  }
}

// ============================================================
// ✅ EXPORT ALL FUNCTIONS
// ============================================================
module.exports = {
  updateSeasonPassProgress,
  giveCompletionRewards,
  claimReward,
  checkSeasonPassOnWin,
  getUserRewardsStatus,
  seedSeasonPassTiers
};