const mongoose = require('mongoose');

const playerCheckinSchema = new mongoose.Schema({
  player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  playerName: { type: String },
  table: { type: mongoose.Schema.Types.ObjectId, ref: 'Table' },
  checkedInAt: { type: Date, default: Date.now },
  checkedOutAt: { type: Date },
  totalMinutes: { type: Number },
  hoursPlayed: { type: Number },
  pointsAwarded: { type: Number },
  checkedInBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  checkedOutBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' }
});

module.exports = mongoose.model('PlayerCheckin', playerCheckinSchema);
