import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [activeScreen, setActiveScreen] = useState('events');
  const [showCum, setShowCum] = useState(false);
  const [events, setEvents] = useState([]);
  const [toothbrushEvents, setToothbrushEvents] = useState([]);
  const [formData, setFormData] = useState({ eventType: 'pee', location: 'home', who: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/data');
      const data = await response.json();
      setEvents(data.events);
      setToothbrushEvents(data.toothbrush);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const submitEvent = async () => {
    try {
      await fetch('http://localhost:5000/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, timestamp: new Date() })
      });
      setFormData({ ...formData, who: '' });
      fetchData();
    } catch (error) {
      console.error('Failed to submit event:', error);
    }
  };

  const submitToothbrush = async () => {
    try {
      await fetch('http://localhost:5000/api/toothbrush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp: new Date() })
      });
      fetchData();
    } catch (error) {
      console.error('Failed to submit toothbrush:', error);
    }
  };

  const deleteEvent = async (id) => {
    try {
      await fetch(`http://localhost:5000/api/events/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  return (
    <div className="app">
      <nav className="nav">
        <button onClick={() => setActiveScreen('events')} className={activeScreen === 'events' ? 'active' : ''}>
          Events
        </button>
        <button onClick={() => setActiveScreen('toothbrush')} className={activeScreen === 'toothbrush' ? 'active' : ''}>
          Toothbrush
        </button>
        <button onClick={() => setActiveScreen('stats')} className={activeScreen === 'stats' ? 'active' : ''}>
          Stats
        </button>
        <button onClick={() => setActiveScreen('admin')} className={activeScreen === 'admin' ? 'active' : ''}>
          Admin
        </button>
        <button onClick={() => setActiveScreen('import')} className={activeScreen === 'import' ? 'active' : ''}>
          Import
        </button>
      </nav>

      {activeScreen === 'events' && (
        <EventScreen formData={formData} setFormData={setFormData} submitEvent={submitEvent} showCum={showCum} setShowCum={setShowCum} />
      )}
      
      {activeScreen === 'toothbrush' && <ToothbrushScreen submitToothbrush={submitToothbrush} />}
      {activeScreen === 'stats' && <StatsScreen events={events} toothbrushEvents={toothbrushEvents} showCum={showCum} setShowCum={setShowCum} />}
      {activeScreen === 'admin' && <AdminScreen events={events} deleteEvent={deleteEvent} />}
      {activeScreen === 'import' && <ImportScreen />}
    </div>
  );
}

function EventScreen({ formData, setFormData, submitEvent, showCum, setShowCum }) {
  return (
    <div className="screen">
      <div className="event-buttons">
        <button 
          className={`event-btn ${formData.eventType === 'pee' ? 'active pee' : ''}`}
          onClick={() => setFormData({...formData, eventType: 'pee'})}
        >
          💦 Pee
        </button>
        <button 
          className={`event-btn ${formData.eventType === 'poo' ? 'active poo' : ''}`}
          onClick={() => setFormData({...formData, eventType: 'poo'})}
        >
          💩 Poo
        </button>
        <button 
          className={`event-btn cum-btn ${showCum ? 'visible' : ''} ${formData.eventType === 'cum' ? 'active cum' : ''}`}
          onClick={() => {
            setShowCum(true);
            setFormData({...formData, eventType: 'cum'});
          }}
        >
          🌶️ Cum
        </button>
      </div>

      <div className="location-radios">
        {['home', 'work', 'other'].map(loc => (
          <label key={loc} className="radio-label">
            <input type="radio" name="location" value={loc} checked={formData.location === loc} 
                   onChange={(e) => setFormData({...formData, location: e.target.value})} />
            {loc.charAt(0).toUpperCase() + loc.slice(1)}
          </label>
        ))}
      </div>

      <input type="text" placeholder="Who" value={formData.who} className="who-input"
             onChange={(e) => setFormData({...formData, who: e.target.value})} />

      <button className="submit-btn" onClick={submitEvent}>Submit Event</button>
    </div>
  );
}

function ToothbrushScreen({ submitToothbrush }) {
  return (
    <div className="screen">
      <button className="submit-btn toothbrush-btn" onClick={submitToothbrush}>
        🪥 Brush Teeth
      </button>
    </div>
  );
}

function StatsScreen({ events, toothbrushEvents, showCum, setShowCum }) {
  const today = new Date().toDateString();
  const todayEvents = events.filter(e => new Date(e.timestamp).toDateString() === today);
  
  return (
    <div className="screen">
      <button 
        className={`cum-toggle ${showCum ? 'visible' : ''}`}
        onClick={() => setShowCum(!showCum)}
      >
        {showCum ? '🌶️' : '❓'}
      </button>
      
      <div className="stats">
        <h3>Today's Stats</h3>
        <div className="stat-grid">
          <div className="stat-card">
            <span className="stat-number">{todayEvents.filter(e => e.event_type === 'pee').length}</span>
            <span className="stat-label">Pee</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{todayEvents.filter(e => e.event_type === 'poo').length}</span>
            <span className="stat-label">Poo</span>
          </div>
          {showCum && (
            <div className="stat-card">
              <span className="stat-number">{todayEvents.filter(e => e.event_type === 'cum').length}</span>
              <span className="stat-label">Cum</span>
            </div>
          )}
          <div className="stat-card">
            <span className="stat-number">{toothbrushEvents.filter(e => new Date(e.timestamp).toDateString() === today).length}</span>
            <span className="stat-label">Brushing</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminScreen({ events, deleteEvent }) {
  return (
    <div className="screen admin-screen">
      <h3>Event History</h3>
      <div className="event-list">
        {events.map(event => (
          <div key={event.id} className="event-item">
            <span className="event-type">{event.event_type}</span>
            <span className="event-location">{event.location}</span>
            <span className="event-who">{event.who || '-'}</span>
            <span className="event-time">{new Date(event.timestamp).toLocaleString()}</span>
            <button className="delete-btn" onClick={() => deleteEvent(event.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImportScreen() {
  const [importStatus, setImportStatus] = useState('');

  const handleFileUpload = async (event, importType) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`http://localhost:5000/api/import/${importType}`, {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      setImportStatus(`Successfully imported ${result.rows_processed} rows`);
      
      // Clear file input
      event.target.value = '';
    } catch (error) {
      setImportStatus('Import failed: ' + error.message);
    }
  };

  return (
    <div className="screen">
      <h3>Import Google Forms Data</h3>
      
      <div className="import-section">
        <h4>Import Events</h4>
        <p>Upload CSV from Google Forms (Events)</p>
        <input 
          type="file" 
          accept=".csv"
          onChange={(e) => handleFileUpload(e, 'events')}
          className="file-input"
        />
      </div>

      <div className="import-section">
        <h4>Import Toothbrush Data</h4>
        <p>Upload CSV from Google Forms (Toothbrush)</p>
        <input 
          type="file" 
          accept=".csv"
          onChange={(e) => handleFileUpload(e, 'toothbrush')}
          className="file-input"
        />
      </div>

      {importStatus && (
        <div className="import-status">
          {importStatus}
        </div>
      )}

      <div className="import-help">
        <h5>CSV Format Expected:</h5>
        <p><strong>Events:</strong> Timestamp, Event Type, Location, Who</p>
        <p><strong>Toothbrush:</strong> Timestamp</p>
        <p>First row should be headers. Timestamp format: 2023-12-01 14:30:00</p>
      </div>
    </div>
  );
}

export default App;
