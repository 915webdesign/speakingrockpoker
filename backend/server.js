require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const connectDB = require('./config/db');
const config = require('./config/config');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: config.allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Make io accessible to routes
app.set('io', io);

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: config.allowedOrigins, credentials: true }));
app.use(express.json());

// Rate limiting for API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100
});
app.use('/api/', apiLimiter);

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/players', require('./routes/players'));
app.use('/api/games', require('./routes/games'));
app.use('/api/waitlist', require('./routes/waitlist'));
app.use('/api/tables', require('./routes/tables'));
app.use('/api/tournaments', require('./routes/tournaments'));
app.use('/api/flush', require('./routes/flush'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/points', require('./routes/points'));
app.use('/api/activity', require('./routes/activity'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Live status endpoint
app.get('/api/live-status', async (req, res) => {
  try {
    const Table = require('./models/Table');
    const Seat = require('./models/Seat');
    const Waitlist = require('./models/Waitlist');
    
    const tables = await Table.find({ status: 'open' });
    let totalSeats = 0;
    let occupiedSeats = 0;
    
    for (const table of tables) {
      totalSeats += table.maxSeats;
      const seats = await Seat.countDocuments({ tableNumber: table.tableNumber });
      occupiedSeats += seats;
    }
    
    const waitlistCount = await Waitlist.countDocuments({ status: { $in: ['waiting', 'called'] } });
    
    res.json({
      tables_open: tables.length,
      seats_available: totalSeats - occupiedSeats,
      players_seated: occupiedSeats,
      waitlist_count: waitlistCount,
      avg_wait_minutes: waitlistCount > 0 ? waitlistCount * 4 : 0
    });
  } catch (error) {
    res.status(500).json({ detail: 'Error fetching live status' });
  }
});

// Display data endpoints
app.get('/api/display/waitlist', async (req, res) => {
  try {
    const Game = require('./models/Game');
    const Table = require('./models/Table');
    const Seat = require('./models/Seat');
    const Waitlist = require('./models/Waitlist');
    
    const games = await Game.find({ isActive: true });
    const tables = await Table.find({ status: 'open' });
    
    const displayData = [];
    for (const game of games) {
      const gameTables = tables.filter(t => t.gameName === game.name || t.game?.equals(game._id));
      let seatsOpen = 0;
      
      for (const t of gameTables) {
        const occupied = await Seat.countDocuments({ tableNumber: t.tableNumber });
        seatsOpen += t.maxSeats - occupied;
      }
      
      const waitlist = await Waitlist.find({
        gameId: game.gameId,
        status: { $in: ['waiting', 'called'] }
      }).sort({ position: 1 }).limit(10);
      
      displayData.push({
        game,
        tables: gameTables.length,
        seats_open: seatsOpen,
        waitlist: waitlist.map(w => w.playerName),
        waitlist_count: waitlist.length
      });
    }
    
    res.json(displayData);
  } catch (error) {
    res.status(500).json({ detail: 'Error fetching display data' });
  }
});

app.get('/api/display/flush', async (req, res) => {
  try {
    const FlushJackpot = require('./models/FlushJackpot');
    const FlushProgress = require('./models/FlushProgress');
    const { getCurrentFlushSession, getSessionDate } = require('./utils/calculatePoints');
    
    const jackpots = await FlushJackpot.find({});
    const session = getCurrentFlushSession();
    const sessionDate = getSessionDate();
    
    const progress = await FlushProgress.find({});
    
    const leaders = progress.filter(p => p.suits.length > 0).map(p => ({
      name: p.playerName,
      suits: p.suits,
      score: `${p.suits.length}/4`
    })).sort((a, b) => b.suits.length - a.suits.length).slice(0, 12);
    
    res.json({
      jackpots: jackpots.reduce((acc, j) => { acc[j.sessionType] = j.amount; return acc; }, {}),
      active_session: session,
      leaders
    });
  } catch (error) {
    res.status(500).json({ detail: 'Error fetching flush data' });
  }
});

// Serve static files from public folder
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));

// Serve HTML files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'public', 'index.html'));
});

app.get('/:page.html', (req, res) => {
  const filePath = path.join(__dirname, '..', 'frontend', 'public', `${req.params.page}.html`);
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).send('Page not found');
    }
  });
});

// Error handler
app.use(errorHandler);

// Socket.io handlers
require('./services/socketService')(io);

// Connect to MongoDB and start server
connectDB().then(() => {
  // Initialize default data
  require('./seeds/seed').initializeDefaults();
  
  // Start cron jobs
  require('./services/cronService')(io);
  
  server.listen(config.port, '0.0.0.0', () => {
    console.log(`Server running on port ${config.port}`);
  });
}).catch(err => {
  console.error('Failed to connect to MongoDB:', err);
  process.exit(1);
});
