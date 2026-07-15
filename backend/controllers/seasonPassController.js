// /backend/controllers/seasonPassController.js
const SeasonPass = require('../models/SeasonPass');
const SeasonPassTier = require('../models/SeasonPassTier');
const User = require('../models/User');
const Character = require('../models/Character');
const Title = require('../models/Title');
const Banner = require('../models/Banner');
const ProfilePhoto = require('../models/ProfilePhoto');
const Notification = require('../models/Notification');

// ============================================================
// ✅ GET ACTIVE SEASON PASS
// ============================================================
exports.getActiveSeason = async (req, res) => {
  try {
    const season = await SeasonPass.getActiveSeason();
    
    if (!season) {
      return res.json({
        success: true,
        hasActiveSeason: false,
        message: 'No active season pass available'
      });
    }

    // Get user's progress for this season
    const user = await User.findById(req.user._id);
    const userProgress = user.seasonPass || {};

    // ✅ FIX: Only get tiers up to totalTiers (NOT beyond)
    const tiers = await SeasonPassTier.find({ 
      seasonId: season._id,
      tier: { $lte: season.totalTiers }
    }).sort({ tier: 1 });

    // Get unlocked tiers for this user
    const unlockedTiers = userProgress.unlockedTiers || [];
    const claimedRewards = userProgress.claimedRewards || [];

    // Build tier progress
    const tierProgress = tiers.map(tier => {
      const isUnlocked = unlockedTiers.some(t => t.tier === tier.tier);
      const rewards = tier.rewards.map((reward, index) => {
        const isClaimed = claimedRewards.some(
          r => r.tier === tier.tier && r.rewardIndex === index
        );
        return {
          ...reward.toObject(),
          isClaimed
        };
      });

      return {
        tier: tier.tier,
        isUnlocked,
        rewards,
        hasUnclaimedRewards: rewards.some(r => !r.isClaimed)
      };
    });

    // ✅ FIX: Added 'active' field to progress response
    res.json({
      success: true,
      hasActiveSeason: true,
      season: {
        id: season._id,
        seasonNumber: season.seasonNumber,
        seasonName: season.seasonName,
        description: season.description,
        startDate: season.startDate,
        endDate: season.endDate,
        totalTiers: season.totalTiers,
        correctGuessesPerTier: season.correctGuessesPerTier,
        timeRemaining: season.getTimeRemainingFormatted(),
        isActive: season.isActiveSeason()
      },
      progress: {
        currentTier: userProgress.currentTier || 1,
        correctGuesses: userProgress.correctGuesses || 0,
        progress: userProgress.progress || 0,
        isCompleted: userProgress.isCompleted || false,
        completedAt: userProgress.completedAt || null,
        joinedAt: userProgress.joinedAt || null,
        active: userProgress.active || false  // ✅ ADDED THIS LINE
      },
      tiers: tierProgress,
      unlockedTierCount: unlockedTiers.length,
      totalTiers: season.totalTiers
    });

  } catch (error) {
    console.error('Get active season error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get active season: ' + error.message
    });
  }
};

// ============================================================
// ✅ GET USER PROGRESS
// ============================================================
exports.getUserProgress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('seasonPass.seasonId');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const seasonPass = user.seasonPass;
    
    if (!seasonPass || !seasonPass.seasonId) {
      return res.json({
        success: true,
        hasProgress: false,
        message: 'No season pass progress found'
      });
    }

    const season = seasonPass.seasonId;
    const unlockedTiers = seasonPass.unlockedTiers || [];
    const claimedRewards = seasonPass.claimedRewards || [];

    // ✅ FIX: Only get tiers up to totalTiers (NOT beyond)
    const tiers = await SeasonPassTier.find({ 
      seasonId: season._id,
      tier: { $lte: season.totalTiers }
    }).sort({ tier: 1 });

    // Build tier progress
    const tierProgress = tiers.map(tier => {
      const isUnlocked = unlockedTiers.some(t => t.tier === tier.tier);
      const rewards = tier.rewards.map((reward, index) => {
        const isClaimed = claimedRewards.some(
          r => r.tier === tier.tier && r.rewardIndex === index
        );
        return {
          ...reward.toObject(),
          isClaimed
        };
      });

      return {
        tier: tier.tier,
        isUnlocked,
        rewards,
        hasUnclaimedRewards: rewards.some(r => !r.isClaimed)
      };
    });

    // ✅ FIX: Added 'active' field to progress response
    res.json({
      success: true,
      hasProgress: true,
      season: {
        id: season._id,
        seasonNumber: season.seasonNumber,
        seasonName: season.seasonName,
        totalTiers: season.totalTiers,
        correctGuessesPerTier: season.correctGuessesPerTier,
        endDate: season.endDate,
        timeRemaining: season.getTimeRemainingFormatted()
      },
      progress: {
        currentTier: seasonPass.currentTier || 1,
        correctGuesses: seasonPass.correctGuesses || 0,
        progress: seasonPass.progress || 0,
        isCompleted: seasonPass.isCompleted || false,
        completedAt: seasonPass.completedAt || null,
        joinedAt: seasonPass.joinedAt || null,
        active: seasonPass.active || false  // ✅ ADDED THIS LINE
      },
      tiers: tierProgress,
      unlockedTierCount: unlockedTiers.length,
      totalTiers: season.totalTiers
    });

  } catch (error) {
    console.error('Get user progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user progress: ' + error.message
    });
  }
};

// ============================================================
// ✅ CLAIM TIER REWARD
// ============================================================
exports.claimTierReward = async (req, res) => {
  try {
    const { tier } = req.params;
    const { rewardIndex } = req.body;
    const userId = req.user._id;

    if (rewardIndex === undefined) {
      return res.status(400).json({
        success: false,
        message: 'rewardIndex is required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has season pass progress
    if (!user.seasonPass || !user.seasonPass.seasonId) {
      return res.status(400).json({
        success: false,
        message: 'You have not joined this season pass'
      });
    }

    const season = await SeasonPass.findById(user.seasonPass.seasonId);
    if (!season) {
      return res.status(404).json({
        success: false,
        message: 'Season not found'
      });
    }

    // Check if tier is within valid range
    if (parseInt(tier) > season.totalTiers) {
      return res.status(400).json({
        success: false,
        message: `Tier ${tier} does not exist. Max tier is ${season.totalTiers}`
      });
    }

    // Check if season is active
    if (!season.isActiveSeason()) {
      return res.status(400).json({
        success: false,
        message: 'Season is not active'
      });
    }

    // Check if tier is unlocked
    const isUnlocked = user.seasonPass.unlockedTiers.some(t => t.tier === parseInt(tier));
    if (!isUnlocked) {
      return res.status(400).json({
        success: false,
        message: 'Tier is not unlocked yet'
      });
    }

    // Check if already claimed
    const alreadyClaimed = user.seasonPass.claimedRewards.some(
      r => r.tier === parseInt(tier) && r.rewardIndex === rewardIndex
    );
    if (alreadyClaimed) {
      return res.status(400).json({
        success: false,
        message: 'Reward already claimed'
      });
    }

    // Get tier data
    const tierData = await SeasonPassTier.findOne({
      seasonId: season._id,
      tier: parseInt(tier)
    });

    if (!tierData) {
      return res.status(404).json({
        success: false,
        message: 'Tier not found'
      });
    }

    if (rewardIndex >= tierData.rewards.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reward index'
      });
    }

    const reward = tierData.rewards[rewardIndex];

    // Claim reward based on type
    let rewardResult = null;

    try {
      rewardResult = await claimReward(user, reward);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    // Mark as claimed
    user.seasonPass.claimedRewards.push({
      tier: parseInt(tier),
      rewardIndex: rewardIndex,
      claimedAt: new Date()
    });

    await user.save();

    // Create notification
    await Notification.createNotification({
      userId: user._id,
      type: 'system',
      title: '🎁 Season Pass Reward Claimed!',
      message: `You claimed ${reward.itemName || reward.type} from Tier ${tier}!`,
      icon: '🎁',
      color: 'gold',
      priority: 'high'
    });

    res.json({
      success: true,
      message: `Reward claimed successfully!`,
      reward: rewardResult,
      claimedRewards: user.seasonPass.claimedRewards
    });

  } catch (error) {
    console.error('Claim tier reward error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to claim reward: ' + error.message
    });
  }
};

// ============================================================
// ✅ HELPER: Claim Reward
// ============================================================
async function claimReward(user, reward) {
  switch (reward.type) {
    case 'shards':
      user.shards = (user.shards || 0) + (reward.amount || 0);
      await user.save();
      return {
        type: 'shards',
        amount: reward.amount,
        message: `+${reward.amount} Shards`
      };

    case 'gems':
      user.gems = (user.gems || 0) + (reward.amount || 0);
      await user.save();
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
        await user.save();
        return {
          type: 'gems',
          amount: 200,
          message: `You already own ${card.name}. Converted to 200 Gems!`
        };
      }
      await user.save();
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
        message: `🃏 ${card.name} added to your collection!`
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
        await user.save();
        return {
          type: 'gems',
          amount: 100,
          message: `You already have this title. Converted to 100 Gems!`
        };
      }
      
      user.achievements.titles.push({
        titleId: reward.itemId,
        unlockedAt: new Date(),
        isEquipped: false
      });
      await user.save();
      return {
        type: 'title',
        title: {
          id: title._id,
          name: title.name,
          displayName: title.displayName,
          displayType: title.displayType
        },
        message: `🏆 Title "${title.displayName}" added to your collection!`
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
        await user.save();
        return {
          type: 'gems',
          amount: 100,
          message: `You already have this banner. Converted to 100 Gems!`
        };
      }
      
      user.achievements.banners.push({
        bannerId: reward.itemId,
        unlockedAt: new Date(),
        isEquipped: false
      });
      await user.save();
      return {
        type: 'banner',
        banner: {
          id: banner._id,
          name: banner.name,
          gifUrl: banner.gifUrl
        },
        message: `🎨 Banner "${banner.name}" added to your collection!`
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
        await user.save();
        return {
          type: 'gems',
          amount: 100,
          message: `You already have this profile photo. Converted to 100 Gems!`
        };
      }
      
      user.achievements.profilePhotos.push({
        photoId: reward.itemId,
        unlockedAt: new Date(),
        isEquipped: false
      });
      await user.save();
      return {
        type: 'profilePhoto',
        photo: {
          id: photo._id,
          name: photo.name,
          imageUrl: photo.imageUrl
        },
        message: `📸 Profile photo "${photo.name}" added to your collection!`
      };

    default:
      throw new Error('Unknown reward type');
  }
}

// ============================================================
// ✅ GET SEASON LEADERBOARD
// ============================================================
exports.getSeasonLeaderboard = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    const season = await SeasonPass.getActiveSeason();
    if (!season) {
      return res.json({
        success: true,
        hasActiveSeason: false,
        message: 'No active season'
      });
    }

    const leaderboard = await User.getSeasonPassLeaderboard(season._id, limit);

    // Get user's rank
    const userId = req.user._id;
    let userRank = null;
    
    const allUsers = await User.find({
      'seasonPass.seasonId': season._id
    })
    .select('username seasonPass.currentTier seasonPass.correctGuesses')
    .sort({ 'seasonPass.currentTier': -1, 'seasonPass.correctGuesses': -1 });

    const userIndex = allUsers.findIndex(u => u._id.toString() === userId.toString());
    if (userIndex !== -1) {
      userRank = userIndex + 1;
    }

    res.json({
      success: true,
      hasActiveSeason: true,
      season: {
        id: season._id,
        seasonNumber: season.seasonNumber,
        seasonName: season.seasonName,
        totalTiers: season.totalTiers
      },
      leaderboard: leaderboard.map((user, index) => ({
        rank: index + 1,
        username: user.username,
        currentTier: user.seasonPass.currentTier || 1,
        correctGuesses: user.seasonPass.correctGuesses || 0,
        isCompleted: user.seasonPass.isCompleted || false
      })),
      userRank: userRank,
      totalPlayers: allUsers.length
    });

  } catch (error) {
    console.error('Get season leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get leaderboard: ' + error.message
    });
  }
};

// ============================================================
// ✅ GET SEASON HISTORY
// ============================================================
exports.getSeasonHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get all seasons the user has participated in
    const seasons = await SeasonPass.find({
      isPublished: true
    }).sort({ seasonNumber: -1 });

    const history = [];

    for (const season of seasons) {
      // Check if user has progress for this season
      const userProgress = user.seasonPass;
      if (userProgress && userProgress.seasonId && 
          userProgress.seasonId.toString() === season._id.toString()) {
        history.push({
          seasonNumber: season.seasonNumber,
          seasonName: season.seasonName,
          currentTier: userProgress.currentTier || 1,
          correctGuesses: userProgress.correctGuesses || 0,
          isCompleted: userProgress.isCompleted || false,
          completedAt: userProgress.completedAt || null,
          joinedAt: userProgress.joinedAt || null,
          totalTiers: season.totalTiers
        });
      }
    }

    res.json({
      success: true,
      history: history
    });

  } catch (error) {
    console.error('Get season history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get season history: ' + error.message
    });
  }
};