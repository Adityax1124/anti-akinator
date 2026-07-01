const mongoose = require('mongoose');

const characterSchema = new mongoose.Schema({
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
    required: true,
    maxlength: 6000
  },
    crucialHint: {                    
    type: String,
    required: true
  },
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