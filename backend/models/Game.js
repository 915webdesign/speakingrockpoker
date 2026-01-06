const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  gameId: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  stakes: { type: String },
  minBuyin: { type: Number },
  maxBuyin: { type: Number },
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('Game', gameSchema);
