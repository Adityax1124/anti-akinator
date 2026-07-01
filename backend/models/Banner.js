const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 100
  },
  gifUrl: { 
    type: String, 
    required: true,
    validate: {
      validator: function(v) {
        // Check if URL is valid format
        try {
          new URL(v);
        } catch {
          return false;
        }
        // Check if URL ends with .gif or .webp (case insensitive)
        return /\.(gif|webp)(\?.*)?$/i.test(v);
      },
      message: 'GIF URL must be a valid URL ending with .gif or .webp'
    }
  },
  description: { 
    type: String, 
    default: '',
    maxlength: 500
  },
  unlockType: { 
    type: String, 
    enum: ['total_guesses', 'anime_guesses', 'season_rank', 'special'],
    required: true 
  },
  unlockCondition: { 
    type: mongoose.Schema.Types.Mixed, 
    required: true,
    validate: {
      validator: function(v) {
        // Validate based on unlockType
        if (this.unlockType === 'total_guesses') {
          return v && typeof v.totalGuesses === 'number' && v.totalGuesses > 0;
        }
        if (this.unlockType === 'anime_guesses') {
          return v && v.anime && typeof v.anime === 'string' && v.anime.trim() !== '' &&
                 typeof v.count === 'number' && v.count > 0;
        }
        if (this.unlockType === 'season_rank') {
          return v && typeof v.seasonRank === 'number' && v.seasonRank > 0;
        }
        if (this.unlockType === 'special') {
          return v && typeof v === 'object';
        }
        return true;
      },
      message: 'Invalid unlock condition for the selected unlock type'
    }
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

// Add compound index for better performance
bannerSchema.index({ name: 1 });
bannerSchema.index({ isActive: 1, rarity: 1 });

module.exports = mongoose.model('Banner', bannerSchema);