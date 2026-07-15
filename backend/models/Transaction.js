// /backend/models/Transaction.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  utrNumber: {
    type: String,
    required: [true, 'UTR number is required'],
    unique: true,
    trim: true,
    uppercase: true,
    index: true
  },
  paidAmount: {
    type: Number,
    required: [true, 'Paid amount is required'],
    min: [1, 'Amount must be at least 1']
  },
  expectedAmount: {
    type: Number,
    required: [true, 'Expected amount is required'],
    min: [1, 'Amount must be at least 1']
  },
  itemType: {
    type: String,
    enum: ['shards', 'seasonpass', 'bundle'],
    required: [true, 'Item type is required']
  },
  itemName: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true
  },
  itemDetails: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'delivered'],
    default: 'pending',
    index: true
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  paymentMethod: {
    type: String,
    enum: ['upi', 'bank_transfer', 'other'],
    default: 'upi'
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    deviceInfo: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes for faster queries
transactionSchema.index({ userId: 1, status: 1, createdAt: -1 });
transactionSchema.index({ utrNumber: 1, status: 1 });
transactionSchema.index({ status: 1, createdAt: -1 });

// Pre-save middleware
transactionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtuals
transactionSchema.virtual('amountDifference').get(function() {
  return this.paidAmount - this.expectedAmount;
});

transactionSchema.virtual('timeElapsed').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
});

// Static methods
transactionSchema.statics.getPendingCount = async function() {
  return await this.countDocuments({ status: 'pending' });
};

transactionSchema.statics.getTodayTransactions = async function() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  return await this.find({
    createdAt: { $gte: startOfDay }
  }).sort({ createdAt: -1 });
};

// Instance methods
transactionSchema.methods.markAsVerified = async function(adminId) {
  this.status = 'verified';
  this.verifiedBy = adminId;
  this.verifiedAt = new Date();
  this.updatedAt = new Date();
  return await this.save();
};

transactionSchema.methods.markAsDelivered = async function() {
  this.status = 'delivered';
  this.deliveredAt = new Date();
  this.updatedAt = new Date();
  return await this.save();
};

transactionSchema.methods.reject = async function(adminId, reason) {
  this.status = 'rejected';
  this.verifiedBy = adminId;
  this.verifiedAt = new Date();
  this.notes = reason || 'Transaction rejected';
  this.updatedAt = new Date();
  return await this.save();
};

// Ensure virtuals are included in JSON output
transactionSchema.set('toJSON', { virtuals: true });
transactionSchema.set('toObject', { virtuals: true });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;