const mongoose = require('mongoose');

const tournamentRegistrationSchema = new mongoose.Schema({
  tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
  player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  playerName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  cardNumber: { type: String },
  confirmation: { type: String, required: true },
  registeredAt: { type: Date, default: Date.now },
  registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  status: { type: String, enum: ['registered', 'checked_in', 'eliminated', 'cashed'], default: 'registered' },
  finishPosition: { type: Number }
});

module.exports = mongoose.model('TournamentRegistration', tournamentRegistrationSchema);
