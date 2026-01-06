const express = require('express');
const router = express.Router();
const Game = require('../models/Game');
const { staffAuth, adminAuth } = require('../middleware/staffAuth');

// Get all games
router.get('/', async (req, res, next) => {
  try {
    const games = await Game.find({ isActive: true });
    res.json(games);
  } catch (error) {
    next(error);
  }
});

// Create game (admin only)
router.post('/', adminAuth, async (req, res, next) => {
  try {
    const game = await Game.create(req.body);
    res.json(game);
  } catch (error) {
    next(error);
  }
});

// Update game (admin only)
router.put('/:id', adminAuth, async (req, res, next) => {
  try {
    const game = await Game.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!game) {
      return res.status(404).json({ detail: 'Game not found' });
    }
    res.json(game);
  } catch (error) {
    next(error);
  }
});

// Delete game (admin only)
router.delete('/:id', adminAuth, async (req, res, next) => {
  try {
    await Game.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Game deactivated' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
