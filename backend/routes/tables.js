const express = require('express');
const router = express.Router();
const Table = require('../models/Table');
const Seat = require('../models/Seat');
const Game = require('../models/Game');
const ActivityLog = require('../models/ActivityLog');
const { staffAuth } = require('../middleware/staffAuth');

// Get all tables
router.get('/', async (req, res, next) => {
  try {
    const tables = await Table.find({ status: { $ne: 'closed' } });
    
    // Enrich with seat info
    const enrichedTables = await Promise.all(tables.map(async (table) => {
      const seats = await Seat.find({ tableNumber: table.tableNumber });
      return {
        ...table.toObject(),
        seats,
        occupied_count: seats.length,
        available_seats: table.maxSeats - seats.length
      };
    }));
    
    res.json(enrichedTables);
  } catch (error) {
    next(error);
  }
});

// Get table details
router.get('/:tableNumber', async (req, res, next) => {
  try {
    const table = await Table.findOne({ tableNumber: parseInt(req.params.tableNumber) });
    if (!table) {
      return res.status(404).json({ detail: 'Table not found' });
    }
    
    const seats = await Seat.find({ tableNumber: table.tableNumber });
    
    res.json({
      ...table.toObject(),
      seats,
      occupied_count: seats.length,
      available_seats: table.maxSeats - seats.length
    });
  } catch (error) {
    next(error);
  }
});

// Open table
router.post('/', staffAuth, async (req, res, next) => {
  try {
    const { table_number, game_id, capacity } = req.body;
    
    // Check if table already open
    const existing = await Table.findOne({ tableNumber: table_number, status: 'open' });
    if (existing) {
      return res.status(400).json({ detail: 'Table already open' });
    }
    
    const game = await Game.findOne({ gameId: game_id });
    
    const table = await Table.create({
      tableNumber: table_number,
      game: game?._id,
      gameName: game?.name || 'Unknown',
      stakes: game?.stakes || '$1/$3',
      maxSeats: capacity || 9,
      status: 'open',
      openedAt: new Date(),
      openedBy: req.user.sub
    });
    
    await ActivityLog.create({
      actionType: 'table_open',
      staffName: req.user.name,
      tableNumber: String(table_number),
      details: `Table ${table_number} opened for ${table.gameName}`
    });
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to('admin').emit('table:updated', { tableNumber: table_number });
    }
    
    res.json(table);
  } catch (error) {
    next(error);
  }
});

// Close table
router.delete('/:tableNumber', staffAuth, async (req, res, next) => {
  try {
    const tableNumber = parseInt(req.params.tableNumber);
    
    await Table.findOneAndUpdate(
      { tableNumber },
      { status: 'closed', closedAt: new Date() }
    );
    
    // Remove all seats
    await Seat.deleteMany({ tableNumber });
    
    await ActivityLog.create({
      actionType: 'table_close',
      staffName: req.user.name,
      tableNumber: String(tableNumber),
      details: `Table ${tableNumber} closed`
    });
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to('admin').emit('table:updated', { tableNumber });
    }
    
    res.json({ message: `Table ${tableNumber} closed` });
  } catch (error) {
    next(error);
  }
});

// Seat player
router.post('/:tableNumber/seats/:seatNumber', staffAuth, async (req, res, next) => {
  try {
    const tableNumber = parseInt(req.params.tableNumber);
    const seatNumber = parseInt(req.params.seatNumber);
    const { player_id, player_name, card_number } = req.body;
    
    const table = await Table.findOne({ tableNumber });
    if (!table) {
      return res.status(404).json({ detail: 'Table not found' });
    }
    
    // Check if seat occupied
    const existing = await Seat.findOne({ tableNumber, seatNumber });
    if (existing) {
      return res.status(400).json({ detail: 'Seat is occupied' });
    }
    
    const seat = await Seat.create({
      table: table._id,
      tableNumber,
      seatNumber,
      player: player_id,
      playerName: player_name,
      cardNumber: card_number,
      seatedBy: req.user.sub
    });
    
    await ActivityLog.create({
      actionType: 'seated',
      playerName: player_name,
      staffName: req.user.name,
      tableNumber: String(tableNumber),
      details: `Seated at Seat ${seatNumber}`
    });
    
    res.json(seat);
  } catch (error) {
    next(error);
  }
});

// Remove player from seat
router.delete('/:tableNumber/seats/:seatNumber', staffAuth, async (req, res, next) => {
  try {
    const tableNumber = parseInt(req.params.tableNumber);
    const seatNumber = parseInt(req.params.seatNumber);
    
    const seat = await Seat.findOne({ tableNumber, seatNumber });
    
    if (seat) {
      await ActivityLog.create({
        actionType: 'removed',
        playerName: seat.playerName,
        staffName: req.user.name,
        tableNumber: String(tableNumber),
        details: `Removed from Seat ${seatNumber}`
      });
    }
    
    await Seat.deleteOne({ tableNumber, seatNumber });
    
    res.json({ message: 'Player removed from seat' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
