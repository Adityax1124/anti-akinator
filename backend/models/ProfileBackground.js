const mongoose = require('mongoose');

// ============================================================
// ✅ PROFILE BACKGROUND MODEL
// ============================================================
const profileBackgroundSchema = new mongoose.Schema({
  // ===== BASIC INFO =====
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  description: {
    type: String,
    default: '',
    maxlength: 200
  },

  // ===== IMAGE/GIF URL =====
  imageUrl: {
    type: String,
    required: true,
    trim: true
  },

  // ===== THUMBNAIL (Optional - for faster loading) =====
  thumbnailUrl: {
    type: String,
    default: null
  },

  // ===== CATEGORY =====
  category: {
    type: String,
    enum: ['anime', 'nature', 'abstract', 'space', 'seasonal', 'special', 'event'],
    default: 'anime'
  },

  // ===== RARITY (For display only) =====
  rarity: {
    type: String,
    enum: ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'],
    default: 'Common'
  },

  // ===== UNLOCK CONDITIONS =====
  unlockType: {
    type: String,
    enum: ['season_pass', 'achievement', 'admin_gift', 'event', 'shop'],
    default: 'season_pass'
  },
  unlockData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },

  // ===== STATUS =====
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false // Only one background can be default
  },

  // ===== USAGE STATS =====
  timesEquipped: {
    type: Number,
    default: 0
  },
  totalUsers: {
    type: Number,
    default: 0
  },

  // ===== CREATED BY =====
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // ===== TIMESTAMPS =====
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: {
    transform: (doc, ret) => {
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    transform: (doc, ret) => {
      delete ret.__v;
      return ret;
    }
  }
});

// ============================================================
// ✅ INDEXES
// ============================================================
profileBackgroundSchema.index({ isActive: 1 });
profileBackgroundSchema.index({ category: 1 });
profileBackgroundSchema.index({ rarity: 1 });
profileBackgroundSchema.index({ isDefault: 1 });
profileBackgroundSchema.index({ unlockType: 1 });

// ============================================================
// ✅ METHODS
// ============================================================

// Increment equip count
profileBackgroundSchema.methods.incrementEquipCount = async function() {
  this.timesEquipped += 1;
  await this.save();
  return this;
};

// Increment total users
profileBackgroundSchema.methods.incrementTotalUsers = async function() {
  this.totalUsers += 1;
  await this.save();
  return this;
};

// Decrement total users
profileBackgroundSchema.methods.decrementTotalUsers = async function() {
  if (this.totalUsers > 0) {
    this.totalUsers -= 1;
    await this.save();
  }
  return this;
};

// ============================================================
// ✅ STATICS
// ============================================================

// Get all active backgrounds
profileBackgroundSchema.statics.getActiveBackgrounds = async function() {
  return this.find({ isActive: true }).sort({ createdAt: -1 });
};

// Get default background
profileBackgroundSchema.statics.getDefaultBackground = async function() {
  let bg = await this.findOne({ isDefault: true, isActive: true });
  if (!bg) {
    // If no default, create one
    bg = new this({
      name: 'Starry Night',
      imageUrl: '/bg/starry-night.gif',
      description: 'A beautiful starry night sky',
      category: 'space',
      rarity: 'Common',
      isDefault: true,
      isActive: true
    });
    await bg.save();
  }
  return bg;
};

// Get backgrounds by category
profileBackgroundSchema.statics.getByCategory = async function(category) {
  return this.find({ category, isActive: true }).sort({ rarity: -1 });
};

// Get backgrounds by rarity
profileBackgroundSchema.statics.getByRarity = async function(rarity) {
  return this.find({ rarity, isActive: true });
};

// Get backgrounds unlocked via season pass
profileBackgroundSchema.statics.getSeasonPassBackgrounds = async function() {
  return this.find({ unlockType: 'season_pass', isActive: true });
};

// Check if a background exists
profileBackgroundSchema.statics.backgroundExists = async function(id) {
  const count = await this.countDocuments({ _id: id });
  return count > 0;
};

// ============================================================
// ✅ PRE-SAVE: Ensure only one default
// ============================================================
profileBackgroundSchema.pre('save', async function(next) {
  this.updatedAt = new Date();
  
  // If this is being set as default, remove default from others
  if (this.isDefault) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id }, isDefault: true },
      { isDefault: false }
    );
  }
  
  next();
});

// ============================================================
// ✅ PRE-REMOVE: Clean up users using this background
// ============================================================
profileBackgroundSchema.pre('remove', async function(next) {
  const User = mongoose.model('User');
  await User.updateMany(
    { 'equipped.profileBackground': this._id },
    { 'equipped.profileBackground': null }
  );
  await User.updateMany(
    { 'achievements.profileBackgrounds.backgroundId': this._id },
    { $pull: { 'achievements.profileBackgrounds': { backgroundId: this._id } } }
  );
  next();
});

module.exports = mongoose.model('ProfileBackground', profileBackgroundSchema);