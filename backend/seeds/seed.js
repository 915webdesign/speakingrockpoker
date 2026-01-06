const Player = require('../models/Player');
const Staff = require('../models/Staff');
const Game = require('../models/Game');
const Tournament = require('../models/Tournament');
const FlushJackpot = require('../models/FlushJackpot');

const initializeDefaults = async () => {
  try {
    // Initialize Games
    const gamesCount = await Game.countDocuments({});
    if (gamesCount === 0) {
      await Game.insertMany([
        { gameId: 'nlh-1-3', name: 'No Limit Hold\'em', stakes: '$1/$3', minBuyin: 100, maxBuyin: 300 },
        { gameId: 'nlh-2-5', name: 'No Limit Hold\'em', stakes: '$2/$5', minBuyin: 200, maxBuyin: 500 },
        { gameId: 'plo-1-3', name: 'Pot Limit Omaha', stakes: '$1/$3', minBuyin: 100, maxBuyin: 300 },
        { gameId: 'roe-5', name: 'Round of Each', stakes: '$5 ROE', minBuyin: 100, maxBuyin: 500 },
        { gameId: 'o8-4-8', name: 'Omaha Hi-Lo', stakes: '$4/$8', minBuyin: 100, maxBuyin: 300 }
      ]);
      console.log('Default games created');
    }
    
    // Initialize Staff
    const staffCount = await Staff.countDocuments({});
    if (staffCount === 0) {
      await Staff.create([
        { username: 'admin', passwordHash: 'admin123', name: 'Admin', role: 'admin' },
        { username: 'candy', passwordHash: 'candy123', name: 'Candy', role: 'manager' },
        { username: 'maria', passwordHash: 'maria123', name: 'Maria G', role: 'floor' }
      ]);
      console.log('Default staff created');
    }
    
    // Initialize Flush Jackpots
    const jackpotsCount = await FlushJackpot.countDocuments({});
    if (jackpotsCount === 0) {
      await FlushJackpot.insertMany([
        { sessionType: 'flush_shine', name: 'Flush & Shine', hours: '2PM-8PM', amount: 3000, baseAmount: 1000, dailyIncrement: 250 },
        { sessionType: 'last_call', name: 'Last Call', hours: '8PM-2AM', amount: 1150, baseAmount: 500, dailyIncrement: 50 }
      ]);
      console.log('Default flush jackpots created');
    }
    
    // Initialize Demo Players
    const playersCount = await Player.countDocuments({});
    if (playersCount === 0) {
      await Player.create([
        { cardNumber: '12345', firstName: 'David', lastInitial: 'N', phone: '9155550199', pinHash: '1234', pointsJanuary: 89, rank: 4 },
        { cardNumber: '23456', firstName: 'Mike', lastInitial: 'R', phone: '9155550123', pinHash: '5678', pointsJanuary: 75, rank: 8 },
        { cardNumber: '34567', firstName: 'Jennifer', lastInitial: 'L', phone: '9155550456', pinHash: '9012', pointsJanuary: 62, rank: 12 },
        { cardNumber: '45678', firstName: 'Carlos', lastInitial: 'M', phone: '9155550789', pinHash: '3456', pointsJanuary: 45, rank: 25 },
        { cardNumber: '56789', firstName: 'Sarah', lastInitial: 'L', phone: '9155550321', pinHash: '7890', pointsJanuary: 38, rank: 35 }
      ]);
      console.log('Demo players created');
    }
    
    // Initialize Demo Tournaments
    const tournamentsCount = await Tournament.countDocuments({});
    if (tournamentsCount === 0) {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      await Tournament.insertMany([
        { name: 'Early Bird Hold\'em', date: today, time: '3:00 PM', buyinAmount: '$10', rebuyAmount: '$20', addonAmount: '$10', registeredCount: 13 },
        { name: '7PM No Limit Hold\'em', date: today, time: '7:00 PM', buyinAmount: '$20', rebuyAmount: '$10', addonAmount: '$10', registeredCount: 34 },
        { name: 'Friday $3K Guarantee', date: tomorrow, time: '7:00 PM', buyinAmount: '$20', rebuyAmount: '$20', addonAmount: '$20', guarantee: '$3,000', registeredCount: 18 }
      ]);
      console.log('Demo tournaments created');
    }
    
    console.log('Database initialization complete');
  } catch (error) {
    console.error('Error initializing defaults:', error);
  }
};

module.exports = { initializeDefaults };
