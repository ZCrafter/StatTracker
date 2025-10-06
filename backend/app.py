from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import asyncpg
import os
import asyncio

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Database configuration
DB_CONFIG = {
    "host": os.getenv("DATABASE_HOST", "stattracker-postgres"),
    "port": int(os.getenv("DATABASE_PORT", "5432")),
    "user": os.getenv("DATABASE_USER", "tracker"),
    "password": os.getenv("DATABASE_PASSWORD", "tracker123"),
    "database": os.getenv("DATABASE_NAME", "lifestats"),
}

class EventSubmission(BaseModel):
    event_type: str
    location: str
    timestamp: datetime = None

class ToothbrushSubmission(BaseModel):
    timestamp: datetime = None
    used_irrigator: bool = False

async def get_db_connection():
    """Get database connection with detailed logging"""
    try:
        print(f"🔧 Attempting database connection to: {DB_CONFIG['host']}:{DB_CONFIG['port']}")
        conn = await asyncpg.connect(**DB_CONFIG)
        print("✅ Database connection successful!")
        return conn
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        raise

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    print("🚀 Starting StatTracker Backend...")
    try:
        conn = await get_db_connection()
        
        # Create tables
        print("🗃️ Creating database tables...")
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS events (
                id SERIAL PRIMARY KEY,
                event_type VARCHAR(10) NOT NULL,
                location VARCHAR(20) NOT NULL,
                timestamp TIMESTAMP DEFAULT NOW()
            )
        ''')
        print("✅ Events table created")
        
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS toothbrush_events (
                id SERIAL PRIMARY KEY,
                timestamp TIMESTAMP DEFAULT NOW(),
                used_irrigator BOOLEAN DEFAULT FALSE
            )
        ''')
        print("✅ Toothbrush events table created")
        
        await conn.close()
        print("🎉 Database initialization complete!")
        
    except Exception as e:
        print(f"💥 Startup failed: {e}")

@app.get("/")
async def root():
    return {"status": "backend running", "message": "Visit /test-db to check database connection"}

@app.get("/test-db")
async def test_db():
    """Test database connection endpoint"""
    try:
        conn = await get_db_connection()
        
        # Get database info
        version = await conn.fetchval("SELECT version()")
        event_count = await conn.fetchval("SELECT COUNT(*) FROM events")
        toothbrush_count = await conn.fetchval("SELECT COUNT(*) FROM toothbrush_events")
        
        await conn.close()
        
        return {
            "status": "success", 
            "database": "connected",
            "postgres_version": version.split(',')[0],
            "event_count": event_count,
            "toothbrush_count": toothbrush_count
        }
    except Exception as e:
        return {
            "status": "error", 
            "database": "disconnected",
            "message": str(e)
        }

@app.post("/api/events")
async def submit_event(event: EventSubmission):
    try:
        conn = await get_db_connection()
        await conn.execute(
            "INSERT INTO events (event_type, location, timestamp) VALUES ($1, $2, $3)",
            event.event_type, event.location, event.timestamp or datetime.now()
        )
        await conn.close()
        print(f"✅ Event submitted: {event.event_type} at {event.location}")
        return {"status": "success"}
    except Exception as e:
        print(f"❌ Error submitting event: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/toothbrush")
async def submit_toothbrush(event: ToothbrushSubmission):
    try:
        conn = await get_db_connection()
        await conn.execute(
            "INSERT INTO toothbrush_events (timestamp, used_irrigator) VALUES ($1, $2)",
            event.timestamp or datetime.now(), event.used_irrigator
        )
        await conn.close()
        print(f"✅ Toothbrush event submitted: irrigator={event.used_irrigator}")
        return {"status": "success"}
    except Exception as e:
        print(f"❌ Error submitting toothbrush: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/data")
async def get_data():
    try:
        conn = await get_db_connection()
        events = await conn.fetch("SELECT * FROM events ORDER BY timestamp DESC")
        toothbrush = await conn.fetch("SELECT * FROM toothbrush_events ORDER BY timestamp DESC")
        await conn.close()
        print(f"📊 Data fetched: {len(events)} events, {len(toothbrush)} toothbrush events")
        return {"events": [dict(record) for record in events], "toothbrush": [dict(record) for record in toothbrush]}
    except Exception as e:
        print(f"❌ Error fetching data: {e}")
        return {"events": [], "toothbrush": []}

@app.delete("/api/events/{event_id}")
async def delete_event(event_id: int):
    try:
        conn = await get_db_connection()
        await conn.execute("DELETE FROM events WHERE id = $1", event_id)
        await conn.close()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stats")
async def get_stats():
    try:
        conn = await get_db_connection()
        
        # Get earliest event date
        first_event = await conn.fetchval("SELECT MIN(timestamp) FROM events")
        first_toothbrush = await conn.fetchval("SELECT MIN(timestamp) FROM toothbrush_events")
        
        # Get all-time averages
        total_events = await conn.fetchval("SELECT COUNT(*) FROM events")
        total_toothbrush = await conn.fetchval("SELECT COUNT(*) FROM toothbrush_events")
        
        # Calculate days since first event
        if first_event:
            days_since_first = (datetime.now() - first_event).days or 1
        else:
            days_since_first = 1
            
        # Event counts by type
        event_counts = await conn.fetch("SELECT event_type, COUNT(*) FROM events GROUP BY event_type")
        event_counts_dict = {row['event_type']: row['count'] for row in event_counts}
        
        stats = {
            "first_event_date": first_event.isoformat() if first_event else None,
            "first_toothbrush_date": first_toothbrush.isoformat() if first_toothbrush else None,
            "all_time_averages": {
                "pee": round(event_counts_dict.get('pee', 0) / days_since_first, 1),
                "poo": round(event_counts_dict.get('poo', 0) / days_since_first, 1),
                "cum": round(event_counts_dict.get('cum', 0) / days_since_first, 1),
                "toothbrush": round(total_toothbrush / days_since_first, 1)
            },
            "total_days": days_since_first
        }
        
        await conn.close()
        return stats
    except Exception as e:
        print(f"Error fetching stats: {e}")
        return {
            "first_event_date": None,
            "first_toothbrush_date": None,
            "all_time_averages": {"pee": 0, "poo": 0, "cum": 0, "toothbrush": 0},
            "total_days": 1
        }
