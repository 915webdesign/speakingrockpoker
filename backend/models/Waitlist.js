const mongoose = require('mongoose');

const waitlistSchema = new mongoose.Schema({
  player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  playerName: { type: String, required: true },
  phone: { type: String, required: true },
  cardNumber: { type: String },
  game: { type: mongoose.Schema.Types.ObjectId, ref: 'Game' },
  gameId: { type: String, required: true },
  position: { type: Number, required: true },
  numPlayers: { type: Number, default: 1 },
  plannedBuyin: { type: Number, default: 300 },
  status: { type: String, enum: ['waiting', 'called', 'seated', 'removed'], default: 'waiting' },
  joinedAt: { type: Date, default: Date.now },
  calledAt: { type: Date },
  calledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  expiresAt: { type: Date },
  seatedAt: { type: Date },
  removedAt: { type: Date }
});

module.exports = mongoose.model('Waitlist', waitlistSchema);
