# Speaking Rock Poker Room - Test Results

## Testing Protocol
- Test Backend APIs
- Test Frontend UI flows
- Test Staff/Player authentication

## Test Credentials
- **Staff Admin:** username: `admin`, password: `admin123`
- **Staff Manager:** username: `candy`, password: `candy123`
- **Staff Floor:** username: `maria`, password: `maria123`
- **Player:** card: `12345`, phone last 4: `0199`

## API Endpoints to Test
- GET /api/health - Health check
- POST /api/auth/staff/login - Staff login
- POST /api/auth/player/login - Player login
- GET /api/games - Get all games
- GET /api/players - Get all players
- GET /api/waitlist - Get waitlist
- POST /api/waitlist - Join waitlist
- GET /api/tables - Get tables
- POST /api/tables - Open table (staff auth required)
- GET /api/tournaments - Get tournaments
- GET /api/points/leaderboard - Get points leaderboard
- GET /api/flush/jackpots - Get flush jackpots
- GET /api/activity - Get activity log (staff auth required)

## Frontend Pages to Test
- http://localhost:3000 - Homepage
- http://localhost:3000/login.html - Player login
- http://localhost:3000/staff-login.html - Staff login
- http://localhost:3000/admin.html - Admin dashboard
- http://localhost:3000/app.html - Player app

## Incorporate User Feedback
- SMS is MOCKED (no Twilio keys provided)
- MongoDB is local (localhost:27017)
- Node.js backend runs on port 8002, proxied via FastAPI on port 8001

## Test Status
- Waiting for test execution
