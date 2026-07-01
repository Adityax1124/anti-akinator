const mongoose = require('mongoose');

const profilePhotoSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  characterName: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  imageUrl: { 
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
        // Check if URL ends with a valid image extension (case insensitive)
        return /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(v);
      },
      message: 'Image URL must be a valid URL ending with .jpg, .jpeg, .png, .gif, .webp, .svg, .bmp, or .ico'
    }
  },
  anime: { 
    type: String, 
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  description: { 
    type: String, 
    default: '',
    maxlength: 500
  },
  characterId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Character',
    validate: {
      validator: function(v) {
        // If characterId is provided, check if it's a valid ObjectId format
        if (!v) return true;
        return /^[0-9a-fA-F]{24}$/.test(v.toString());
      },
      message: 'Character ID must be a valid MongoDB ObjectId'
    }
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
profilePhotoSchema.index({ characterName: 1 });
profilePhotoSchema.index({ anime: 1, characterName: 1 });

module.exports = mongoose.model('ProfilePhoto', profilePhotoSchema);