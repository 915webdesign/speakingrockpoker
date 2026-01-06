const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  actionType: { 
    type: String, 
    enum: [
      'seated', 'called', 'removed', 'check_in', 'check_out', 
      'points', 'flush_spade', 'flush_heart', 'flush_diamond', 'flush_club', 
      'flush_winner', 'high_hand', 'splash_pot', 'order_start', 'order_done',
      'table_open', 'table_close', 'tournament_register', 'waitlist_join',
      'player_login', 'player_register', 'staff_login', 'flush_reset'
    ],
    required: true 
  },
  player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  playerName: { type: String },
  staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  staffName: { type: String, default: 'System' },
  table: { type: mongoose.Schema.Types.ObjectId, ref: 'Table' },
  tableNumber: { type: String },
  details: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
