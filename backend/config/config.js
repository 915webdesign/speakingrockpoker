module.exports = {
  port: process.env.PORT || 8001,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  allowedOrigins: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'],
  appName: process.env.APP_NAME || 'Speaking Rock Poker',
  adminEmail: process.env.ADMIN_EMAIL || 'hello@speakingrockpoker.com'
};
