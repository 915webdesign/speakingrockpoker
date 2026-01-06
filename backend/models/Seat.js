const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
  table: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
  tableNumber: { type: Number, required: true },
  seatNumber: { type: Number, required: true },
  player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  playerName: { type: String },
  cardNumber: { type: String },
  seatedAt: { type: Date, default: Date.now },
  seatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' }
});

// Compound index to ensure unique seat per table
seatSchema.index({ table: 1, seatNumber: 1 }, { unique: true });

module.exports = mongoose.model('Seat', seatSchema);
