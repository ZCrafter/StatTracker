from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import asyncpg
import os
import asyncio

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Get database configuration from environment variables
DB_CONFIG = {
    "host": os.getenv("DATABASE_HOST", "stattracker-postgres"),
    "port": int(os.getenv("DATABASE_PORT", "5432")),
    "user": os.getenv("DATABASE_USER", "tracker"),
    "password": os.getenv("DATABASE_PASSWORD", "tracker123"),
    "database": os.getenv("DATABASE_NAME", "lifestats"),
    "timeout": 30
}

class EventSubmission(BaseModel):
    event_type: str
    location: str
    timestamp: datetime = None

class ToothbrushSubmission(BaseModel):
    timestamp: datetime = None
    used_irrigator: bool = False

async def get_db_connection():
    """Get database connection with comprehensive error handling"""
    max_retries = 10
    last_error = None
    
    for attempt in range(max_retries):
        try:
            print(f"🔧 Database connection attempt {attempt + 1}/{max_retries}")
            print(f"   Connecting to: {DB_CONFIG['host']}:{DB_CONFIG['port']}")
            print(f"   Database: {DB_CONFIG['database']}, User: {DB_CONFIG['user']}")
            
            conn = await asyncpg.connect(**DB_CONFIG)
            
            # Test the connection
            version = await conn.fetchval("SELECT version()")
            print(f"✅ Database connection successful!")
            print(f"   PostgreSQL version: {version.split(',')[0]}")
            
            return conn
            
        except Exception as e:
            last_error = e
            print(f"❌ Connection failed (attempt {attempt + 1}): {str(e)}")
            
            if attempt < max_retries - 1:
                wait_time = 2
                print(f"   Waiting {wait_time} seconds before retry...")
                await asyncio.sleep(wait_time)
            else:
                print(f"💥 All connection attempts failed")
                raise Exception(f"Failed to connect to database after {max_retries} attempts. Last error: {str(last_error)}")

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    print("🚀 Starting StatTracker Backend...")
    print("📊 Database Configuration:")
    for key, value in DB_CONFIG.items():
        if key != 'password':
            print(f"   {key}: {value}")
        else:
            print(f"   {key}: {'*' * len(value)}")
    
    try:
        conn = await get_db_connection()
        
        # Create tables if they don't exist
        print("🗃️ Creating/verifying database tables...")
        
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS events (
                id SERIAL PRIMARY KEY,
                event_type VARCHAR(10) NOT NULL,
                location VARCHAR(20) NOT NULL,
                timestamp TIMESTAMP DEFAULT NOW()
            )
        ''')
        print("   ✅ Events table ready")
        
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS toothbrush_events (
                id SERIAL PRIMARY KEY,
                timestamp TIMESTAMP DEFAULT NOW(),
                used_irrigator BOOLEAN DEFAULT FALSE
            )
        ''')
        print("   ✅ Toothbrush events table ready")
        
        await conn.close()
        print("🎉 Database initialization complete!")
        
    except Exception as e:
        print(f"💥 Startup failed: {e}")
        # Don't raise here, let the app start anyway

@app.get("/")
async def root():
    return {
        "status": "backend running", 
        "service": "StatTracker Backend",
        "endpoints": {
            "test_db": "/test-db",
            "submit_event": "POST /api/events",
            "get_data": "GET /api/data"
        }
    }

@app.get("/test-db")
async def test_db():
    """Test database connection endpoint"""
    try:
        conn = await get_db_connection()
        
        # Get some stats
        event_count = await conn.fetchval("SELECT COUNT(*) FROM events")
        toothbrush_count = await conn.fetchval("SELECT COUNT(*) FROM toothbrush_events")
        version = await conn.fetchval("SELECT version()")
        
        await conn.close()
        
        return {
            "status": "success", 
            "postgres_version": version.split(',')[0],
            "event_count": event_count,
            "toothbrush_count": toothbrush_count,
            "database_connection": "healthy"
        }
    except Exception as e:
        return {
            "status": "error", 
            "message": str(e),
            "database_connection": "unhealthy"
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
        result = await conn.execute("DELETE FROM events WHERE id = $1", event_id)
        await conn.close()
        return {"status": "success", "message": f"Event {event_id} deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
