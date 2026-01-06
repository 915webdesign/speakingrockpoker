const mongoose = require('mongoose');

const foodOrderSchema = new mongoose.Schema({
  orderNumber: { type: String },
  player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  playerName: { type: String, required: true },
  cardNumber: { type: String },
  table: { type: mongoose.Schema.Types.ObjectId, ref: 'Table' },
  tableNumber: { type: Number },
  seatNumber: { type: Number },
  items: [{
    name: { type: String, required: true },
    price: { type: Number, default: 0 },
    quantity: { type: Number, default: 1 }
  }],
  status: { type: String, enum: ['pending', 'preparing', 'delivered', 'cancelled'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  startedAt: { type: Date },
  completedAt: { type: Date },
  cancelledAt: { type: Date },
  handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' }
});

module.exports = mongoose.model('FoodOrder', foodOrderSchema);
