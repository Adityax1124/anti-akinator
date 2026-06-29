const mongoose = require('mongoose');

const profilePhotoSchema = new mongoose.Schema({
  name: { type: String, required: true },
  characterName: { type: String, required: true, unique: true },
  imageUrl: { type: String, required: true },
  anime: { type: String, required: true },
  description: { type: String, default: '' },
  characterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Character' },
  rarity: { 
    type: String, 
    enum: ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'],
    default: 'Common'
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ProfilePhoto', profilePhotoSchema);