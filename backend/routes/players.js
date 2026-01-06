const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const PlayerCheckin = require('../models/PlayerCheckin');
const PointsTransaction = require('../models/PointsTransaction');
const ActivityLog = require('../models/ActivityLog');
const { staffAuth } = require('../middleware/staffAuth');
const { auth } = require('../middleware/auth');
const { calculateCashPoints } = require('../utils/calculatePoints');

// Get all players
router.get('/', async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = {};
    
    if (search) {
      query = {
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { cardNumber: { $regex: search } }
        ]
      };
    }
    
    const players = await Player.find(query).limit(100);
    
    res.json(players.map(p => ({
      id: p._id,
      card_number: p.cardNumber,
      name: p.name,
      phone: p.phone,
      points: p.pointsJanuary,
      rank: p.rank
    })));
  } catch (error) {
    next(error);
  }
});

// Get player by ID
router.get('/:id', async (req, res, next) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) {
      return res.status(404).json({ detail: 'Player not found' });
    }
    res.json({
      id: player._id,
      card_number: player.cardNumber,
      name: player.name,
      phone: player.phone,
      points: player.pointsJanuary,
      rank: player.rank
    });
  } catch (error) {
    next(error);
  }
});

// Get player by card number
router.get('/card/:cardNumber', async (req, res, next) => {
  try {
    const player = await Player.findOne({ cardNumber: req.params.cardNumber });
    if (!player) {
      return res.status(404).json({ detail: 'Player not found' });
    }
    res.json({
      id: player._id,
      card_number: player.cardNumber,
      name: player.name,
      phone: player.phone,
      points: player.pointsJanuary,
      rank: player.rank
    });
  } catch (error) {
    next(error);
  }
});

// Check in player
router.post('/:id/checkin', staffAuth, async (req, res, next) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) {
      return res.status(404).json({ detail: 'Player not found' });
    }
    
    const checkin = await PlayerCheckin.create({
      player: player._id,
      playerName: player.name,
      checkedInBy: req.user.sub
    });
    
    await ActivityLog.create({
      actionType: 'check_in',
      player: player._id,
      playerName: player.name,
      staffName: req.user.name,
      details: 'Player checked in'
    });
    
    res.json({ message: 'Checked in successfully', checkin_id: checkin._id });
  } catch (error) {
    next(error);
  }
});

// Check out player
router.post('/:id/checkout', staffAuth, async (req, res, next) => {
  try {
    const checkin = await PlayerCheckin.findOne({
      player: req.params.id,
      checkedOutAt: null
    }).sort({ checkedInAt: -1 });
    
    if (!checkin) {
      return res.status(400).json({ detail: 'No active check-in found' });
    }
    
    const now = new Date();
    const hours = (now - checkin.checkedInAt) / (1000 * 60 * 60);
    const points = calculateCashPoints(hours);
    
    checkin.checkedOutAt = now;
    checkin.hoursPlayed = Math.round(hours * 100) / 100;
    checkin.totalMinutes = Math.round(hours * 60);
    checkin.pointsAwarded = points;
    checkin.checkedOutBy = req.user.sub;
    await checkin.save();
    
    // Award points
    if (points > 0) {
      await Player.findByIdAndUpdate(req.params.id, {
        $inc: { pointsJanuary: points }
      });
      
      await PointsTransaction.create({
        player: req.params.id,
        points,
        type: hours >= 6 ? 'cash_daily' : 'cash_hourly',
        description: `${Math.round(hours * 10) / 10} hours played`,
        awardedBy: req.user.sub
      });
    }
    
    const player = await Player.findById(req.params.id);
    
    await ActivityLog.create({
      actionType: 'check_out',
      player: req.params.id,
      playerName: player?.name,
      staffName: req.user.name,
      details: `Checked out after ${Math.round(hours * 10) / 10} hours, earned ${points} points`
    });
    
    res.json({
      message: 'Checked out successfully',
      hours_played: checkin.hoursPlayed,
      points_earned: points
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
