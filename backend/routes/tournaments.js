const express = require('express');
const router = express.Router();
const Tournament = require('../models/Tournament');
const TournamentRegistration = require('../models/TournamentRegistration');
const ActivityLog = require('../models/ActivityLog');
const { staffAuth } = require('../middleware/staffAuth');
const { optionalAuth } = require('../middleware/auth');
const { generateConfirmation } = require('../utils/generateCardNumber');

// Get all tournaments
router.get('/', async (req, res, next) => {
  try {
    const tournaments = await Tournament.find({ isActive: true });
    res.json(tournaments);
  } catch (error) {
    next(error);
  }
});

// Get tournament details
router.get('/:id', async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ detail: 'Tournament not found' });
    }
    
    const registrations = await TournamentRegistration.find({ tournament: tournament._id });
    
    res.json({
      ...tournament.toObject(),
      registrations
    });
  } catch (error) {
    next(error);
  }
});

// Create tournament (staff only)
router.post('/', staffAuth, async (req, res, next) => {
  try {
    const tournament = await Tournament.create({
      name: req.body.name,
      date: req.body.date,
      time: req.body.time,
      buyinAmount: req.body.buyin,
      rebuyAmount: req.body.rebuy,
      addonAmount: req.body.addon,
      guarantee: req.body.guarantee
    });
    
    await ActivityLog.create({
      actionType: 'tournament_register',
      staffName: req.user.name,
      details: `Created tournament: ${req.body.name}`
    });
    
    res.json(tournament);
  } catch (error) {
    next(error);
  }
});

// Register for tournament
router.post('/:id/register', optionalAuth, async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ detail: 'Tournament not found' });
    }
    
    const { player_name, phone, email, card_number } = req.body;
    
    // Check if already registered
    const existing = await TournamentRegistration.findOne({
      tournament: tournament._id,
      phone
    });
    if (existing) {
      return res.status(400).json({ detail: 'Already registered for this tournament' });
    }
    
    const confirmation = generateConfirmation();
    
    const registration = await TournamentRegistration.create({
      tournament: tournament._id,
      playerName: player_name,
      phone,
      email,
      cardNumber: card_number,
      confirmation
    });
    
    // Update count
    await Tournament.findByIdAndUpdate(tournament._id, {
      $inc: { registeredCount: 1 }
    });
    
    await ActivityLog.create({
      actionType: 'tournament_register',
      playerName: player_name,
      details: `Registered for ${tournament.name}`
    });
    
    res.json({ message: 'Registered successfully', registration });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
