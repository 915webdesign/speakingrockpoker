const express = require('express');
const router = express.Router();
const FlushProgress = require('../models/FlushProgress');
const FlushJackpot = require('../models/FlushJackpot');
const Player = require('../models/Player');
const ActivityLog = require('../models/ActivityLog');
const { staffAuth } = require('../middleware/staffAuth');
const { getCurrentFlushSession, getSessionDate } = require('../utils/calculatePoints');

// Get flush leaderboard
router.get('/leaderboard', async (req, res, next) => {
  try {
    const session = getCurrentFlushSession();
    const sessionDate = getSessionDate();
    
    const progress = await FlushProgress.find({
      sessionType: session,
      sessionDate
    });
    
    const leaderboard = progress.map(p => {
      const suits = p.suits;
      return {
        id: p.player,
        name: p.playerName,
        card_number: p.cardNumber,
        suits,
        count: suits.length,
        score: `${suits.length}/4`
      };
    }).sort((a, b) => b.count - a.count);
    
    res.json({ session, leaders: leaderboard });
  } catch (error) {
    next(error);
  }
});

// Get jackpot amounts
router.get('/jackpots', async (req, res, next) => {
  try {
    const jackpots = await FlushJackpot.find({});
    const session = getCurrentFlushSession();
    
    res.json({
      jackpots,
      active_session: session
    });
  } catch (error) {
    next(error);
  }
});

// Award flush suit
router.post('/:playerId/suit', staffAuth, async (req, res, next) => {
  try {
    const { suit } = req.body;
    const session = getCurrentFlushSession();
    const sessionDate = getSessionDate();
    
    if (!session) {
      return res.status(400).json({ detail: 'No active flush session' });
    }
    
    const player = await Player.findById(req.params.playerId);
    if (!player) {
      return res.status(404).json({ detail: 'Player not found' });
    }
    
    // Find or create progress
    let progress = await FlushProgress.findOne({
      player: player._id,
      sessionType: session,
      sessionDate
    });
    
    if (!progress) {
      progress = await FlushProgress.create({
        player: player._id,
        playerName: player.name,
        cardNumber: player.cardNumber,
        sessionType: session,
        sessionDate
      });
    }
    
    // Award suit
    progress[suit] = true;
    progress.updatedAt = new Date();
    
    // Check for winner
    if (progress.spade && progress.heart && progress.diamond && progress.club) {
      progress.completedAt = new Date();
      
      // Reset jackpot
      const jackpot = await FlushJackpot.findOne({ sessionType: session });
      if (jackpot) {
        await ActivityLog.create({
          actionType: 'flush_winner',
          player: player._id,
          playerName: player.name,
          staffName: req.user.name,
          details: `WON THE FLUSH ATTACK JACKPOT! $${jackpot.amount}`
        });
        
        jackpot.amount = jackpot.baseAmount;
        jackpot.lastWonDate = new Date();
        jackpot.lastWinner = player._id;
        await jackpot.save();
      }
    }
    
    await progress.save();
    
    const suitSymbols = { spade: '♠️', heart: '♥️', diamond: '♦️', club: '♣️' };
    
    await ActivityLog.create({
      actionType: `flush_${suit}`,
      player: player._id,
      playerName: player.name,
      staffName: req.user.name,
      details: `Awarded ${suitSymbols[suit] || suit} flush`
    });
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to('flush-display').emit('flush:updated');
    }
    
    res.json({
      message: 'Suit awarded',
      suits: progress.suits,
      count: progress.suits.length
    });
  } catch (error) {
    next(error);
  }
});

// Reset flush progress (staff only)
router.delete('/reset', staffAuth, async (req, res, next) => {
  try {
    await FlushProgress.deleteMany({});
    
    await ActivityLog.create({
      actionType: 'flush_reset',
      staffName: req.user.name,
      details: 'All flush progress reset'
    });
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to('flush-display').emit('flush:updated');
    }
    
    res.json({ message: 'All flush progress reset' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
