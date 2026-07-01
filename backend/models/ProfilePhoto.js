const mongoose = require('mongoose');

const profilePhotoSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true
    // ✅ NO VALIDATION - accepts any string
  },
  characterName: { 
    type: String, 
    required: true, 
    unique: true
    // ✅ NO VALIDATION - accepts any string
  },
  imageUrl: { 
    type: String, 
    required: true
    // ✅ NO VALIDATION - accepts any URL (or any string)
  },
  anime: { 
    type: String, 
    required: true
    // ✅ NO VALIDATION - accepts any string
  },
  description: { 
    type: String, 
    default: ''
    // ✅ NO VALIDATION - accepts any string
  },
  characterId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Character'
    // ✅ NO VALIDATION - accepts any value
  },
  rarity: { 
    type: String, 
    default: 'Common'
    // ✅ NO ENUM VALIDATION - accepts any string
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
profilePhotoSchema.index({ characterName: 1 });
profilePhotoSchema.index({ anime: 1, characterName: 1 });

module.exports = mongoose.model('ProfilePhoto', profilePhotoSchema);