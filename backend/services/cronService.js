const cron = require('node-cron');
const Waitlist = require('../models/Waitlist');
const FlushProgress = require('../models/FlushProgress');
const FlushJackpot = require('../models/FlushJackpot');

module.exports = (io) => {
  // Check for expired waitlist entries every minute
  cron.schedule('* * * * *', async () => {
    try {
      const expired = await Waitlist.find({
        status: 'called',
        expiresAt: { $lt: new Date() }
      });
      
      for (const entry of expired) {
        entry.status = 'removed';
        entry.removedAt = new Date();
        await entry.save();
        
        console.log(`Waitlist entry expired: ${entry.playerName}`);
        
        // Broadcast update
        io.to('waitlist').emit('waitlist:updated', { gameId: entry.gameId });
      }
    } catch (error) {
      console.error('Cron error (waitlist expiry):', error);
    }
  });
  
  // Increment jackpots at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      await FlushJackpot.updateMany(
        { sessionType: 'flush_shine' },
        { $inc: { amount: 250 } }
      );
      await FlushJackpot.updateMany(
        { sessionType: 'last_call' },
        { $inc: { amount: 50 } }
      );
      console.log('Jackpots incremented');
    } catch (error) {
      console.error('Cron error (jackpot increment):', error);
    }
  });
  
  // Reset Flush & Shine progress at 8 PM
  cron.schedule('0 20 * * *', async () => {
    try {
      await FlushProgress.deleteMany({ sessionType: 'flush_shine', completedAt: null });
      io.to('flush-display').emit('flush:updated');
      console.log('Flush & Shine progress reset');
    } catch (error) {
      console.error('Cron error (flush shine reset):', error);
    }
  });
  
  // Reset Last Call progress at 2 AM
  cron.schedule('0 2 * * *', async () => {
    try {
      await FlushProgress.deleteMany({ sessionType: 'last_call', completedAt: null });
      io.to('flush-display').emit('flush:updated');
      console.log('Last Call progress reset');
    } catch (error) {
      console.error('Cron error (last call reset):', error);
    }
  });
  
  console.log('Cron jobs initialized');
};
