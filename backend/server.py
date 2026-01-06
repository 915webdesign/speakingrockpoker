"""Speaking Rock Poker Room Management System - Backend API"""
import os
import uuid
from datetime import datetime, timedelta
from typing import Optional, List
from contextlib import asynccontextmanager
from bson import ObjectId

from fastapi import FastAPI, HTTPException, Depends, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from jose import JWTError, jwt
from dotenv import load_dotenv
import httpx

load_dotenv()


def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict"""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(d) for d in doc]
    if isinstance(doc, dict):
        result = {}
        for key, value in doc.items():
            if key == "_id":
                result["_id"] = str(value)
            elif isinstance(value, ObjectId):
                result[key] = str(value)
            elif isinstance(value, datetime):
                result[key] = value.isoformat()
            elif isinstance(value, dict):
                result[key] = serialize_doc(value)
            elif isinstance(value, list):
                result[key] = [serialize_doc(v) if isinstance(v, dict) else v for v in value]
            else:
                result[key] = value
        return result
    return doc

# Configuration
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/speakingrock")
JWT_SECRET = os.getenv("JWT_SECRET", "speaking-rock-poker-secret-key-2025")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24
ELASTIC_EMAIL_API_KEY = os.getenv("ELASTIC_EMAIL_API_KEY", "")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "hello@speakingrockpoker.com")

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

# Database
db_client: AsyncIOMotorClient = None
db = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_client, db
    db_client = AsyncIOMotorClient(MONGO_URL)
    db = db_client.speakingrock
    # Initialize default data
    await initialize_default_data()
    yield
    db_client.close()


app = FastAPI(
    title="Speaking Rock Poker API",
    description="Poker Room Management System for Speaking Rock Entertainment Center",
    version="2.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== MODELS ====================

class PlayerCreate(BaseModel):
    first_name: str
    last_initial: str
    phone: str
    email: Optional[str] = None
    pin: str


class PlayerLogin(BaseModel):
    card_number: str
    credential: str
    method: str = "phone"  # phone or pin


class StaffLogin(BaseModel):
    username: str
    password: str


class WaitlistEntry(BaseModel):
    player_name: str
    phone: str
    card_number: Optional[str] = None
    game_id: str
    num_players: int = 1
    planned_buyin: int = 300


class TableCreate(BaseModel):
    table_number: int
    game_id: str
    capacity: int = 9


class SeatAssignment(BaseModel):
    player_id: str
    player_name: str
    card_number: Optional[str] = None


class TournamentCreate(BaseModel):
    name: str
    date: str
    time: str
    buyin: str
    rebuy: Optional[str] = None
    addon: Optional[str] = None
    guarantee: Optional[str] = None


class TournamentRegistration(BaseModel):
    player_name: str
    phone: str
    email: Optional[str] = None
    card_number: Optional[str] = None
    tournament_id: str


class FlushSuitAward(BaseModel):
    player_id: str
    suit: str  # spade, heart, diamond, club


class FoodOrderCreate(BaseModel):
    player_name: str
    card_number: Optional[str] = None
    table_number: int
    items: List[dict]


class PointsAward(BaseModel):
    player_id: str
    points: int
    reason: str


class ActivityLog(BaseModel):
    action_type: str
    details: str
    player_name: Optional[str] = None
    table_number: Optional[str] = None
    staff_name: str = "System"


# ==================== UTILITIES ====================

def generate_card_number() -> str:
    """Generate a 5-digit player card number"""
    import random
    return str(random.randint(10000, 99999))


def generate_confirmation_code(prefix: str = "SR") -> str:
    """Generate a confirmation code"""
    import random
    return f"{prefix}-{datetime.now().year}-{random.randint(1000, 9999)}"


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=JWT_EXPIRATION_HOURS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        return None


async def require_auth(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def send_email(to_email: str, subject: str, body: str):
    """Send email via Elastic Email API"""
    if not ELASTIC_EMAIL_API_KEY:
        print(f"Email (MOCK): To: {to_email}, Subject: {subject}")
        return True
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.elasticemail.com/v2/email/send",
                data={
                    "apikey": ELASTIC_EMAIL_API_KEY,
                    "from": ADMIN_EMAIL,
                    "fromName": "Speaking Rock Poker",
                    "to": to_email,
                    "subject": subject,
                    "bodyHtml": body,
                    "isTransactional": "true"
                }
            )
            return response.status_code == 200
    except Exception as e:
        print(f"Email error: {e}")
        return False


async def log_activity(action_type: str, details: str, player_name: str = None, 
                       table_number: str = None, staff_name: str = "System"):
    """Log an activity to the database"""
    await db.activity_log.insert_one({
        "id": str(uuid.uuid4()),
        "timestamp": datetime.utcnow(),
        "action_type": action_type,
        "details": details,
        "player_name": player_name,
        "table_number": table_number,
        "staff_name": staff_name
    })


async def initialize_default_data():
    """Initialize default games, staff, and demo data"""
    # Check if games exist
    games_count = await db.games.count_documents({})
    if games_count == 0:
        default_games = [
            {"id": "nlh-1-3", "name": "No Limit Hold'em", "stakes": "$1/$3", "min_buyin": 100, "max_buyin": 300, "active": True},
            {"id": "nlh-2-5", "name": "No Limit Hold'em", "stakes": "$2/$5", "min_buyin": 200, "max_buyin": 500, "active": True},
            {"id": "plo-1-3", "name": "Pot Limit Omaha", "stakes": "$1/$3", "min_buyin": 100, "max_buyin": 300, "active": True},
            {"id": "roe-5", "name": "Round of Each", "stakes": "$5 ROE", "min_buyin": 100, "max_buyin": 500, "active": True},
            {"id": "o8-4-8", "name": "Omaha Hi-Lo", "stakes": "$4/$8", "min_buyin": 100, "max_buyin": 300, "active": True},
        ]
        await db.games.insert_many(default_games)
    
    # Check if staff exist
    staff_count = await db.staff.count_documents({})
    if staff_count == 0:
        default_staff = [
            {"id": str(uuid.uuid4()), "username": "admin", "password": pwd_context.hash("admin123"), 
             "name": "Admin", "role": "admin"},
            {"id": str(uuid.uuid4()), "username": "candy", "password": pwd_context.hash("candy123"), 
             "name": "Candy", "role": "manager"},
            {"id": str(uuid.uuid4()), "username": "maria", "password": pwd_context.hash("maria123"), 
             "name": "Maria G", "role": "floor"},
        ]
        await db.staff.insert_many(default_staff)
    
    # Initialize flush jackpots
    flush_count = await db.flush_jackpots.count_documents({})
    if flush_count == 0:
        await db.flush_jackpots.insert_many([
            {"session": "flush_shine", "name": "Flush & Shine", "hours": "2PM-8PM", "amount": 3000, "base_amount": 1000},
            {"session": "last_call", "name": "Last Call", "hours": "8PM-2AM", "amount": 1150, "base_amount": 500},
        ])
    
    # Add demo players if none exist
    players_count = await db.players.count_documents({})
    if players_count == 0:
        demo_players = [
            {"id": str(uuid.uuid4()), "card_number": "12345", "name": "David N", "first_name": "David", 
             "last_initial": "N", "phone": "9155550199", "phone_last4": "0199", 
             "pin_hash": pwd_context.hash("1234"), "email": "david@example.com", "points": 89, "rank": 4, 
             "created_at": datetime.utcnow()},
            {"id": str(uuid.uuid4()), "card_number": "23456", "name": "Mike R", "first_name": "Mike",
             "last_initial": "R", "phone": "9155550123", "phone_last4": "0123",
             "pin_hash": pwd_context.hash("5678"), "points": 75, "rank": 8,
             "created_at": datetime.utcnow()},
            {"id": str(uuid.uuid4()), "card_number": "34567", "name": "Jennifer L", "first_name": "Jennifer",
             "last_initial": "L", "phone": "9155550456", "phone_last4": "0456",
             "pin_hash": pwd_context.hash("9012"), "points": 62, "rank": 12,
             "created_at": datetime.utcnow()},
            {"id": str(uuid.uuid4()), "card_number": "45678", "name": "Carlos M", "first_name": "Carlos",
             "last_initial": "M", "phone": "9155550789", "phone_last4": "0789",
             "pin_hash": pwd_context.hash("3456"), "points": 45, "rank": 25,
             "created_at": datetime.utcnow()},
            {"id": str(uuid.uuid4()), "card_number": "56789", "name": "Sarah L", "first_name": "Sarah",
             "last_initial": "L", "phone": "9155550321", "phone_last4": "0321",
             "pin_hash": pwd_context.hash("7890"), "points": 38, "rank": 35,
             "created_at": datetime.utcnow()},
        ]
        await db.players.insert_many(demo_players)
    
    # Add demo tournaments
    tournaments_count = await db.tournaments.count_documents({})
    if tournaments_count == 0:
        today = datetime.now().strftime("%Y-%m-%d")
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        demo_tournaments = [
            {"id": str(uuid.uuid4()), "name": "Early Bird Hold'em", "date": today, "time": "3:00 PM",
             "buyin": "$10", "rebuy": "$20", "addon": "$10", "registered_count": 13, "active": True},
            {"id": str(uuid.uuid4()), "name": "7PM No Limit Hold'em", "date": today, "time": "7:00 PM",
             "buyin": "$20", "rebuy": "$10", "addon": "$10", "registered_count": 34, "active": True},
            {"id": str(uuid.uuid4()), "name": "Friday $3K Guarantee", "date": tomorrow, "time": "7:00 PM",
             "buyin": "$20", "rebuy": "$20", "addon": "$20", "guarantee": "$3,000", "registered_count": 18, "active": True},
        ]
        await db.tournaments.insert_many(demo_tournaments)


# ==================== AUTH ENDPOINTS ====================

@app.post("/api/auth/player/login")
async def player_login(data: PlayerLogin):
    """Player login with card number + phone last 4 or PIN"""
    player = await db.players.find_one({"card_number": data.card_number})
    if not player:
        raise HTTPException(status_code=401, detail="Card number not found")
    
    if data.method == "phone":
        if player.get("phone_last4") != data.credential:
            raise HTTPException(status_code=401, detail="Phone number does not match")
    else:
        if not pwd_context.verify(data.credential, player.get("pin_hash", "")):
            raise HTTPException(status_code=401, detail="Incorrect PIN")
    
    token = create_access_token({
        "sub": player["id"],
        "card_number": player["card_number"],
        "name": player["name"],
        "type": "player"
    })
    
    await log_activity("player_login", f"Player logged in", player["name"])
    
    return {
        "token": token,
        "player": {
            "id": player["id"],
            "card_number": player["card_number"],
            "name": player["name"],
            "points": player.get("points", 0),
            "rank": player.get("rank")
        }
    }


@app.post("/api/auth/player/register")
async def player_register(data: PlayerCreate):
    """Register a new player"""
    # Check if phone already exists
    existing = await db.players.find_one({"phone": data.phone})
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    card_number = generate_card_number()
    while await db.players.find_one({"card_number": card_number}):
        card_number = generate_card_number()
    
    player_id = str(uuid.uuid4())
    player = {
        "id": player_id,
        "card_number": card_number,
        "name": f"{data.first_name} {data.last_initial}",
        "first_name": data.first_name,
        "last_initial": data.last_initial,
        "phone": data.phone,
        "phone_last4": data.phone[-4:],
        "email": data.email,
        "pin_hash": pwd_context.hash(data.pin),
        "points": 0,
        "rank": None,
        "created_at": datetime.utcnow()
    }
    
    await db.players.insert_one(player)
    
    token = create_access_token({
        "sub": player_id,
        "card_number": card_number,
        "name": player["name"],
        "type": "player"
    })
    
    await log_activity("player_register", f"New player registered", player["name"])
    
    # Send welcome email if email provided
    if data.email:
        await send_email(
            data.email,
            "Welcome to Speaking Rock Poker!",
            f"<h2>Welcome {data.first_name}!</h2><p>Your player card number is: <strong>{card_number}</strong></p><p>We look forward to seeing you at the tables!</p>"
        )
    
    return {
        "token": token,
        "player": {
            "id": player_id,
            "card_number": card_number,
            "name": player["name"],
            "points": 0,
            "rank": None
        }
    }


@app.post("/api/auth/staff/login")
async def staff_login(data: StaffLogin):
    """Staff login"""
    staff = await db.staff.find_one({"username": data.username})
    if not staff or not pwd_context.verify(data.password, staff["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({
        "sub": staff["id"],
        "username": staff["username"],
        "name": staff["name"],
        "role": staff["role"],
        "type": "staff"
    })
    
    await log_activity("staff_login", f"Staff logged in", staff_name=staff["name"])
    
    return {
        "token": token,
        "staff": {
            "id": staff["id"],
            "username": staff["username"],
            "name": staff["name"],
            "role": staff["role"]
        }
    }


@app.get("/api/auth/me")
async def get_current_user(payload: dict = Depends(require_auth)):
    """Get current authenticated user"""
    return payload


# ==================== PLAYERS ENDPOINTS ====================

@app.get("/api/players")
async def get_players(search: Optional[str] = None):
    """Get all players or search"""
    query = {}
    if search:
        query = {"$or": [
            {"name": {"$regex": search, "$options": "i"}},
            {"card_number": {"$regex": search}}
        ]}
    
    players = await db.players.find(query).to_list(100)
    return [{"id": p["id"], "card_number": p["card_number"], "name": p["name"], 
             "phone": p.get("phone", ""), "points": p.get("points", 0), "rank": p.get("rank")} 
            for p in players]


@app.get("/api/players/{player_id}")
async def get_player(player_id: str):
    """Get player by ID"""
    player = await db.players.find_one({"id": player_id})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return {"id": player["id"], "card_number": player["card_number"], "name": player["name"],
            "phone": player.get("phone", ""), "points": player.get("points", 0), "rank": player.get("rank")}


@app.get("/api/players/card/{card_number}")
async def get_player_by_card(card_number: str):
    """Get player by card number"""
    player = await db.players.find_one({"card_number": card_number})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return {"id": player["id"], "card_number": player["card_number"], "name": player["name"],
            "phone": player.get("phone", ""), "points": player.get("points", 0), "rank": player.get("rank")}


@app.post("/api/players/{player_id}/checkin")
async def checkin_player(player_id: str):
    """Check in a player for time tracking"""
    player = await db.players.find_one({"id": player_id})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    checkin = {
        "id": str(uuid.uuid4()),
        "player_id": player_id,
        "player_name": player["name"],
        "checkin_time": datetime.utcnow(),
        "checkout_time": None,
        "hours_played": None,
        "points_earned": None
    }
    await db.checkins.insert_one(checkin)
    await log_activity("player_checkin", "Player checked in", player["name"])
    
    return {"message": "Checked in successfully", "checkin_id": checkin["id"]}


@app.post("/api/players/{player_id}/checkout")
async def checkout_player(player_id: str):
    """Check out a player and calculate time points"""
    checkin = await db.checkins.find_one(
        {"player_id": player_id, "checkout_time": None},
        sort=[("checkin_time", -1)]
    )
    if not checkin:
        raise HTTPException(status_code=400, detail="No active check-in found")
    
    checkout_time = datetime.utcnow()
    hours = (checkout_time - checkin["checkin_time"]).total_seconds() / 3600
    
    # Calculate points: 1-5 hours = 10 pts, 6+ hours = 30 pts
    points = 30 if hours >= 6 else 10 if hours >= 1 else 0
    
    await db.checkins.update_one(
        {"id": checkin["id"]},
        {"$set": {"checkout_time": checkout_time, "hours_played": round(hours, 2), "points_earned": points}}
    )
    
    # Award points to player
    await db.players.update_one(
        {"id": player_id},
        {"$inc": {"points": points}}
    )
    
    player = await db.players.find_one({"id": player_id})
    await log_activity("player_checkout", f"Checked out after {round(hours, 1)} hours, earned {points} points", 
                       player["name"] if player else "Unknown")
    
    return {"message": "Checked out successfully", "hours_played": round(hours, 2), "points_earned": points}


# ==================== GAMES ENDPOINTS ====================

@app.get("/api/games")
async def get_games():
    """Get all available games"""
    games = await db.games.find({"active": True}).to_list(20)
    return serialize_doc(games)


@app.post("/api/games")
async def create_game(game: dict):
    """Create a new game type"""
    game["id"] = str(uuid.uuid4())
    game["active"] = True
    await db.games.insert_one(game)
    return game


# ==================== WAITLIST ENDPOINTS ====================

@app.get("/api/waitlist")
async def get_all_waitlists():
    """Get all waitlist entries grouped by game"""
    entries = await db.waitlist.find({"status": {"$in": ["waiting", "called"]}}).sort("position", 1).to_list(100)
    entries = serialize_doc(entries)
    
    # Group by game
    by_game = {}
    for entry in entries:
        game_id = entry["game_id"]
        if game_id not in by_game:
            by_game[game_id] = []
        by_game[game_id].append(entry)
    
    return {"waitlists": by_game, "total_count": len(entries)}


@app.get("/api/waitlist/{game_id}")
async def get_game_waitlist(game_id: str):
    """Get waitlist for a specific game"""
    entries = await db.waitlist.find(
        {"game_id": game_id, "status": {"$in": ["waiting", "called"]}}
    ).sort("position", 1).to_list(50)
    return serialize_doc(entries)


@app.post("/api/waitlist")
async def join_waitlist(data: WaitlistEntry):
    """Join the waitlist for a game"""
    # Get current max position for this game
    last_entry = await db.waitlist.find_one(
        {"game_id": data.game_id, "status": {"$in": ["waiting", "called"]}},
        sort=[("position", -1)]
    )
    position = (last_entry["position"] + 1) if last_entry else 1
    
    entry = {
        "id": str(uuid.uuid4()),
        "confirmation": generate_confirmation_code("WL"),
        "player_name": data.player_name,
        "phone": data.phone,
        "card_number": data.card_number,
        "game_id": data.game_id,
        "num_players": data.num_players,
        "planned_buyin": data.planned_buyin,
        "position": position,
        "status": "waiting",
        "joined_at": datetime.utcnow(),
        "called_at": None,
        "expires_at": None
    }
    
    await db.waitlist.insert_one(entry)
    await log_activity("waitlist_join", f"Joined waitlist for {data.game_id}", data.player_name)
    
    return {
        "message": "Added to waitlist",
        "entry": serialize_doc(entry)
    }


@app.put("/api/waitlist/{entry_id}/call")
async def call_player(entry_id: str):
    """Call a player from the waitlist"""
    entry = await db.waitlist.find_one({"id": entry_id})
    if not entry:
        raise HTTPException(status_code=404, detail="Waitlist entry not found")
    
    expires_at = datetime.utcnow() + timedelta(minutes=5)
    
    await db.waitlist.update_one(
        {"id": entry_id},
        {"$set": {"status": "called", "called_at": datetime.utcnow(), "expires_at": expires_at}}
    )
    
    await log_activity("waitlist_call", "Player called from waitlist", entry["player_name"])
    
    # Send notification email if available
    player = await db.players.find_one({"card_number": entry.get("card_number")})
    if player and player.get("email"):
        await send_email(
            player["email"],
            "Your Seat is Ready at Speaking Rock Poker!",
            f"<h2>Hi {entry['player_name']}!</h2><p>Your seat is ready! Please check in at the poker room podium within 5 minutes.</p>"
        )
    
    return {"message": "Player called", "expires_at": expires_at.isoformat()}


@app.put("/api/waitlist/{entry_id}/seat")
async def seat_player_from_waitlist(entry_id: str, table_number: int, seat_number: int):
    """Seat a player from the waitlist"""
    entry = await db.waitlist.find_one({"id": entry_id})
    if not entry:
        raise HTTPException(status_code=404, detail="Waitlist entry not found")
    
    await db.waitlist.update_one(
        {"id": entry_id},
        {"$set": {"status": "seated", "seated_at": datetime.utcnow()}}
    )
    
    # Add to table seat
    await db.seats.insert_one({
        "id": str(uuid.uuid4()),
        "table_number": table_number,
        "seat_number": seat_number,
        "player_name": entry["player_name"],
        "card_number": entry.get("card_number"),
        "seated_at": datetime.utcnow()
    })
    
    await log_activity("player_seated", f"Seated at Table {table_number}, Seat {seat_number}", 
                       entry["player_name"], str(table_number))
    
    return {"message": "Player seated", "table": table_number, "seat": seat_number}


@app.delete("/api/waitlist/{entry_id}")
async def remove_from_waitlist(entry_id: str):
    """Remove a player from the waitlist"""
    entry = await db.waitlist.find_one({"id": entry_id})
    if not entry:
        raise HTTPException(status_code=404, detail="Waitlist entry not found")
    
    await db.waitlist.update_one(
        {"id": entry_id},
        {"$set": {"status": "removed", "removed_at": datetime.utcnow()}}
    )
    
    await log_activity("waitlist_remove", "Removed from waitlist", entry["player_name"])
    
    return {"message": "Removed from waitlist"}


@app.get("/api/waitlist/player/{card_number}")
async def get_player_waitlist_status(card_number: str):
    """Get waitlist status for a specific player"""
    entries = await db.waitlist.find(
        {"card_number": card_number, "status": {"$in": ["waiting", "called"]}}
    ).to_list(10)
    return serialize_doc(entries)


# ==================== TABLES ENDPOINTS ====================

@app.get("/api/tables")
async def get_tables():
    """Get all tables with their status"""
    tables = await db.tables.find({"status": {"$ne": "closed"}}).to_list(20)
    
    # Enrich with seat info
    for table in tables:
        seats = await db.seats.find({"table_number": table["table_number"]}).to_list(10)
        table["seats"] = serialize_doc(seats)
        table["occupied_count"] = len(seats)
        table["available_seats"] = table.get("capacity", 9) - len(seats)
    
    return serialize_doc(tables)


@app.get("/api/tables/{table_number}")
async def get_table(table_number: int):
    """Get detailed table info"""
    table = await db.tables.find_one({"table_number": table_number})
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    seats = await db.seats.find({"table_number": table_number}).to_list(10)
    table["seats"] = serialize_doc(seats)
    return serialize_doc(table)


@app.post("/api/tables")
async def open_table(data: TableCreate):
    """Open a new table"""
    existing = await db.tables.find_one({"table_number": data.table_number, "status": "open"})
    if existing:
        raise HTTPException(status_code=400, detail="Table already open")
    
    game = await db.games.find_one({"id": data.game_id})
    
    table = {
        "id": str(uuid.uuid4()),
        "table_number": data.table_number,
        "game_id": data.game_id,
        "game_name": game["name"] if game else "Unknown",
        "stakes": game["stakes"] if game else "$1/$3",
        "capacity": data.capacity,
        "status": "open",
        "opened_at": datetime.utcnow()
    }
    
    await db.tables.insert_one(table)
    await log_activity("table_open", f"Table {data.table_number} opened for {table['game_name']}", 
                       table_number=str(data.table_number))
    
    return serialize_doc(table)


@app.delete("/api/tables/{table_number}")
async def close_table(table_number: int):
    """Close a table"""
    await db.tables.update_one(
        {"table_number": table_number},
        {"$set": {"status": "closed", "closed_at": datetime.utcnow()}}
    )
    
    # Remove all seats
    await db.seats.delete_many({"table_number": table_number})
    await log_activity("table_close", f"Table {table_number} closed", table_number=str(table_number))
    
    return {"message": f"Table {table_number} closed"}


@app.post("/api/tables/{table_number}/seats/{seat_number}")
async def seat_player(table_number: int, seat_number: int, data: SeatAssignment):
    """Seat a player at a specific seat"""
    existing = await db.seats.find_one({"table_number": table_number, "seat_number": seat_number})
    if existing:
        raise HTTPException(status_code=400, detail="Seat is occupied")
    
    seat = {
        "id": str(uuid.uuid4()),
        "table_number": table_number,
        "seat_number": seat_number,
        "player_id": data.player_id,
        "player_name": data.player_name,
        "card_number": data.card_number,
        "seated_at": datetime.utcnow()
    }
    
    await db.seats.insert_one(seat)
    await log_activity("player_seated", f"Seated at Seat {seat_number}", data.player_name, str(table_number))
    
    return serialize_doc(seat)


@app.delete("/api/tables/{table_number}/seats/{seat_number}")
async def remove_player_from_seat(table_number: int, seat_number: int):
    """Remove a player from a seat"""
    seat = await db.seats.find_one({"table_number": table_number, "seat_number": seat_number})
    if seat:
        await log_activity("player_removed", f"Removed from Seat {seat_number}", 
                          seat.get("player_name"), str(table_number))
    
    await db.seats.delete_one({"table_number": table_number, "seat_number": seat_number})
    return {"message": "Player removed from seat"}


# ==================== TOURNAMENTS ENDPOINTS ====================

@app.get("/api/tournaments")
async def get_tournaments():
    """Get all tournaments"""
    tournaments = await db.tournaments.find({"active": True}).to_list(50)
    return serialize_doc(tournaments)


@app.get("/api/tournaments/{tournament_id}")
async def get_tournament(tournament_id: str):
    """Get tournament details"""
    tournament = await db.tournaments.find_one({"id": tournament_id})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    registrations = await db.tournament_registrations.find({"tournament_id": tournament_id}).to_list(200)
    tournament["registrations"] = serialize_doc(registrations)
    return serialize_doc(tournament)


@app.post("/api/tournaments")
async def create_tournament(data: TournamentCreate):
    """Create a new tournament"""
    tournament = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "date": data.date,
        "time": data.time,
        "buyin": data.buyin,
        "rebuy": data.rebuy,
        "addon": data.addon,
        "guarantee": data.guarantee,
        "registered_count": 0,
        "active": True,
        "created_at": datetime.utcnow()
    }
    
    await db.tournaments.insert_one(tournament)
    await log_activity("tournament_create", f"Created tournament: {data.name}")
    
    return tournament


@app.post("/api/tournaments/{tournament_id}/register")
async def register_for_tournament(tournament_id: str, data: TournamentRegistration):
    """Register a player for a tournament"""
    tournament = await db.tournaments.find_one({"id": tournament_id})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    # Check if already registered
    existing = await db.tournament_registrations.find_one({
        "tournament_id": tournament_id,
        "phone": data.phone
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already registered for this tournament")
    
    registration = {
        "id": str(uuid.uuid4()),
        "confirmation": generate_confirmation_code(),
        "tournament_id": tournament_id,
        "player_name": data.player_name,
        "phone": data.phone,
        "email": data.email,
        "card_number": data.card_number,
        "registered_at": datetime.utcnow(),
        "status": "registered"
    }
    
    await db.tournament_registrations.insert_one(registration)
    await db.tournaments.update_one({"id": tournament_id}, {"$inc": {"registered_count": 1}})
    await log_activity("tournament_register", f"Registered for {tournament['name']}", data.player_name)
    
    # Send confirmation email
    if data.email:
        await send_email(
            data.email,
            f"Tournament Registration Confirmed - {tournament['name']}",
            f"<h2>Registration Confirmed!</h2><p>You are registered for <strong>{tournament['name']}</strong></p><p>Date: {tournament['date']} at {tournament['time']}</p><p>Confirmation: <strong>{registration['confirmation']}</strong></p><p>Please arrive 15 minutes early to check in.</p>"
        )
    
    return {"message": "Registered successfully", "registration": serialize_doc(registration)}


# ==================== FLUSH ATTACK ENDPOINTS ====================

@app.get("/api/flush/leaderboard")
async def get_flush_leaderboard():
    """Get Flush Attack leaderboard"""
    # Determine current session
    now = datetime.now()
    hour = now.hour
    if 14 <= hour < 20:
        current_session = "flush_shine"
    elif hour >= 20 or hour < 2:
        current_session = "last_call"
    else:
        current_session = None
    
    # Get all players with flush progress
    progress = await db.flush_progress.find({"session": current_session}).to_list(50)
    
    # Sort by suit count
    leaderboard = []
    for p in progress:
        suits = p.get("suits", [])
        leaderboard.append({
            "id": p["player_id"],
            "name": p["player_name"],
            "card_number": p.get("card_number"),
            "suits": suits,
            "count": len(suits),
            "score": f"{len(suits)}/4"
        })
    
    leaderboard.sort(key=lambda x: x["count"], reverse=True)
    
    return {
        "session": current_session,
        "leaders": leaderboard
    }


@app.get("/api/flush/jackpots")
async def get_flush_jackpots():
    """Get current flush jackpot amounts"""
    jackpots = await db.flush_jackpots.find({}).to_list(2)
    
    # Determine active session
    now = datetime.now()
    hour = now.hour
    active = "flush_shine" if 14 <= hour < 20 else "last_call" if hour >= 20 or hour < 2 else None
    
    return {
        "jackpots": jackpots,
        "active_session": active
    }


@app.post("/api/flush/{player_id}/suit")
async def award_flush_suit(player_id: str, data: FlushSuitAward):
    """Award a flush suit to a player"""
    # Determine current session
    now = datetime.now()
    hour = now.hour
    session = "flush_shine" if 14 <= hour < 20 else "last_call"
    
    player = await db.players.find_one({"id": player_id})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    # Get or create progress entry
    progress = await db.flush_progress.find_one({"player_id": player_id, "session": session})
    
    if progress:
        suits = progress.get("suits", [])
        if data.suit not in suits:
            suits.append(data.suit)
            await db.flush_progress.update_one(
                {"id": progress["id"]},
                {"$set": {"suits": suits, "updated_at": datetime.utcnow()}}
            )
    else:
        progress = {
            "id": str(uuid.uuid4()),
            "player_id": player_id,
            "player_name": player["name"],
            "card_number": player.get("card_number"),
            "session": session,
            "suits": [data.suit],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await db.flush_progress.insert_one(progress)
        suits = [data.suit]
    
    suit_symbols = {"spade": "♠️", "heart": "♥️", "diamond": "♦️", "club": "♣️"}
    await log_activity("flush_award", f"Awarded {suit_symbols.get(data.suit, data.suit)} flush", player["name"])
    
    # Check for winner
    if len(suits) >= 4:
        await log_activity("flush_winner", "WON THE FLUSH ATTACK JACKPOT!", player["name"])
    
    return {"message": "Suit awarded", "suits": suits, "count": len(suits)}


@app.delete("/api/flush/reset")
async def reset_flush_progress():
    """Reset all flush progress (end of session)"""
    await db.flush_progress.delete_many({})
    await log_activity("flush_reset", "All flush progress reset")
    return {"message": "All flush progress reset"}


# ==================== FOOD ORDERS ENDPOINTS ====================

@app.get("/api/orders")
async def get_orders(status: Optional[str] = None):
    """Get all food orders"""
    query = {}
    if status:
        query["status"] = status
    else:
        query["status"] = {"$in": ["pending", "preparing"]}
    
    orders = await db.food_orders.find(query).sort("created_at", 1).to_list(50)
    return orders


@app.post("/api/orders")
async def create_order(data: FoodOrderCreate):
    """Create a new food order"""
    order = {
        "id": str(uuid.uuid4()),
        "order_number": f"#{await db.food_orders.count_documents({}) + 1001}",
        "player_name": data.player_name,
        "card_number": data.card_number,
        "table_number": data.table_number,
        "items": data.items,
        "status": "pending",
        "created_at": datetime.utcnow(),
        "started_at": None,
        "completed_at": None
    }
    
    await db.food_orders.insert_one(order)
    await log_activity("order_create", f"New order placed", data.player_name, str(data.table_number))
    
    return {"message": "Order placed", "order": order}


@app.put("/api/orders/{order_id}/start")
async def start_order(order_id: str):
    """Mark order as in progress"""
    await db.food_orders.update_one(
        {"id": order_id},
        {"$set": {"status": "preparing", "started_at": datetime.utcnow()}}
    )
    order = await db.food_orders.find_one({"id": order_id})
    await log_activity("order_start", "Started preparing order", table_number=str(order.get("table_number")))
    return {"message": "Order started"}


@app.put("/api/orders/{order_id}/complete")
async def complete_order(order_id: str):
    """Mark order as completed"""
    await db.food_orders.update_one(
        {"id": order_id},
        {"$set": {"status": "delivered", "completed_at": datetime.utcnow()}}
    )
    order = await db.food_orders.find_one({"id": order_id})
    await log_activity("order_complete", "Order delivered", table_number=str(order.get("table_number")))
    return {"message": "Order completed"}


@app.delete("/api/orders/{order_id}")
async def cancel_order(order_id: str):
    """Cancel an order"""
    await db.food_orders.update_one(
        {"id": order_id},
        {"$set": {"status": "cancelled", "cancelled_at": datetime.utcnow()}}
    )
    return {"message": "Order cancelled"}


# ==================== POINTS ENDPOINTS ====================

@app.get("/api/points/leaderboard")
async def get_points_leaderboard():
    """Get January Points Race leaderboard"""
    players = await db.players.find({"points": {"$gt": 0}}).sort("points", -1).to_list(100)
    
    leaderboard = []
    for i, p in enumerate(players):
        leaderboard.append({
            "rank": i + 1,
            "id": p["id"],
            "card_number": p["card_number"],
            "name": p["name"],
            "points": p.get("points", 0)
        })
    
    # Update ranks in database
    for entry in leaderboard:
        await db.players.update_one({"id": entry["id"]}, {"$set": {"rank": entry["rank"]}})
    
    return {
        "leaderboard": leaderboard,
        "top30_cutoff": leaderboard[29]["points"] if len(leaderboard) >= 30 else 0
    }


@app.post("/api/points/award")
async def award_points(data: PointsAward):
    """Award points to a player"""
    await db.players.update_one(
        {"id": data.player_id},
        {"$inc": {"points": data.points}}
    )
    
    player = await db.players.find_one({"id": data.player_id})
    
    # Log the transaction
    await db.points_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "player_id": data.player_id,
        "player_name": player["name"] if player else "Unknown",
        "points": data.points,
        "reason": data.reason,
        "awarded_at": datetime.utcnow()
    })
    
    await log_activity("points_award", f"Awarded {data.points} points ({data.reason})", 
                       player["name"] if player else "Unknown")
    
    return {"message": f"Awarded {data.points} points", "new_total": player.get("points", 0) + data.points if player else data.points}


# ==================== ACTIVITY LOG ENDPOINTS ====================

@app.get("/api/activity")
async def get_activity_log(
    limit: int = Query(default=50, le=500),
    action_type: Optional[str] = None,
    staff: Optional[str] = None
):
    """Get activity log with filters"""
    query = {}
    if action_type and action_type != "all":
        query["action_type"] = action_type
    if staff and staff != "all":
        query["staff_name"] = staff
    
    logs = await db.activity_log.find(query).sort("timestamp", -1).limit(limit).to_list(limit)
    return logs


# ==================== LIVE STATUS ENDPOINTS ====================

@app.get("/api/live-status")
async def get_live_status():
    """Get live poker room status for public display"""
    tables = await db.tables.find({"status": "open"}).to_list(20)
    
    total_seats = 0
    occupied_seats = 0
    
    for table in tables:
        total_seats += table.get("capacity", 9)
        seats = await db.seats.count_documents({"table_number": table["table_number"]})
        occupied_seats += seats
    
    waitlist_count = await db.waitlist.count_documents({"status": {"$in": ["waiting", "called"]}})
    
    return {
        "tables_open": len(tables),
        "seats_available": total_seats - occupied_seats,
        "players_seated": occupied_seats,
        "waitlist_count": waitlist_count,
        "avg_wait_minutes": waitlist_count * 4 if waitlist_count > 0 else 0
    }


@app.get("/api/display/waitlist")
async def get_display_waitlist():
    """Get waitlist data formatted for TV display"""
    games = await db.games.find({"active": True}).to_list(10)
    tables = await db.tables.find({"status": "open"}).to_list(20)
    
    display_data = []
    for game in games:
        game_tables = [t for t in tables if t["game_id"] == game["id"]]
        seats_open = 0
        for t in game_tables:
            occupied = await db.seats.count_documents({"table_number": t["table_number"]})
            seats_open += t.get("capacity", 9) - occupied
        
        waitlist = await db.waitlist.find(
            {"game_id": game["id"], "status": {"$in": ["waiting", "called"]}}
        ).sort("position", 1).to_list(10)
        
        display_data.append({
            "game": game,
            "tables": len(game_tables),
            "seats_open": seats_open,
            "waitlist": [w["player_name"] for w in waitlist],
            "waitlist_count": len(waitlist)
        })
    
    return display_data


@app.get("/api/display/flush")
async def get_display_flush():
    """Get flush attack data for TV display"""
    jackpots = await db.flush_jackpots.find({}).to_list(2)
    
    now = datetime.now()
    hour = now.hour
    active_session = "flush_shine" if 14 <= hour < 20 else "last_call" if hour >= 20 or hour < 2 else None
    
    progress = await db.flush_progress.find({}).to_list(50)
    
    leaders = []
    for p in progress:
        suits = p.get("suits", [])
        if len(suits) > 0:  # Only show players with at least 1 flush
            suit_display = []
            for s in suits:
                if s == "spade" or s == "S": suit_display.append("S")
                elif s == "heart" or s == "H": suit_display.append("H")
                elif s == "diamond" or s == "D": suit_display.append("D")
                elif s == "club" or s == "C": suit_display.append("C")
            
            leaders.append({
                "name": p["player_name"],
                "suits": suit_display,
                "score": f"{len(suits)}/4"
            })
    
    leaders.sort(key=lambda x: len(x["suits"]), reverse=True)
    
    return {
        "jackpots": {j["session"]: j["amount"] for j in jackpots},
        "active_session": active_session,
        "leaders": leaders[:12]
    }


# ==================== HEALTH CHECK ====================

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


# Serve static files (HTML pages)
@app.get("/")
async def serve_index():
    return FileResponse("/app/index.html")


@app.get("/{filename}.html")
async def serve_html(filename: str):
    filepath = f"/app/{filename}.html"
    if os.path.exists(filepath):
        return FileResponse(filepath)
    raise HTTPException(status_code=404, detail="Page not found")


@app.get("/{filename}.{ext}")
async def serve_static(filename: str, ext: str):
    filepath = f"/app/{filename}.{ext}"
    if os.path.exists(filepath):
        return FileResponse(filepath)
    raise HTTPException(status_code=404, detail="File not found")
