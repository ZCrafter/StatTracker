import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [activeScreen, setActiveScreen] = useState('events');
  const [showCum, setShowCum] = useState(false);
  const [events, setEvents] = useState([]);
  const [toothbrushEvents, setToothbrushEvents] = useState([]);
  const [lastSubmitted, setLastSubmitted] = useState(null);
  const [submitMessage, setSubmitMessage] = useState('');
  const [formData, setFormData] = useState({ 
    eventType: 'pee', 
    location: 'home',
    timestamp: new Date().toISOString().slice(0, 16) // Current date/time
  });
  const [toothbrushData, setToothbrushData] = useState({
    timestamp: new Date().toISOString().slice(0, 16),
    usedIrrigator: false
  });

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
      const response = await fetch('http://localhost:5000/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...formData, 
          timestamp: new Date(formData.timestamp) 
        })
      });
      
      if (response.ok) {
        setSubmitMessage('Event submitted successfully!');
        setLastSubmitted({
          type: formData.eventType,
          time: new Date().toLocaleTimeString()
        });
        // Reset form but keep current selections
        setFormData({
          ...formData,
          timestamp: new Date().toISOString().slice(0, 16)
        });
        fetchData();
        
        // Clear message after 3 seconds
        setTimeout(() => setSubmitMessage(''), 3000);
      }
    } catch (error) {
      setSubmitMessage('Failed to submit event');
      console.error('Failed to submit event:', error);
    }
  };

  const submitToothbrush = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/toothbrush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          timestamp: new Date(toothbrushData.timestamp),
          used_irrigator: toothbrushData.usedIrrigator 
        })
      });
      
      if (response.ok) {
        setSubmitMessage('Toothbrush recorded successfully!');
        setToothbrushData({
          timestamp: new Date().toISOString().slice(0, 16),
          usedIrrigator: false
        });
        fetchData();
        
        setTimeout(() => setSubmitMessage(''), 3000);
      }
    } catch (error) {
      setSubmitMessage('Failed to submit toothbrush');
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
      </nav>

      {submitMessage && (
        <div className="submit-message">
          {submitMessage}
        </div>
      )}

      {activeScreen === 'events' && (
        <EventScreen 
          formData={formData} 
          setFormData={setFormData} 
          submitEvent={submitEvent} 
          showCum={showCum}
          setShowCum={setShowCum}
          lastSubmitted={lastSubmitted}
        />
      )}
      
      {activeScreen === 'toothbrush' && (
        <ToothbrushScreen 
          toothbrushData={toothbrushData}
          setToothbrushData={setToothbrushData}
          submitToothbrush={submitToothbrush} 
        />
      )}
      {activeScreen === 'stats' && (
        <StatsScreen 
          events={events} 
          toothbrushEvents={toothbrushEvents} 
          showCum={showCum} 
          setShowCum={setShowCum} 
        />
      )}
      {activeScreen === 'admin' && (
        <AdminScreen 
          events={events} 
          deleteEvent={deleteEvent} 
        />
      )}
    </div>
  );
}

function EventScreen({ formData, setFormData, submitEvent, showCum, setShowCum, lastSubmitted }) {
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
          className={`event-btn cum-toggle-btn ${showCum ? 'visible' : ''} ${formData.eventType === 'cum' ? 'active cum' : ''}`}
          onClick={() => {
            const newShowCum = !showCum;
            setShowCum(newShowCum);
            if (newShowCum) {
              setFormData({...formData, eventType: 'cum'});
            }
          }}
        >
          🌶️ Cum
        </button>
      </div>

      <div className="datetime-input">
        <label>Date & Time:</label>
        <input 
          type="datetime-local" 
          value={formData.timestamp}
          onChange={(e) => setFormData({...formData, timestamp: e.target.value})}
        />
      </div>

      <div className="location-radios">
        {['home', 'work', 'other'].map(loc => (
          <label key={loc} className="radio-label">
            <input 
              type="radio" 
              name="location" 
              value={loc} 
              checked={formData.location === loc} 
              onChange={(e) => setFormData({...formData, location: e.target.value})} 
            />
            {loc.charAt(0).toUpperCase() + loc.slice(1)}
          </label>
        ))}
      </div>

      {lastSubmitted && (
        <div className="last-submitted">
          Last event: {lastSubmitted.type} at {lastSubmitted.time}
        </div>
      )}

      <button className="submit-btn" onClick={submitEvent}>
        Submit Event
      </button>
    </div>
  );
}

function ToothbrushScreen({ toothbrushData, setToothbrushData, submitToothbrush }) {
  return (
    <div className="screen">
      <div className="datetime-input">
        <label>Date & Time:</label>
        <input 
          type="datetime-local" 
          value={toothbrushData.timestamp}
          onChange={(e) => setToothbrushData({...toothbrushData, timestamp: e.target.value})}
        />
      </div>

      <div className="irrigator-toggle">
        <label className="toggle-label">
          <input 
            type="checkbox" 
            checked={toothbrushData.usedIrrigator}
            onChange={(e) => setToothbrushData({...toothbrushData, usedIrrigator: e.target.checked})}
          />
          Used Oral Irrigator
        </label>
      </div>

      <button className="submit-btn toothbrush-btn" onClick={submitToothbrush}>
        🪥 Record Brushing
      </button>
    </div>
  );
}

function StatsScreen({ events, toothbrushEvents, showCum, setShowCum }) {
  // Calculate stats
  const today = new Date().toDateString();
  const todayEvents = events.filter(e => new Date(e.timestamp).toDateString() === today);
  
  // Weekly stats (last 7 days)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weeklyEvents = events.filter(e => new Date(e.timestamp) >= oneWeekAgo);
  
  const weeklyStats = {
    pee: weeklyEvents.filter(e => e.event_type === 'pee').length,
    poo: weeklyEvents.filter(e => e.event_type === 'poo').length,
    cum: weeklyEvents.filter(e => e.event_type === 'cum').length,
    toothbrush: toothbrushEvents.filter(e => new Date(e.timestamp) >= oneWeekAgo).length
  };

  const dailyAverages = {
    pee: (weeklyStats.pee / 7).toFixed(1),
    poo: (weeklyStats.poo / 7).toFixed(1),
    cum: (weeklyStats.cum / 7).toFixed(1),
    toothbrush: (weeklyStats.toothbrush / 7).toFixed(1)
  };

  return (
    <div className="screen">
      <button 
        className={`cum-toggle-stats ${showCum ? 'visible' : ''}`}
        onClick={() => setShowCum(!showCum)}
        title={showCum ? 'Hide Cum Stats' : 'Show Cum Stats'}
      >
        {showCum ? '🌶️' : '🌶️'}
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
            <span className="stat-number">
              {toothbrushEvents.filter(e => new Date(e.timestamp).toDateString() === today).length}
            </span>
            <span className="stat-label">Brushing</span>
          </div>
        </div>

        <h3>Weekly Stats (Last 7 Days)</h3>
        <div className="stat-grid">
          <div className="stat-card">
            <span className="stat-number">{weeklyStats.pee}</span>
            <span className="stat-label">Pee Total</span>
            <span className="stat-average">Avg: {dailyAverages.pee}/day</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{weeklyStats.poo}</span>
            <span className="stat-label">Poo Total</span>
            <span className="stat-average">Avg: {dailyAverages.poo}/day</span>
          </div>
          {showCum && (
            <div className="stat-card">
              <span className="stat-number">{weeklyStats.cum}</span>
              <span className="stat-label">Cum Total</span>
              <span className="stat-average">Avg: {dailyAverages.cum}/day</span>
            </div>
          )}
          <div className="stat-card">
            <span className="stat-number">{weeklyStats.toothbrush}</span>
            <span className="stat-label">Brushing Total</span>
            <span className="stat-average">Avg: {dailyAverages.toothbrush}/day</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminScreen({ events, deleteEvent }) {
  const [showImport, setShowImport] = useState(false);
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
    <div className="screen admin-screen">
      <div className="admin-header">
        <h3>Event History</h3>
        <button 
          className="import-toggle-btn"
          onClick={() => setShowImport(!showImport)}
        >
          {showImport ? 'Hide Import' : 'Show Import'}
        </button>
      </div>

      {showImport && (
        <div className="import-section">
          <h4>Import Google Forms Data</h4>
          <div className="import-buttons">
            <div>
              <p>Import Events CSV</p>
              <input 
                type="file" 
                accept=".csv"
                onChange={(e) => handleFileUpload(e, 'events')}
                className="file-input"
              />
            </div>
            <div>
              <p>Import Toothbrush CSV</p>
              <input 
                type="file" 
                accept=".csv"
                onChange={(e) => handleFileUpload(e, 'toothbrush')}
                className="file-input"
              />
            </div>
          </div>
          {importStatus && (
            <div className="import-status">
              {importStatus}
            </div>
          )}
        </div>
      )}

      <div className="event-list">
        {events.map(event => (
          <div key={event.id} className="event-item">
            <span className="event-type">{event.event_type}</span>
            <span className="event-location">{event.location}</span>
            <span className="event-time">{new Date(event.timestamp).toLocaleString()}</span>
            <button className="delete-btn" onClick={() => deleteEvent(event.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
