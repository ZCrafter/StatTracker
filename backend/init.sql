-- backend/init.sql
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(10) NOT NULL,
    location VARCHAR(20) NOT NULL,
    who VARCHAR(100),
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE TABLE toothbrush_events (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW()
);
