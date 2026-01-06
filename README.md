# Speaking Rock Poker Room Management System

A comprehensive full-stack poker room management system for Speaking Rock Entertainment Center in El Paso, Texas. This system replaces paper-based waitlist management with a real-time digital solution.

![Speaking Rock Poker](logo.png)

## 🎰 Features

### For Players
- **Digital Waitlist** - Join the waitlist online from anywhere
- **Live Status Tracking** - Check your position in real-time
- **Tournament Registration** - Sign up for daily tournaments
- **January Points Race** - Track your points and leaderboard rank
- **Food Ordering** - Order food directly to your table
- **Mobile-Friendly App** - Full player experience on any device

### For Staff (Admin Dashboard)
- **Waitlist Management** - Call, seat, and manage players
- **Table Management** - Open/close tables, assign seats
- **Tournament Administration** - Manage registrations and schedules
- **Flush Attack Tracker** - Track jackpot progress and winners
- **Points Management** - Award and track player points
- **Food Order Management** - Process and track orders
- **Activity Logging** - Complete audit trail of all actions
- **Real-time Updates** - Live data across all displays

### TV Displays
- **Waitlist Display** - Public-facing waitlist board
- **Flush Attack Leaderboard** - Jackpot progress display

## 🛠 Tech Stack

- **Backend**: FastAPI (Python 3.11)
- **Database**: MongoDB
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Authentication**: JWT tokens with bcrypt password hashing
- **Email**: Elastic Email API
- **Proxy**: Express.js for frontend serving

## 📁 Project Structure

```
/app
├── backend/
│   ├── server.py          # FastAPI application with all endpoints
│   ├── requirements.txt   # Python dependencies
│   └── .env              # Environment variables
├── frontend/
│   ├── server.js         # Express server with API proxy
│   ├── package.json      # Node.js dependencies
│   └── public/           # Static HTML files
│       ├── index.html        # Public homepage
│       ├── login.html        # Player login
│       ├── register.html     # Waitlist/tournament registration
│       ├── status.html       # Waitlist status checker
│       ├── app.html          # Player application
│       ├── admin.html        # Staff dashboard (11 pages)
│       ├── staff-login.html  # Staff authentication
│       ├── display.html      # TV waitlist display
│       ├── flush-display.html # Flush Attack TV display
│       └── features.html     # Marketing features page
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/speaking-rock-poker.git
cd speaking-rock-poker
```

2. **Install backend dependencies**
```bash
cd backend
pip install -r requirements.txt
```

3. **Install frontend dependencies**
```bash
cd frontend
yarn install
```

4. **Configure environment variables**

Backend `.env`:
```env
MONGO_URL=mongodb://localhost:27017/speakingrock
JWT_SECRET=your-secret-key-here
ELASTIC_EMAIL_API_KEY=your-elastic-email-key
ADMIN_EMAIL=hello@speakingrockpoker.com
APP_NAME=Speaking Rock Poker
```

5. **Start the services**
```bash
# Start MongoDB
mongod

# Start backend (port 8001)
cd backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Start frontend (port 3000)
cd frontend
yarn start
```

## 🔐 Demo Accounts

### Player Login
| Card Number | Phone Last 4 | PIN | Name |
|-------------|--------------|-----|------|
| 12345 | 0199 | 1234 | David N |
| 23456 | 0123 | 5678 | Mike R |
| 34567 | 0456 | 9012 | Jennifer L |
| 45678 | 0789 | 3456 | Carlos M |
| 56789 | 0321 | 7890 | Sarah L |

### Staff Login
| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Admin |
| candy | candy123 | Manager |
| maria | maria123 | Floor |

## 📡 API Endpoints

### Authentication
- `POST /api/auth/player/login` - Player login
- `POST /api/auth/player/register` - Player registration
- `POST /api/auth/staff/login` - Staff login

### Waitlist
- `GET /api/waitlist` - Get all waitlists
- `GET /api/waitlist/{game_id}` - Get game-specific waitlist
- `POST /api/waitlist` - Join waitlist
- `PUT /api/waitlist/{id}/call` - Call player
- `PUT /api/waitlist/{id}/seat` - Seat player
- `DELETE /api/waitlist/{id}` - Remove from waitlist

### Tables
- `GET /api/tables` - Get all tables
- `POST /api/tables` - Open a table
- `DELETE /api/tables/{number}` - Close a table
- `POST /api/tables/{number}/seats/{seat}` - Seat player
- `DELETE /api/tables/{number}/seats/{seat}` - Remove player

### Tournaments
- `GET /api/tournaments` - Get all tournaments
- `POST /api/tournaments` - Create tournament
- `POST /api/tournaments/{id}/register` - Register for tournament

### Points & Promotions
- `GET /api/points/leaderboard` - Get points leaderboard
- `POST /api/points/award` - Award points
- `GET /api/flush/jackpots` - Get flush jackpots
- `GET /api/flush/leaderboard` - Get flush leaderboard
- `POST /api/flush/{player_id}/suit` - Award flush suit

### Food Orders
- `GET /api/orders` - Get all orders
- `POST /api/orders` - Create order
- `PUT /api/orders/{id}/start` - Start preparing
- `PUT /api/orders/{id}/complete` - Complete order

### Live Status
- `GET /api/live-status` - Get room status
- `GET /api/display/waitlist` - TV display data
- `GET /api/display/flush` - Flush display data

## 📱 Pages Overview

| Page | URL | Description |
|------|-----|-------------|
| Homepage | `/` | Public marketing site with live status |
| Player Login | `/login.html` | Card + Phone/PIN authentication |
| Staff Login | `/staff-login.html` | Username/password authentication |
| Register | `/register.html` | Waitlist, tournament, account signup |
| Status | `/status.html` | Check waitlist position |
| Player App | `/app.html` | Full player experience |
| Admin | `/admin.html` | Staff management dashboard |
| Waitlist TV | `/display.html` | Public waitlist display |
| Flush TV | `/flush-display.html` | Flush Attack leaderboard |
| Features | `/features.html` | Marketing features page |

## 🎯 Game Types

- **$1/$3 No Limit Hold'em** - Most popular game
- **$2/$5 No Limit Hold'em** - Higher stakes
- **$1/$3 Pot Limit Omaha** - PLO action
- **$5 Round of Each** - Mixed games
- **$4/$8 Omaha Hi-Lo** - Limit Omaha 8

## 🏆 Promotions

### January Points Race
- Earn points by playing: 1-5 hours = 10 pts, 6+ hours = 30 pts
- Top 30 players win prizes at month end

### Flush Attack
- **Flush & Shine** (2PM-8PM): $3,000 jackpot
- **Last Call** (8PM-2AM): $1,150 jackpot
- Collect all 4 suits (♠♥♦♣) to win!

## 📧 Email Notifications

The system sends email notifications via Elastic Email for:
- Welcome emails on registration
- Waitlist seat availability alerts
- Tournament registration confirmations

## 🔧 Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `MONGO_URL` | MongoDB connection string |
| `JWT_SECRET` | Secret key for JWT tokens |
| `ELASTIC_EMAIL_API_KEY` | Elastic Email API key |
| `ADMIN_EMAIL` | From address for emails |
| `APP_NAME` | Application name |

## 📄 License

This project is proprietary software for Speaking Rock Entertainment Center.

## 📞 Contact

- **Poker Room**: (915) 860-7777
- **Address**: 122 South Old Pueblo Road, El Paso, TX 79907
- **Email**: hello@speakingrockpoker.com

---

**Speaking Rock Poker** - El Paso's Premier Digital Poker Room 🎰
