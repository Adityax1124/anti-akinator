// /backend/controllers/promotionController.js
const Promotion = require('../models/Promotion');
const User = require('../models/User');
const Title = require('../models/Title');
const ProfilePhoto = require('../models/ProfilePhoto');
const Banner = require('../models/Banner');

// ============================================================
// USER CONTROLLERS
// ============================================================

// ============================================================
// @desc    Submit a new promotion video
// @route   POST /api/promotion/submit
// @access  Private
// ============================================================
exports.submitPromotion = async (req, res) => {
  try {
    const {
      platform,
      videoLink,
      videoTitle,
      videoDescription,
      desiredProfilePhoto,
      desiredBanner,
      desiredTitle
    } = req.body;

    // Validate required fields
    if (!platform || !videoLink || !videoTitle || !desiredProfilePhoto || !desiredBanner || !desiredTitle) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Validate platform
    const validPlatforms = ['youtube', 'instagram', 'tiktok', 'facebook', 'other'];
    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid platform selected'
      });
    }

    // Validate video link (basic URL validation)
    try {
      new URL(videoLink);
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid video URL'
      });
    }

    // Check if user already has a pending submission
    const existingSubmission = await Promotion.findOne({
      userId: req.user._id,
      status: { $in: ['pending', 'approved'] }
    });

    if (existingSubmission) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending or approved submission. Please wait for it to be processed.'
      });
    }

    // Check if user has reached maximum submissions (3 per month)
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const monthlySubmissions = await Promotion.countDocuments({
      userId: req.user._id,
      submittedAt: { $gte: oneMonthAgo }
    });

    if (monthlySubmissions >= 3) {
      return res.status(400).json({
        success: false,
        message: 'You have reached the maximum of 3 submissions per month. Please try again next month.'
      });
    }

    // Create new promotion submission
    const promotion = new Promotion({
      userId: req.user._id,
      username: req.user.username,
      email: req.user.email,
      platform,
      videoLink,
      videoTitle,
      videoDescription: videoDescription || '',
      desiredProfilePhoto,
      desiredBanner,
      desiredTitle,
      status: 'pending',
      submittedAt: new Date(),
      milestones: {
        views10k: { achieved: false, rewardGiven: false },
        views50k: { achieved: false, rewardGiven: false },
        views100k: { achieved: false, rewardGiven: false }
      }
    });

    await promotion.save();

    res.status(201).json({
      success: true,
      message: 'Your promotion video has been submitted successfully! Our team will review it shortly.',
      data: {
        id: promotion._id,
        status: promotion.status,
        submittedAt: promotion.submittedAt
      }
    });

  } catch (error) {
    console.error('Submit promotion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit promotion: ' + error.message
    });
  }
};

// ============================================================
// @desc    Get user's promotion submissions
// @route   GET /api/promotion/my-submissions
// @access  Private
// ============================================================
exports.getMySubmissions = async (req, res) => {
  try {
    const submissions = await Promotion.find({ userId: req.user._id })
      .sort({ submittedAt: -1 });

    res.status(200).json({
      success: true,
      count: submissions.length,
      data: submissions
    });

  } catch (error) {
    console.error('Get my submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch submissions'
    });
  }
};

// ============================================================
// @desc    Get single promotion submission
// @route   GET /api/promotion/:id
// @access  Private
// ============================================================
exports.getPromotionById = async (req, res) => {
  try {
    const promotion = await Promotion.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Promotion not found'
      });
    }

    res.status(200).json({
      success: true,
      data: promotion
    });

  } catch (error) {
    console.error('Get promotion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch promotion'
    });
  }
};

// ============================================================
// ADMIN CONTROLLERS
// ============================================================

// ============================================================
// @desc    Get all promotions (admin)
// @route   GET /api/admin/promotions
// @access  Private (Admin only)
// ============================================================
exports.getAllPromotions = async (req, res) => {
  try {
    const { status, limit = 50, page = 1 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const [promotions, total] = await Promise.all([
      Promotion.find(filter)
        .sort({ submittedAt: -1 })
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .populate('userId', 'username email')
        .populate('verifiedBy', 'username'),
      Promotion.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: promotions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get all promotions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch promotions'
    });
  }
};

// ============================================================
// @desc    Get single promotion (admin)
// @route   GET /api/admin/promotions/:id
// @access  Private (Admin only)
// ============================================================
exports.getPromotionDetail = async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id)
      .populate('userId', 'username email')
      .populate('verifiedBy', 'username');

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Promotion not found'
      });
    }

    res.status(200).json({
      success: true,
      data: promotion
    });

  } catch (error) {
    console.error('Get promotion detail error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch promotion'
    });
  }
};

// ============================================================
// @desc    Update promotion status (admin)
// @route   PUT /api/admin/promotions/:id/status
// @access  Private (Admin only)
// ============================================================
exports.updatePromotionStatus = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const validStatuses = ['pending', 'approved', 'rejected', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const promotion = await Promotion.findById(req.params.id);

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Promotion not found'
      });
    }

    promotion.status = status;
    promotion.verifiedBy = req.user._id;
    promotion.updatedAt = new Date();
    
    if (adminNotes !== undefined) {
      promotion.adminNotes = adminNotes;
    }

    await promotion.save();

    res.status(200).json({
      success: true,
      message: `Promotion status updated to ${status}`,
      data: promotion
    });

  } catch (error) {
    console.error('Update promotion status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update promotion'
    });
  }
};

// ============================================================
// @desc    Verify and give reward for milestone (admin)
// @route   POST /api/admin/promotions/:id/reward
// @access  Private (Admin only)
// ============================================================
exports.giveReward = async (req, res) => {
  try {
    const { milestone } = req.body;

    if (!milestone) {
      return res.status(400).json({
        success: false,
        message: 'Milestone is required (10k, 50k, or 100k)'
      });
    }

    const validMilestones = ['10k', '50k', '100k'];
    if (!validMilestones.includes(milestone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid milestone. Must be 10k, 50k, or 100k'
      });
    }

    const promotion = await Promotion.findById(req.params.id).populate('userId');

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Promotion not found'
      });
    }

    if (promotion.status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Cannot give reward to a rejected promotion'
      });
    }

    const user = await User.findById(promotion.userId._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Map milestone to reward data
    const milestoneMap = {
      '10k': {
        field: 'views10k',
        rewardType: 'profilePhoto',
        rewardName: 'Animated Profile Photo',
        description: `10k views reward: ${promotion.desiredProfilePhoto} profile photo`
      },
      '50k': {
        field: 'views50k',
        rewardType: 'banner',
        rewardName: 'Animated Banner',
        description: `50k views reward: ${promotion.desiredBanner} banner`
      },
      '100k': {
        field: 'views100k',
        rewardType: 'title',
        rewardName: 'Partner Title',
        description: `100k views reward: ${promotion.desiredTitle} title`
      }
    };

    const rewardData = milestoneMap[milestone];
    const milestoneField = promotion.milestones[rewardData.field];

    // Check if already rewarded
    if (milestoneField.rewardGiven) {
      return res.status(400).json({
        success: false,
        message: `This milestone (${milestone}) has already been rewarded`
      });
    }

    // Mark milestone as achieved (if not already)
    if (!milestoneField.achieved) {
      milestoneField.achieved = true;
      milestoneField.verifiedAt = new Date();
    }

    // Give the reward
    let rewardGiven = false;
    let rewardMessage = '';

    if (rewardData.rewardType === 'profilePhoto') {
      // Create and give profile photo
      const photo = await ProfilePhoto.findOne({ name: { $regex: promotion.desiredProfilePhoto, $options: 'i' } });
      
      if (photo) {
        // User already has the photo? Check and add
        const alreadyHas = user.achievements.profilePhotos.some(
          p => p.photoId?.toString() === photo._id.toString()
        );
        
        if (!alreadyHas) {
          user.achievements.profilePhotos.push({
            photoId: photo._id,
            isEquipped: false,
            unlockedAt: new Date()
          });
          rewardGiven = true;
          rewardMessage = `Animated Profile Photo for "${promotion.desiredProfilePhoto}" has been added to your collection!`;
        } else {
          rewardMessage = `You already have this profile photo.`;
        }
      } else {
        // Create new profile photo
        const newPhoto = new ProfilePhoto({
          name: `${promotion.desiredProfilePhoto} (Promotion)`,
          characterName: promotion.desiredProfilePhoto,
          imageUrl: 'https://via.placeholder.com/200x200/6c63ff/ffffff?text=Promotion',
          anime: 'Promotion Reward',
          description: `10k views reward for ${promotion.username}`,
          rarity: 'Epic',
          isActive: true
        });
        await newPhoto.save();
        
        user.achievements.profilePhotos.push({
          photoId: newPhoto._id,
          isEquipped: false,
          unlockedAt: new Date()
        });
        rewardGiven = true;
        rewardMessage = `Animated Profile Photo for "${promotion.desiredProfilePhoto}" has been created and added to your collection!`;
      }
    } 
    else if (rewardData.rewardType === 'banner') {
      // Create and give banner
      const banner = await Banner.findOne({ name: { $regex: promotion.desiredBanner, $options: 'i' } });
      
      if (banner) {
        const alreadyHas = user.achievements.banners.some(
          b => b.bannerId?.toString() === banner._id.toString()
        );
        
        if (!alreadyHas) {
          user.achievements.banners.push({
            bannerId: banner._id,
            isEquipped: false,
            unlockedAt: new Date()
          });
          rewardGiven = true;
          rewardMessage = `Animated Banner for "${promotion.desiredBanner}" has been added to your collection!`;
        } else {
          rewardMessage = `You already have this banner.`;
        }
      } else {
        // Create new banner
        const newBanner = new Banner({
          name: `${promotion.desiredBanner} (Promotion)`,
          gifUrl: 'https://via.placeholder.com/800x200/6c63ff/ffffff?text=Promotion+Banner',
          description: `50k views reward for ${promotion.username}`,
          unlockType: 'admin_gift',
          unlockCondition: { totalGuesses: 0 },
          category: 'promotion',
          rarity: 'Epic',
          isActive: true
        });
        await newBanner.save();
        
        user.achievements.banners.push({
          bannerId: newBanner._id,
          isEquipped: false,
          unlockedAt: new Date()
        });
        rewardGiven = true;
        rewardMessage = `Animated Banner for "${promotion.desiredBanner}" has been created and added to your collection!`;
      }
    } 
    else if (rewardData.rewardType === 'title') {
      // Create and give title
      const title = await Title.findOne({ name: { $regex: promotion.desiredTitle, $options: 'i' } });
      
      if (title) {
        const alreadyHas = user.achievements.titles.some(
          t => t.titleId?.toString() === title._id.toString()
        );
        
        if (!alreadyHas) {
          user.achievements.titles.push({
            titleId: title._id,
            isEquipped: false,
            unlockedAt: new Date()
          });
          rewardGiven = true;
          rewardMessage = `Partner Title "${promotion.desiredTitle}" has been added to your collection!`;
        } else {
          rewardMessage = `You already have this title.`;
        }
      } else {
        // Create new legendary title
        const newTitle = new Title({
          name: promotion.desiredTitle.toLowerCase().replace(/\s+/g, '_'),
          displayName: promotion.desiredTitle,
          description: `Exclusive Partner Title for ${promotion.username} - 100k views achievement`,
          displayType: 'prefix',
          unlockType: 'admin_gift',
          unlockCondition: { totalGuesses: 0 },
          rarity: 'Legendary',
          isActive: true
        });
        await newTitle.save();
        
        user.achievements.titles.push({
          titleId: newTitle._id,
          isEquipped: false,
          unlockedAt: new Date()
        });
        rewardGiven = true;
        rewardMessage = `🎉 Partner Title "${promotion.desiredTitle}" (Legendary) has been created exclusively for you!`;
      }
    }

    // Mark milestone as rewarded
    milestoneField.rewardGiven = true;
    milestoneField.rewardGivenAt = new Date();

    // Save user and promotion
    await user.save();
    await promotion.save();

    res.status(200).json({
      success: true,
      message: rewardMessage,
      rewardGiven,
      data: promotion
    });

  } catch (error) {
    console.error('Give reward error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to give reward: ' + error.message
    });
  }
};

// ============================================================
// @desc    Delete promotion (admin)
// @route   DELETE /api/admin/promotions/:id
// @access  Private (Admin only)
// ============================================================
exports.deletePromotion = async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id);

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Promotion not found'
      });
    }

    await promotion.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Promotion deleted successfully'
    });

  } catch (error) {
    console.error('Delete promotion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete promotion'
    });
  }
};

// ============================================================
// @desc    Get promotion stats (admin)
// @route   GET /api/admin/promotions/stats
// @access  Private (Admin only)
// ============================================================
exports.getPromotionStats = async (req, res) => {
  try {
    const [total, pending, approved, rejected, completed] = await Promise.all([
      Promotion.countDocuments(),
      Promotion.countDocuments({ status: 'pending' }),
      Promotion.countDocuments({ status: 'approved' }),
      Promotion.countDocuments({ status: 'rejected' }),
      Promotion.countDocuments({ status: 'completed' })
    ]);

    const milestonesAchieved = await Promotion.aggregate([
      {
        $group: {
          _id: null,
          views10k: { $sum: { $cond: ['$milestones.views10k.achieved', 1, 0] } },
          views50k: { $sum: { $cond: ['$milestones.views50k.achieved', 1, 0] } },
          views100k: { $sum: { $cond: ['$milestones.views100k.achieved', 1, 0] } }
        }
      }
    ]);

    const stats = {
      total,
      pending,
      approved,
      rejected,
      completed,
      milestones: milestonesAchieved[0] || { views10k: 0, views50k: 0, views100k: 0 }
    };

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get promotion stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch promotion stats'
    });
  }
};