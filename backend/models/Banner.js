const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true
  },
  gifUrl: { 
    type: String, 
    required: true
    // ✅ No validation - accepts any URL
  },
  description: { 
    type: String, 
    default: ''
  },
  unlockType: { 
    type: String, 
    enum: ['total_guesses', 'anime_guesses', 'season_rank', 'special'],
    required: true 
  },
  unlockCondition: { 
    type: mongoose.Schema.Types.Mixed, 
    required: true
    // ✅ No validation - accepts any format
  },
  category: { 
    type: String, 
    enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'anime', 'season'],
    default: 'bronze'
  },
  rarity: { 
    type: String, 
    enum: ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'],
    default: 'Common'
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// Add index for better performance
bannerSchema.index({ name: 1 });
bannerSchema.index({ isActive: 1, rarity: 1 });

module.exports = mongoose.model('Banner', bannerSchema);