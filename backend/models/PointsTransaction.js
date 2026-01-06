const mongoose = require('mongoose');

const pointsTransactionSchema = new mongoose.Schema({
  player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  playerName: { type: String },
  points: { type: Number, required: true },
  type: { 
    type: String, 
    enum: ['tournament_play', 'tournament_place', 'cash_hourly', 'cash_daily', 'bonus', 'adjustment'],
    required: true 
  },
  description: { type: String },
  awardedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PointsTransaction', pointsTransactionSchema);
