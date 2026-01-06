const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const staffSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true, lowercase: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['floor', 'manager', 'admin'], default: 'floor' },
  createdAt: { type: Date, default: Date.now }
});

// Hash password before saving
staffSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  // Only hash if it's not already hashed
  if (this.passwordHash.length <= 20) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
  }
  next();
});

// Compare password
staffSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.passwordHash);
};

module.exports = mongoose.model('Staff', staffSchema);
