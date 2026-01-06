const express = require('express');
const router = express.Router();
const FoodOrder = require('../models/FoodOrder');
const ActivityLog = require('../models/ActivityLog');
const { staffAuth } = require('../middleware/staffAuth');
const { optionalAuth } = require('../middleware/auth');

// Get all orders
router.get('/', async (req, res, next) => {
  try {
    const { status } = req.query;
    let query = {};
    
    if (status) {
      query.status = status;
    } else {
      query.status = { $in: ['pending', 'preparing'] };
    }
    
    const orders = await FoodOrder.find(query).sort({ createdAt: 1 });
    res.json(orders);
  } catch (error) {
    next(error);
  }
});

// Create order
router.post('/', optionalAuth, async (req, res, next) => {
  try {
    const { player_name, card_number, table_number, items } = req.body;
    
    // Generate order number
    const count = await FoodOrder.countDocuments({});
    const orderNumber = `#${count + 1001}`;
    
    const order = await FoodOrder.create({
      orderNumber,
      playerName: player_name,
      cardNumber: card_number,
      tableNumber: table_number,
      items
    });
    
    await ActivityLog.create({
      actionType: 'order_start',
      playerName: player_name,
      tableNumber: String(table_number),
      details: 'New order placed'
    });
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to('admin').emit('order:new', { order });
    }
    
    res.json({ message: 'Order placed', order });
  } catch (error) {
    next(error);
  }
});

// Start order
router.put('/:id/start', staffAuth, async (req, res, next) => {
  try {
    const order = await FoodOrder.findByIdAndUpdate(
      req.params.id,
      { status: 'preparing', startedAt: new Date(), handledBy: req.user.sub },
      { new: true }
    );
    
    if (!order) {
      return res.status(404).json({ detail: 'Order not found' });
    }
    
    await ActivityLog.create({
      actionType: 'order_start',
      staffName: req.user.name,
      tableNumber: String(order.tableNumber),
      details: 'Started preparing order'
    });
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to('admin').emit('order:updated', { order });
    }
    
    res.json({ message: 'Order started' });
  } catch (error) {
    next(error);
  }
});

// Complete order
router.put('/:id/complete', staffAuth, async (req, res, next) => {
  try {
    const order = await FoodOrder.findByIdAndUpdate(
      req.params.id,
      { status: 'delivered', completedAt: new Date() },
      { new: true }
    );
    
    if (!order) {
      return res.status(404).json({ detail: 'Order not found' });
    }
    
    await ActivityLog.create({
      actionType: 'order_done',
      staffName: req.user.name,
      tableNumber: String(order.tableNumber),
      details: 'Order delivered'
    });
    
    res.json({ message: 'Order completed' });
  } catch (error) {
    next(error);
  }
});

// Cancel order
router.delete('/:id', staffAuth, async (req, res, next) => {
  try {
    await FoodOrder.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled', cancelledAt: new Date() }
    );
    res.json({ message: 'Order cancelled' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
