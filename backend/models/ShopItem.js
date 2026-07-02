const mongoose = require('mongoose');

const shopItemSchema = new mongoose.Schema({
  itemType: {
    type: String,
    enum: ['banner', 'profilePhoto'],
    required: true
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    // ✅ Use string reference that will be resolved dynamically
    ref: function() {
      return this.itemType === 'banner' ? 'Banner' : 'ProfilePhoto';
    }
  },
  price: {
    type: Number,
    required: true,
    min: 10
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isLimited: {
    type: Boolean,
    default: false
  },
  startDate: {
    type: Date,
    default: null
  },
  endDate: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
shopItemSchema.index({ isActive: 1, itemType: 1 });
shopItemSchema.index({ isLimited: 1, endDate: 1 });
shopItemSchema.index({ price: 1 });

module.exports = mongoose.model('ShopItem', shopItemSchema);