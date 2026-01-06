const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const { staffAuth } = require('../middleware/staffAuth');

// Get activity log
router.get('/', staffAuth, async (req, res, next) => {
  try {
    const { limit = 50, action_type, staff } = req.query;
    let query = {};
    
    if (action_type && action_type !== 'all') {
      query.actionType = action_type;
    }
    
    if (staff && staff !== 'all') {
      query.staffName = staff;
    }
    
    const logs = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    res.json(logs);
  } catch (error) {
    next(error);
  }
});

// Export to CSV (simplified)
router.get('/export/csv', staffAuth, async (req, res, next) => {
  try {
    const logs = await ActivityLog.find({}).sort({ createdAt: -1 }).limit(500);
    
    let csv = 'Timestamp,Action,Player,Staff,Table,Details\n';
    logs.forEach(log => {
      csv += `${log.createdAt.toISOString()},${log.actionType},${log.playerName || ''},${log.staffName || ''},${log.tableNumber || ''},"${log.details || ''}"\n`;
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=activity_log.csv');
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
