const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const ShopItem = require('../models/ShopItem');
const User = require('../models/User');
const Banner = require('../models/Banner');
const ProfilePhoto = require('../models/ProfilePhoto');

// ============================================================
// GET ALL ACTIVE SHOP ITEMS
// ============================================================
router.get('/items', authMiddleware, async (req, res) => {
  try {
    console.log('📦 Fetching shop items for user:', req.user.username);
    
    const now = new Date();
    
    // Get all active shop items
    const shopItems = await ShopItem.find({ isActive: true })
      .populate('itemId')
      .sort({ createdAt: -1 });

    console.log('📦 Raw shop items found:', shopItems.length);

    // Filter out items where itemId is null (deleted parent)
    const validItems = shopItems.filter(item => item.itemId !== null);

    // Filter time-limited items
    const activeItems = validItems.filter(item => {
      if (item.isLimited) {
        if (item.startDate && new Date(item.startDate) > now) return false;
        if (item.endDate && new Date(item.endDate) < now) return false;
      }
      return true;
    });

    console.log('📦 Active shop items after filtering:', activeItems.length);

    // Get user's purchased items
    const user = await User.findById(req.user._id);
    const purchasedIds = user.purchasedItems || [];

    // Format items for response
    const formattedItems = activeItems.map(item => ({
      _id: item._id,
      itemType: item.itemType,
      price: item.price,
      isLimited: item.isLimited,
      startDate: item.startDate,
      endDate: item.endDate,
      isPurchased: purchasedIds.includes(item._id.toString()),
      item: item.itemId
    }));

    console.log('📦 Formatted items sent:', formattedItems.length);

    res.json({
      success: true,
      items: formattedItems
    });
  } catch (error) {
    console.error('❌ Get shop items error:', error.message);
    console.error('❌ Full error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching shop items: ' + error.message
    });
  }
});

// ============================================================
// PURCHASE ITEM
// ============================================================
router.post('/buy', authMiddleware, async (req, res) => {
  try {
    const { shopItemId } = req.body;

    console.log('🛒 Purchase request for user:', req.user.username);
    console.log('🛒 Shop item ID:', shopItemId);

    if (!shopItemId) {
      return res.status(400).json({
        success: false,
        message: 'Shop item ID is required'
      });
    }

    // Get user and shop item
    const user = await User.findById(req.user._id);
    const shopItem = await ShopItem.findById(shopItemId).populate('itemId');

    if (!shopItem) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in shop'
      });
    }

    // Check if itemId is populated
    if (!shopItem.itemId) {
      return res.status(404).json({
        success: false,
        message: 'Item reference is missing or deleted'
      });
    }

    console.log('🛒 Item found:', shopItem.itemId.name || 'Unknown');

    // Check if item is active
    if (!shopItem.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This item is no longer available'
      });
    }

    // Check time-limited
    const now = new Date();
    if (shopItem.isLimited) {
      if (shopItem.startDate && new Date(shopItem.startDate) > now) {
        return res.status(400).json({
          success: false,
          message: 'This item is not yet available'
        });
      }
      if (shopItem.endDate && new Date(shopItem.endDate) < now) {
        return res.status(400).json({
          success: false,
          message: 'This item is no longer available'
        });
      }
    }

    // Check if already purchased
    if (user.purchasedItems && user.purchasedItems.includes(shopItemId)) {
      return res.status(400).json({
        success: false,
        message: 'You already own this item'
      });
    }

    // Check shards
    if (user.shards < shopItem.price) {
      return res.status(400).json({
        success: false,
        message: `Not enough shards! You need ${shopItem.price} shards, you have ${user.shards}`
      });
    }

    // ===== PROCESS PURCHASE =====
    // Deduct shards
    user.shards -= shopItem.price;

    // Add to purchased items
    if (!user.purchasedItems) user.purchasedItems = [];
    user.purchasedItems.push(shopItemId);

    // Add to achievements (so user can equip it)
    if (shopItem.itemType === 'banner') {
      user.achievements.banners.push({
        bannerId: shopItem.itemId._id,
        unlockedAt: new Date(),
        isEquipped: false
      });
      console.log(`🎨 Added banner to user's achievements: ${shopItem.itemId.name}`);
    } else if (shopItem.itemType === 'profilePhoto') {
      user.achievements.profilePhotos.push({
        photoId: shopItem.itemId._id,
        unlockedAt: new Date(),
        isEquipped: false
      });
      console.log(`📸 Added profile photo to user's achievements: ${shopItem.itemId.name}`);
    }

    await user.save();

    console.log(`✅ ${req.user.username} purchased ${shopItem.itemType}: ${shopItem.itemId.name} for ${shopItem.price} shards`);

    res.json({
      success: true,
      message: `🎉 Successfully purchased ${shopItem.itemId.name}!`,
      shards: user.shards,
      purchasedItem: shopItem
    });
  } catch (error) {
    console.error('❌ Purchase error:', error.message);
    console.error('❌ Full error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing purchase: ' + error.message
    });
  }
});

// ============================================================
// GET USER'S PURCHASED ITEMS
// ============================================================
router.get('/my-items', authMiddleware, async (req, res) => {
  try {
    console.log('📦 Fetching purchased items for user:', req.user.username);
    
    const user = await User.findById(req.user._id);
    const purchasedIds = user.purchasedItems || [];
    
    if (purchasedIds.length === 0) {
      return res.json({
        success: true,
        items: []
      });
    }
    
    const items = await ShopItem.find({
      _id: { $in: purchasedIds }
    }).populate('itemId');

    console.log('📦 Purchased items found:', items.length);

    const formattedItems = items.map(item => ({
      ...item.toObject(),
      isEquipped: user.equipped?.[item.itemType]?.toString() === item.itemId?._id?.toString()
    }));

    res.json({
      success: true,
      items: formattedItems
    });
  } catch (error) {
    console.error('❌ Get purchased items error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching purchased items'
    });
  }
});

module.exports = router;