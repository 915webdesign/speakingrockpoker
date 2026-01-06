const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const PointsTransaction = require('../models/PointsTransaction');
const ActivityLog = require('../models/ActivityLog');
const { staffAuth } = require('../middleware/staffAuth');

// Get points leaderboard
router.get('/leaderboard', async (req, res, next) => {
  try {
    const players = await Player.find({ pointsJanuary: { $gt: 0 } })
      .sort({ pointsJanuary: -1 })
      .limit(100);
    
    const leaderboard = players.map((p, i) => ({
      rank: i + 1,
      id: p._id,
      card_number: p.cardNumber,
      name: p.name,
      points: p.pointsJanuary
    }));
    
    // Update ranks in database
    for (const entry of leaderboard) {
      await Player.findByIdAndUpdate(entry.id, { rank: entry.rank });
    }
    
    res.json({
      leaderboard,
      top30_cutoff: leaderboard[29]?.points || 0
    });
  } catch (error) {
    next(error);
  }
});

// Get top 30 cutoff
router.get('/top30', async (req, res, next) => {
  try {
    const players = await Player.find({ pointsJanuary: { $gt: 0 } })
      .sort({ pointsJanuary: -1 })
      .limit(30);
    
    const cutoff = players[29]?.pointsJanuary || 0;
    res.json({ cutoff, count: players.length });
  } catch (error) {
    next(error);
  }
});

// Award points (staff only)
router.post('/award', staffAuth, async (req, res, next) => {
  try {
    const { player_id, points, reason } = req.body;
    
    await Player.findByIdAndUpdate(player_id, {
      $inc: { pointsJanuary: points }
    });
    
    const player = await Player.findById(player_id);
    
    await PointsTransaction.create({
      player: player_id,
      playerName: player?.name,
      points,
      type: 'bonus',
      description: reason,
      awardedBy: req.user.sub
    });
    
    await ActivityLog.create({
      actionType: 'points',
      player: player_id,
      playerName: player?.name,
      staffName: req.user.name,
      details: `Awarded ${points} points (${reason})`
    });
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to('admin').emit('points:updated');
    }
    
    res.json({
      message: `Awarded ${points} points`,
      new_total: player?.pointsJanuary || points
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
