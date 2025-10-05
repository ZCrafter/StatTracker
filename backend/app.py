from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import asyncpg
import os
import csv
import io
import time

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Use the service name from docker-compose as hostname
DATABASE_URL = "postgresql://tracker:tracker123@postgres:5432/lifestats"

class EventSubmission(BaseModel):
    event_type: str
    location: str
    timestamp: datetime = None

class ToothbrushSubmission(BaseModel):
    timestamp: datetime = None
    used_irrigator: bool = False

async def get_db():
    max_retries = 5
    retry_delay = 2
    
    for attempt in range(max_retries):
        try:
            conn = await asyncpg.connect(DATABASE_URL)
            print(f"Database connection successful on attempt {attempt + 1}")
            return conn
        except Exception as e:
            print(f"Database connection attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                print(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
            else:
                print("All database connection attempts failed")
                raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")

@app.on_event("startup")
async def startup_event():
    print("Testing database connection on startup...")
    try:
        conn = await get_db()
        # Test the connection by creating tables if they don't exist
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS events (
                id SERIAL PRIMARY KEY,
                event_type VARCHAR(10) NOT NULL,
                location VARCHAR(20) NOT NULL,
                timestamp TIMESTAMP DEFAULT NOW()
            )
        ''')
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS toothbrush_events (
                id SERIAL PRIMARY KEY,
                timestamp TIMESTAMP DEFAULT NOW(),
                used_irrigator BOOLEAN DEFAULT FALSE
            )
        ''')
        await conn.close()
        print("Database tables verified/created successfully")
    except Exception as e:
        print(f"Startup database check failed: {e}")

@app.get("/")
async def root():
    return {"status": "backend running"}

@app.post("/api/events")
async def submit_event(event: EventSubmission):
    try:
        conn = await get_db()
        await conn.execute(
            "INSERT INTO events (event_type, location, timestamp) VALUES ($1, $2, $3)",
            event.event_type, event.location, event.timestamp or datetime.now()
        )
        await conn.close()
        print(f"Event submitted: {event.event_type} at {event.location}")
        return {"status": "success"}
    except Exception as e:
        print(f"Error submitting event: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/toothbrush")
async def submit_toothbrush(event: ToothbrushSubmission):
    try:
        conn = await get_db()
        await conn.execute(
            "INSERT INTO toothbrush_events (timestamp, used_irrigator) VALUES ($1, $2)",
            event.timestamp or datetime.now(), event.used_irrigator
        )
        await conn.close()
        print(f"Toothbrush event submitted: irrigator={event.used_irrigator}")
        return {"status": "success"}
    except Exception as e:
        print(f"Error submitting toothbrush: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/data")
async def get_data():
    try:
        conn = await get_db()
        events = await conn.fetch("SELECT * FROM events ORDER BY timestamp DESC")
        toothbrush = await conn.fetch("SELECT * FROM toothbrush_events ORDER BY timestamp DESC")
        await conn.close()
        print(f"Data fetched: {len(events)} events, {len(toothbrush)} toothbrush events")
        return {"events": [dict(record) for record in events], "toothbrush": [dict(record) for record in toothbrush]}
    except Exception as e:
        print(f"Error fetching data: {e}")
        return {"events": [], "toothbrush": []}

@app.get("/api/stats")
async def get_stats():
    try:
        async with await get_db() as conn:
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
            
        return stats
    except Exception as e:
        print(f"Error fetching stats: {e}")
        return {
            "first_event_date": None,
            "first_toothbrush_date": None,
            "all_time_averages": {"pee": 0, "poo": 0, "cum": 0, "toothbrush": 0},
            "total_days": 1
        }

@app.delete("/api/events/{id}")
async def delete_event(id: int):
    async with await get_db() as conn:
        await conn.execute("DELETE FROM events WHERE id = $1", id)
    return {"status": "deleted"}

@app.post("/api/import/events")
async def import_events_csv(file: UploadFile = File(...)):
    contents = await file.read()
    csv_file = io.StringIO(contents.decode('utf-8'))
    csv_reader = csv.DictReader(csv_file)
    
    rows_processed = 0
    async with await get_db() as conn:
        for row in csv_reader:
            timestamp_str = row.get('Timestamp') or row.get('Time') or row.get('Date')
            if timestamp_str:
                try:
                    timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                except:
                    try:
                        timestamp = datetime.strptime(timestamp_str, '%m/%d/%Y %H:%M:%S')
                    except:
                        timestamp = datetime.now()
            else:
                timestamp = datetime.now()
                
            event_type = map_event_type(row.get('Event Type') or row.get('Event') or '')
            location = map_location(row.get('Location') or 'home')
            
            await conn.execute(
                "INSERT INTO events (event_type, location, timestamp) VALUES ($1, $2, $3)",
                event_type, location, timestamp
            )
            rows_processed += 1
    
    return {"status": "imported", "rows_processed": rows_processed}

@app.post("/api/import/toothbrush")
async def import_toothbrush_csv(file: UploadFile = File(...)):
    contents = await file.read()
    csv_file = io.StringIO(contents.decode('utf-8'))
    csv_reader = csv.DictReader(csv_file)
    
    rows_processed = 0
    async with await get_db() as conn:
        for row in csv_reader:
            timestamp_str = row.get('Timestamp') or row.get('Time') or row.get('Date')
            if timestamp_str:
                try:
                    timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                except:
                    try:
                        timestamp = datetime.strptime(timestamp_str, '%m/%d/%Y %H:%M:%S')
                    except:
                        timestamp = datetime.now()
            else:
                timestamp = datetime.now()
            
            used_irrigator = row.get('Used Irrigator', '').lower() in ['true', 'yes', '1']
            
            await conn.execute(
                "INSERT INTO toothbrush_events (timestamp, used_irrigator) VALUES ($1, $2)",
                timestamp, used_irrigator
            )
            rows_processed += 1
    
    return {"status": "imported", "rows_processed": rows_processed}

# Helper functions for mapping
def map_event_type(google_forms_value: str) -> str:
    """Map Google Forms responses to your event types"""
    if not google_forms_value:
        return 'pee'
        
    value = google_forms_value.lower().strip()
    if 'pee' in value or 'urinate' in value:
        return 'pee'
    elif 'poo' in value or 'defecate' in value or 'bowel' in value:
        return 'poo'
    elif 'cum' in value or 'ejaculate' in value:
        return 'cum'
    else:
        return 'pee'

def map_location(google_forms_value: str) -> str:
    """Map Google Forms locations to your location options"""
    if not google_forms_value:
        return 'home'
        
    value = google_forms_value.lower().strip()
    if 'home' in value:
        return 'home'
    elif 'work' in value:
        return 'work'
    else:
        return 'other'

@app.get("/")
async def root():
    return {"status": "backend running"}
