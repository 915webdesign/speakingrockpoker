const mongoose = require('mongoose');

const flushJackpotSchema = new mongoose.Schema({
  sessionType: { type: String, enum: ['flush_shine', 'last_call'], required: true, unique: true },
  name: { type: String },
  hours: { type: String },
  amount: { type: Number, required: true },
  baseAmount: { type: Number },
  lastWonDate: { type: Date },
  lastWinner: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  dailyIncrement: { type: Number, default: 250 }
});

module.exports = mongoose.model('FlushJackpot', flushJackpotSchema);
