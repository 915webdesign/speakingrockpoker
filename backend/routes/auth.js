const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Player = require('../models/Player');
const Staff = require('../models/Staff');
const ActivityLog = require('../models/ActivityLog');
const config = require('../config/config');
const { generateCardNumber } = require('../utils/generateCardNumber');
const { loginRateLimiter } = require('../middleware/rateLimiter');
const { auth } = require('../middleware/auth');

// Create JWT token
const createToken = (payload) => {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
};

// Player login
router.post('/player/login', loginRateLimiter, async (req, res, next) => {
  try {
    const { card_number, credential, method } = req.body;
    
    const player = await Player.findOne({ cardNumber: card_number });
    
    if (!player) {
      req.rateLimiter.recordAttempt(req.clientIp, false);
      return res.status(401).json({ detail: 'Invalid card number or credentials' });
    }
    
    let isValid = false;
    if (method === 'phone') {
      isValid = player.phoneLast4 === credential;
    } else {
      isValid = await player.comparePin(credential);
    }
    
    if (!isValid) {
      const wasBlocked = req.rateLimiter.recordAttempt(req.clientIp, false);
      if (wasBlocked) {
        return res.status(429).json({ detail: 'Too many failed attempts. Account temporarily locked.' });
      }
      return res.status(401).json({ detail: 'Invalid card number or credentials' });
    }
    
    // Success
    req.rateLimiter.recordAttempt(req.clientIp, true);
    
    const token = createToken({
      sub: player._id,
      cardNumber: player.cardNumber,
      name: player.name,
      type: 'player'
    });
    
    await ActivityLog.create({
      actionType: 'player_login',
      player: player._id,
      playerName: player.name,
      details: 'Player logged in'
    });
    
    res.json({
      token,
      player: {
        id: player._id,
        card_number: player.cardNumber,
        name: player.name,
        points: player.pointsJanuary,
        rank: player.rank
      }
    });
  } catch (error) {
    next(error);
  }
});

// Player registration
router.post('/player/register', async (req, res, next) => {
  try {
    const { first_name, last_initial, phone, email, pin } = req.body;
    
    // Check if phone already registered
    const existing = await Player.findOne({ phone });
    if (existing) {
      return res.status(400).json({ detail: 'Phone number already registered' });
    }
    
    // Generate unique card number
    let cardNumber = generateCardNumber();
    while (await Player.findOne({ cardNumber })) {
      cardNumber = generateCardNumber();
    }
    
    const player = await Player.create({
      cardNumber,
      firstName: first_name,
      lastInitial: last_initial.toUpperCase(),
      phone,
      email,
      pinHash: pin
    });
    
    const token = createToken({
      sub: player._id,
      cardNumber: player.cardNumber,
      name: player.name,
      type: 'player'
    });
    
    await ActivityLog.create({
      actionType: 'player_register',
      player: player._id,
      playerName: player.name,
      details: 'New player registered'
    });
    
    res.json({
      token,
      player: {
        id: player._id,
        card_number: player.cardNumber,
        name: player.name,
        points: 0,
        rank: null
      }
    });
  } catch (error) {
    next(error);
  }
});

// Staff login
router.post('/staff/login', loginRateLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body;
    
    const staff = await Staff.findOne({ username: username.toLowerCase() });
    
    if (!staff || !(await staff.comparePassword(password))) {
      const wasBlocked = req.rateLimiter.recordAttempt(req.clientIp, false);
      if (wasBlocked) {
        return res.status(429).json({ detail: 'Too many failed attempts. Account temporarily locked.' });
      }
      return res.status(401).json({ detail: 'Invalid credentials' });
    }
    
    req.rateLimiter.recordAttempt(req.clientIp, true);
    
    const token = createToken({
      sub: staff._id,
      username: staff.username,
      name: staff.name,
      role: staff.role,
      type: 'staff'
    });
    
    await ActivityLog.create({
      actionType: 'staff_login',
      staffName: staff.name,
      details: 'Staff logged in'
    });
    
    res.json({
      token,
      staff: {
        id: staff._id,
        username: staff.username,
        name: staff.name,
        role: staff.role
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  res.json(req.user);
});

module.exports = router;
