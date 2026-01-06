const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
  tableNumber: { type: Number, unique: true, required: true },
  game: { type: mongoose.Schema.Types.ObjectId, ref: 'Game' },
  gameName: { type: String },
  stakes: { type: String },
  maxSeats: { type: Number, default: 9 },
  status: { type: String, enum: ['open', 'closed', 'reserved'], default: 'closed' },
  openedAt: { type: Date },
  closedAt: { type: Date },
  openedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' }
});

module.exports = mongoose.model('Table', tableSchema);
