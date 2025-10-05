from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import asyncpg
import os

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
