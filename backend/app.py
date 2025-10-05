from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import asyncpg
import os
import csv
import io
from datetime import datetime

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

DATABASE_URL = os.getenv("DATABASE_URL")

class EventSubmission(BaseModel):
    event_type: str
    location: str
    who: str = None
    timestamp: datetime = None

class ToothbrushSubmission(BaseModel):
    timestamp: datetime = None

async def get_db():
    return await asyncpg.connect(DATABASE_URL)

@app.post("/api/events")
async def submit_event(event: EventSubmission):
    async with await get_db() as conn:
        await conn.execute(
            "INSERT INTO events (event_type, location, who, timestamp) VALUES ($1, $2, $3, $4)",
            event.event_type, event.location, event.who, event.timestamp or datetime.now()
        )
    return {"status": "success"}

@app.post("/api/toothbrush")
async def submit_toothbrush(event: ToothbrushSubmission):
    async with await get_db() as conn:
        await conn.execute(
            "INSERT INTO toothbrush_events (timestamp) VALUES ($1)",
            event.timestamp or datetime.now()
        )
    return {"status": "success"}

@app.get("/api/data")
async def get_data():
    async with await get_db() as conn:
        events = await conn.fetch("SELECT * FROM events ORDER BY timestamp DESC")
        toothbrush = await conn.fetch("SELECT * FROM toothbrush_events ORDER BY timestamp DESC")
    return {"events": [dict(record) for record in events], "toothbrush": [dict(record) for record in toothbrush]}

@app.delete("/api/events/{id}")
async def delete_event(id: int):
    async with await get_db() as conn:
        await conn.execute("DELETE FROM events WHERE id = $1", id)
    return {"status": "deleted"}

@app.get("/")
async def root():
    return {"status": "backend running"}

@app.post("/api/import/events")
async def import_events_csv(file: UploadFile = File(...)):
    contents = await file.read()
    csv_file = io.StringIO(contents.decode('utf-8'))
    csv_reader = csv.DictReader(csv_file)
    
    async with await get_db() as conn:
        for row in csv_reader:
            # Map Google Forms columns to your database
            # Adjust these mappings based on your actual CSV headers
            timestamp = datetime.fromisoformat(row['Timestamp'].replace('Z', '+00:00'))
            event_type = map_event_type(row['Event Type'])  # Custom mapping function
            location = map_location(row['Location'])  # Custom mapping function
            who = row.get('Who', '').strip()
            
            await conn.execute(
                "INSERT INTO events (event_type, location, who, timestamp) VALUES ($1, $2, $3, $4)",
                event_type, location, who, timestamp
            )
    
    return {"status": "imported", "rows_processed": csv_reader.line_num - 1}

@app.post("/api/import/toothbrush")
async def import_toothbrush_csv(file: UploadFile = File(...)):
    contents = await file.read()
    csv_file = io.StringIO(contents.decode('utf-8'))
    csv_reader = csv.DictReader(csv_file)
    
    async with await get_db() as conn:
        for row in csv_reader:
            timestamp = datetime.fromisoformat(row['Timestamp'].replace('Z', '+00:00'))
            
            await conn.execute(
                "INSERT INTO toothbrush_events (timestamp) VALUES ($1)",
                timestamp
            )
    
    return {"status": "imported", "rows_processed": csv_reader.line_num - 1}

# Helper functions for mapping
def map_event_type(google_forms_value: str) -> str:
    """Map Google Forms responses to your event types"""
    value = google_forms_value.lower().strip()
    if 'pee' in value or 'urinate' in value:
        return 'pee'
    elif 'poo' in value or 'defecate' in value or 'bowel' in value:
        return 'poo'
    elif 'cum' in value or 'ejaculate' in value:
        return 'cum'
    else:
        return value  # or default to 'pee'

def map_location(google_forms_value: str) -> str:
    """Map Google Forms locations to your location options"""
    value = google_forms_value.lower().strip()
    if 'home' in value:
        return 'home'
    elif 'work' in value:
        return 'work'
    else:
        return 'other'
