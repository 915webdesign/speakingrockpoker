const express = require('express');
const router = express.Router();
const Waitlist = require('../models/Waitlist');
const Game = require('../models/Game');
const ActivityLog = require('../models/ActivityLog');
const { staffAuth } = require('../middleware/staffAuth');
const { auth, optionalAuth } = require('../middleware/auth');

// Get all waitlists
router.get('/', async (req, res, next) => {
  try {
    const entries = await Waitlist.find({
      status: { $in: ['waiting', 'called'] }
    }).sort({ position: 1 });
    
    // Group by game
    const byGame = {};
    entries.forEach(entry => {
      if (!byGame[entry.gameId]) {
        byGame[entry.gameId] = [];
      }
      byGame[entry.gameId].push(entry);
    });
    
    res.json({ waitlists: byGame, total_count: entries.length });
  } catch (error) {
    next(error);
  }
});

// Get waitlist for specific game
router.get('/:gameId', async (req, res, next) => {
  try {
    const entries = await Waitlist.find({
      gameId: req.params.gameId,
      status: { $in: ['waiting', 'called'] }
    }).sort({ position: 1 });
    
    res.json(entries);
  } catch (error) {
    next(error);
  }
});

// Join waitlist
router.post('/', optionalAuth, async (req, res, next) => {
  try {
    const { player_name, phone, card_number, game_id, num_players, planned_buyin } = req.body;
    
    // Get next position
    const lastEntry = await Waitlist.findOne({
      gameId: game_id,
      status: { $in: ['waiting', 'called'] }
    }).sort({ position: -1 });
    
    const position = lastEntry ? lastEntry.position + 1 : 1;
    
    const entry = await Waitlist.create({
      playerName: player_name,
      phone,
      cardNumber: card_number,
      gameId: game_id,
      position,
      numPlayers: num_players || 1,
      plannedBuyin: planned_buyin || 300
    });
    
    await ActivityLog.create({
      actionType: 'waitlist_join',
      playerName: player_name,
      details: `Joined waitlist for ${game_id}`
    });
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to('waitlist').emit('waitlist:updated', { gameId: game_id });
    }
    
    res.json({ message: 'Added to waitlist', entry });
  } catch (error) {
    next(error);
  }
});

// Call player
router.put('/:id/call', staffAuth, async (req, res, next) => {
  try {
    const entry = await Waitlist.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ detail: 'Waitlist entry not found' });
    }
    
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    
    entry.status = 'called';
    entry.calledAt = new Date();
    entry.calledBy = req.user.sub;
    entry.expiresAt = expiresAt;
    await entry.save();
    
    await ActivityLog.create({
      actionType: 'called',
      playerName: entry.playerName,
      staffName: req.user.name,
      details: 'Player called from waitlist'
    });
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to('waitlist').emit('waitlist:updated', { gameId: entry.gameId });
      io.to('admin').emit('player:called', { entry });
    }
    
    res.json({ message: 'Player called', expires_at: expiresAt.toISOString() });
  } catch (error) {
    next(error);
  }
});

// Seat player
router.put('/:id/seat', staffAuth, async (req, res, next) => {
  try {
    const { table_number, seat_number } = req.body;
    
    const entry = await Waitlist.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ detail: 'Waitlist entry not found' });
    }
    
    entry.status = 'seated';
    entry.seatedAt = new Date();
    await entry.save();
    
    await ActivityLog.create({
      actionType: 'seated',
      playerName: entry.playerName,
      staffName: req.user.name,
      tableNumber: String(table_number),
      details: `Seated at Table ${table_number}, Seat ${seat_number}`
    });
    
    // Reorder remaining positions
    const remaining = await Waitlist.find({
      gameId: entry.gameId,
      status: 'waiting',
      position: { $gt: entry.position }
    }).sort({ position: 1 });
    
    for (let i = 0; i < remaining.length; i++) {
      remaining[i].position = entry.position + i;
      await remaining[i].save();
    }
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to('waitlist').emit('waitlist:updated', { gameId: entry.gameId });
    }
    
    res.json({ message: 'Player seated', table: table_number, seat: seat_number });
  } catch (error) {
    next(error);
  }
});

// Remove from waitlist
router.delete('/:id', staffAuth, async (req, res, next) => {
  try {
    const entry = await Waitlist.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ detail: 'Waitlist entry not found' });
    }
    
    entry.status = 'removed';
    entry.removedAt = new Date();
    await entry.save();
    
    await ActivityLog.create({
      actionType: 'removed',
      playerName: entry.playerName,
      staffName: req.user.name,
      details: 'Removed from waitlist'
    });
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to('waitlist').emit('waitlist:updated', { gameId: entry.gameId });
    }
    
    res.json({ message: 'Removed from waitlist' });
  } catch (error) {
    next(error);
  }
});

// Get player's waitlist status
router.get('/player/:cardNumber', async (req, res, next) => {
  try {
    const entries = await Waitlist.find({
      cardNumber: req.params.cardNumber,
      status: { $in: ['waiting', 'called'] }
    });
    res.json(entries);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
