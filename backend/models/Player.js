const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const playerSchema = new mongoose.Schema({
  cardNumber: { type: String, unique: true, required: true },
  firstName: { type: String, required: true },
  lastInitial: { type: String, required: true, maxlength: 1 },
  phone: { type: String, required: true },
  phoneLast4: { type: String },
  email: { type: String },
  pinHash: { type: String, required: true },
  pointsJanuary: { type: Number, default: 0 },
  rank: { type: Number },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Virtual for full name
playerSchema.virtual('name').get(function() {
  return `${this.firstName} ${this.lastInitial}`;
});

// Hash PIN before saving
playerSchema.pre('save', async function(next) {
  if (!this.isModified('pinHash')) return next();
  // Only hash if it's not already hashed
  if (this.pinHash.length <= 6) {
    this.pinHash = await bcrypt.hash(this.pinHash, 10);
  }
  // Set phone last 4
  if (this.phone) {
    this.phoneLast4 = this.phone.slice(-4);
  }
  next();
});

// Compare PIN
playerSchema.methods.comparePin = async function(pin) {
  return await bcrypt.compare(pin, this.pinHash);
};

// Ensure virtuals are included in JSON
playerSchema.set('toJSON', { virtuals: true });
playerSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Player', playerSchema);
