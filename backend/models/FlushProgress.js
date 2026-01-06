const mongoose = require('mongoose');

const flushProgressSchema = new mongoose.Schema({
  player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  playerName: { type: String },
  cardNumber: { type: String },
  sessionType: { type: String, enum: ['flush_shine', 'last_call'], required: true },
  sessionDate: { type: String, required: true },
  spade: { type: Boolean, default: false },
  heart: { type: Boolean, default: false },
  diamond: { type: Boolean, default: false },
  club: { type: Boolean, default: false },
  completedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Get suits as array
flushProgressSchema.virtual('suits').get(function() {
  const suits = [];
  if (this.spade) suits.push('S');
  if (this.heart) suits.push('H');
  if (this.diamond) suits.push('D');
  if (this.club) suits.push('C');
  return suits;
});

flushProgressSchema.set('toJSON', { virtuals: true });
flushProgressSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('FlushProgress', flushProgressSchema);
