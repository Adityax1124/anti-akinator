const mongoose = require('mongoose');

const characterSchema = new mongoose.Schema({
  // ============================================================
  // ✅ AI QUIZ DATA (Ye data AI ko jayega)
  // ============================================================
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  anime: {
    type: String,
    required: true,
    trim: true
  },
  image: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    maxlength: 6000
  },
  crucialHint: {
    type: String,
    required: true
  },

  // ============================================================
  // ✅ BATTLE DATA (Ye data AI ko nahi jayega)
  // ============================================================
  powerLevel: {
    type: Number,
    required: true,
    min: 0.5,
    max: 50,
    default: 25
  },
  
  // 🔥 NEW - Element for Battle Advantage
  element: {
    type: String,
    enum: ['Fire', 'Water', 'Wind', 'Earth'],
    default: 'Fire'
  },
  
  // ⭐ NEW - Rarity for Collection & Upgrades
  rarity: {
    type: String,
    enum: ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'],
    default: 'Common'
  },
  
  // 📊 NEW - Base Power (same as powerLevel initially, but can be upgraded)
  basePower: {
    type: Number,
    min: 0.5,
    max: 50,
    default: 25
  },

  // ============================================================
  // ✅ TRAITS (AI Quiz ke liye)
  // ============================================================
  traits: {
    gender: { type: String, enum: ['Male', 'Female', 'Other', 'Unknown'], default: 'Unknown' },
    species: { type: String, default: 'Human' },
    age: { type: Number, default: null },
    occupation: { type: String, default: '' },
    powers: [String],
    personality: [String],
    affiliations: [String],
    relationships: [String],
    keyEvents: [String]
  },
  attributes: {
    isMainCharacter: { type: Boolean, default: false },
    isVillain: { type: Boolean, default: false },
    isFemale: { type: Boolean, default: false },
    hasPowers: { type: Boolean, default: false },
    isFromAnime: { type: Boolean, default: true }
  },
  
  // ============================================================
  // ✅ ADMIN FIELDS
  // ============================================================
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Character', characterSchema);