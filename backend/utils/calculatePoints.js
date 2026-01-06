const POINTS_CONFIG = {
  tournament_play: 5,           // Playing any tournament
  tournament_both: 13,          // Early Bird + Daily (bonus for both)
  tournament_1st: 15,           // 1st place
  tournament_2nd: 10,           // 2nd place
  tournament_3rd: 5,            // 3rd place
  cash_hourly: 10,              // 1-5 hours cash game
  cash_daily: 30                // 6+ hours cash game
};

// Calculate points based on hours played
const calculateCashPoints = (hours) => {
  if (hours >= 6) return POINTS_CONFIG.cash_daily;
  if (hours >= 1) return POINTS_CONFIG.cash_hourly;
  return 0;
};

// Get current flush session
const getCurrentFlushSession = () => {
  const now = new Date();
  const hour = now.getHours();
  
  if (hour >= 14 && hour < 20) {
    return 'flush_shine';
  } else if (hour >= 20 || hour < 2) {
    return 'last_call';
  }
  return null;
};

// Get session date string
const getSessionDate = () => {
  return new Date().toISOString().split('T')[0];
};

module.exports = { POINTS_CONFIG, calculateCashPoints, getCurrentFlushSession, getSessionDate };
