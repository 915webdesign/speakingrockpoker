// Simple in-memory rate limiter
const attempts = new Map();
const blocked = new Map();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes

const rateLimiter = {
  isBlocked(ip) {
    const blockTime = blocked.get(ip);
    if (blockTime && Date.now() < blockTime) {
      return true;
    }
    if (blockTime) {
      blocked.delete(ip);
    }
    return false;
  },
  
  recordAttempt(ip, success) {
    if (success) {
      attempts.delete(ip);
      return false;
    }
    
    const now = Date.now();
    let ipAttempts = attempts.get(ip) || [];
    
    // Clean old attempts
    ipAttempts = ipAttempts.filter(t => now - t < WINDOW_MS);
    ipAttempts.push(now);
    attempts.set(ip, ipAttempts);
    
    if (ipAttempts.length >= MAX_ATTEMPTS) {
      blocked.set(ip, now + BLOCK_DURATION);
      return true;
    }
    
    return false;
  }
};

const loginRateLimiter = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  
  if (rateLimiter.isBlocked(ip)) {
    return res.status(429).json({
      detail: 'Too many failed attempts. Please try again in 15 minutes.'
    });
  }
  
  req.rateLimiter = rateLimiter;
  req.clientIp = ip;
  next();
};

module.exports = { loginRateLimiter, rateLimiter };
