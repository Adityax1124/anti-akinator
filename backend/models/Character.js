const mongoose = require('mongoose');

const characterSchema = new mongoose.Schema({
  // ============================================================
  // ✅ BASIC INFO (AI ko jayega)
  // ============================================================
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  anime: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  image: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    maxlength: 6000,
    default: ''
  },
  crucialHint: {
    type: String,
    required: true,
    default: ''
  },

  // ============================================================
  // ✅ PHYSICAL APPEARANCE (AI ko jayega)
  // ============================================================
  appearance: {
    hairColor: { type: String, default: 'Unknown' },
    eyeColor: { type: String, default: 'Unknown' },
    skinColor: { type: String, default: 'Unknown' },
    height: { type: String, default: 'Unknown' },
    build: { type: String, default: 'Unknown' },
    distinctiveFeatures: { type: String, default: 'Unknown' },
    clothing: { type: String, default: 'Unknown' },
    accessories: { type: String, default: 'Unknown' }
  },

  // ============================================================
  // ✅ IDENTITY & DEMOGRAPHICS (AI ko jayega)
  // ============================================================
  identity: {
    gender: { type: String, enum: ['Male', 'Female', 'Non-Binary', 'Unknown'], default: 'Unknown' },
    age: { type: String, default: 'Unknown' },
    birthday: { type: String, default: 'Unknown' },
    species: { type: String, default: 'Unknown' },
    nationality: { type: String, default: 'Unknown' },
    occupation: { type: String, default: 'Unknown' }
  },

  // ============================================================
  // ✅ STATUS (AI ko jayega)
  // ============================================================
  status: {
    isAlive: { type: Boolean, default: true },
    isDeceased: { type: Boolean, default: false },
    deathDetails: { type: String, default: 'Unknown' },
    currentStatus: { type: String, enum: ['Alive', 'Dead', 'Missing', 'Imprisoned', 'Unknown'], default: 'Alive' }
  },

  // ============================================================
  // ✅ PERSONALITY (AI ko jayega)
  // ============================================================
  personality: {
    traits: { type: [String], default: [] },
    likes: { type: [String], default: [] },
    dislikes: { type: [String], default: [] },
    goals: { type: String, default: 'Unknown' },
    fears: { type: String, default: 'Unknown' }
  },

  // ============================================================
  // ✅ ABILITIES & POWERS (AI ko jayega)
  // ============================================================
  abilities: {
    powers: { type: [String], default: [] },
    techniques: { type: [String], default: [] },
    weapons: { type: [String], default: [] },
    fightingStyle: { type: String, default: 'Unknown' },
    specialAbilities: { type: String, default: 'Unknown' }
  },

  // ============================================================
  // ✅ RELATIONSHIPS (AI ko jayega)
  // ============================================================
  relationships: {
    family: { type: String, default: 'Unknown' },
    friends: { type: [String], default: [] },
    rivals: { type: [String], default: [] },
    mentors: { type: [String], default: [] },
    students: { type: [String], default: [] },
    master: { type: String, default: 'Unknown' },
    affiliatedGroups: { type: [String], default: [] }
  },

  // ============================================================
  // ✅ BACKGROUND (AI ko jayega)
  // ============================================================
  background: {
    origin: { type: String, default: 'Unknown' },
    backstory: { type: String, default: 'Unknown' },
    keyEvents: { type: [String], default: [] },
    achievements: { type: [String], default: [] },
    notableFights: { type: [String], default: [] }
  },

  // ============================================================
  // ✅ ATTRIBUTES (AI ko jayega)
  // ============================================================
  attributes: {
    isMainCharacter: { type: Boolean, default: false },
    isVillain: { type: Boolean, default: false },
    isHero: { type: Boolean, default: false },
    isFemale: { type: Boolean, default: false },
    isChild: { type: Boolean, default: false },
    isElder: { type: Boolean, default: false },
    hasSpecialPower: { type: Boolean, default: false },
    hasWeapon: { type: Boolean, default: false },
    hasFamily: { type: Boolean, default: false },
    isFromAnime: { type: Boolean, default: true }
  },

  // ============================================================
  // ✅ BATTLE DATA (AI ko nahi jayega - sirf game ke liye)
  // ============================================================
  powerLevel: {
    type: Number,
    required: true,
    min: 0.5,
    max: 50,
    default: 25
  },
  basePower: {
    type: Number,
    min: 0.5,
    max: 50,
    default: 25
  },
  element: {
    type: String,
    enum: ['Fire', 'Water', 'Wind', 'Earth'],
    default: 'Fire'
  },
  rarity: {
    type: String,
    enum: ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'],
    default: 'Common'
  },

  // ============================================================
  // ✅ LEGACY TRAITS (Backward Compatibility)
  // ============================================================
  traits: {
    gender: { type: String, enum: ['Male', 'Female', 'Other', 'Unknown'], default: 'Unknown' },
    species: { type: String, default: 'Human' },
    age: { type: Number, default: null },
    occupation: { type: String, default: '' },
    powers: { type: [String], default: [] },
    personality: { type: [String], default: [] },
    affiliations: { type: [String], default: [] },
    relationships: { type: [String], default: [] },
    keyEvents: { type: [String], default: [] }
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
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// ===== PRE-SAVE: Update timestamps =====
characterSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// ===== INDEXES =====
characterSchema.index({ name: 1 });
characterSchema.index({ anime: 1 });
characterSchema.index({ rarity: 1 });
characterSchema.index({ element: 1 });
characterSchema.index({ 'attributes.isVillain': 1 });
characterSchema.index({ 'attributes.isMainCharacter': 1 });

module.exports = mongoose.model('Character', characterSchema);