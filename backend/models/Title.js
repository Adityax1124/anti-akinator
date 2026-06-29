const mongoose = require('mongoose');

const titleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  description: { type: String, default: '' },
  displayType: { 
    type: String, 
    enum: ['prefix', 'suffix'],
    default: 'prefix'
  },
  unlockType: { 
    type: String, 
    enum: ['total_guesses', 'anime_guesses', 'season_rank', 'win_streak', 'special'],
    required: true 
  },
  unlockCondition: { type: mongoose.Schema.Types.Mixed, required: true },
  rarity: { 
    type: String, 
    enum: ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'],
    default: 'Common'
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Title', titleSchema);