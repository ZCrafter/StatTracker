import React, { useState, useEffect } from 'react';
import { api } from './api';
import './App.css';

function App() {
  const [activeScreen, setActiveScreen] = useState('events');
  const [showCum, setShowCum] = useState(false);
  const [events, setEvents] = useState([]);
  const [toothbrushEvents, setToothbrushEvents] = useState([]);
  const [stats, setStats] = useState({});
  const [lastSubmitted, setLastSubmitted] = useState(null);
  const [submitMessage, setSubmitMessage] = useState('');
  const [formData, setFormData] = useState({ 
    eventType: 'pee', 
    location: 'home',
    timestamp: new Date().toISOString().slice(0, 16)
  });
  const [toothbrushData, setToothbrushData] = useState({
    timestamp: new Date().toISOString().slice(0, 16),
    usedIrrigator: false
  });

  useEffect(() => {
    fetchData();
    fetchStats();
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      const result = await api.testDb();
      console.log('✅ Backend connection test:', result);
    } catch (error) {
      console.error('❌ Backend connection failed:', error);
      setSubmitMessage('Backend connection failed: ' + error.message);
      setTimeout(() => setSubmitMessage(''), 5000);
    }
  };

  const fetchData = async () => {
    try {
      const data = await api.getData();
      setEvents(data.events);
      setToothbrushEvents(data.toothbrush);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await api.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const submitEvent = async () => {
    try {
      await api.submitEvent({
        ...formData,
        timestamp: new Date(formData.timestamp)
      });
      
      setSubmitMessage('✅ Event submitted successfully!');
      setLastSubmitted({
        type: formData.eventType,
        time: new Date().toLocaleTimeString()
      });
      setFormData({
        ...formData,
        timestamp: new Date().toISOString().slice(0, 16)
      });
      fetchData();
      fetchStats();
      
      setTimeout(() => setSubmitMessage(''), 3000);
    } catch (error) {
      setSubmitMessage('❌ Failed to submit event: ' + error.message);
      console.error('Failed to submit event:', error);
    }
  };

  const submitToothbrush = async () => {
    try {
      await api.submitToothbrush({
        timestamp: new Date(toothbrushData.timestamp),
        used_irrigator: toothbrushData.usedIrrigator
      });
      
      setSubmitMessage('✅ Toothbrush recorded successfully!');
      setToothbrushData({
        timestamp: new Date().toISOString().slice(0, 16),
        usedIrrigator: false
      });
      fetchData();
      fetchStats();
      
      setTimeout(() => setSubmitMessage(''), 3000);
    } catch (error) {
      setSubmitMessage('❌ Failed to submit toothbrush: ' + error.message);
      console.error('Failed to submit toothbrush:', error);
    }
  };

  const deleteEvent = async (id) => {
    try {
      await api.deleteEvent(id);
      fetchData();
      fetchStats();
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  const getBackgroundColor = () => {
    if (activeScreen === 'events') {
      switch (formData.eventType) {
        case 'pee': return 'var(--bg-pee)';
        case 'poo': return 'var(--bg-poo)';
        case 'cum': return 'var(--bg-cum)';
        default: return 'var(--bg-default)';
      }
    }
    return 'var(--bg-default)';
  };

  return (
    <div className="app" style={{ backgroundColor: getBackgroundColor() }}>
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
        <div className={`submit-message ${submitMessage.includes('❌') ? 'error' : 'success'}`}>
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
          stats={stats}
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
  const handleCumClick = () => {
    const newShowCum = !showCum;
    setShowCum(newShowCum);
    if (newShowCum) {
      setFormData({...formData, eventType: 'cum'});
    }
  };

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
          onClick={handleCumClick}
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

function StatsScreen({ events, toothbrushEvents, showCum, setShowCum, stats }) {
  const today = new Date().toDateString();
  const todayEvents = events.filter(e => new Date(e.timestamp).toDateString() === today);
  
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

  const formatDate = (dateString) => {
    if (!dateString) return 'Submit an event to start tracking!';
    const date = new Date(dateString);
    return `Tracking since: ${date.toLocaleDateString()}`;
  };

  return (
    <div className="screen">
      <div className="stats-header">
        <h3>Today's Stats</h3>
        <button 
          className={`cum-toggle-stats ${showCum ? 'visible' : ''}`}
          onClick={() => setShowCum(!showCum)}
          title={showCum ? 'Hide Cum Stats' : 'Show Cum Stats'}
        >
          {showCum ? '🌶️' : '🌶️'}
        </button>
      </div>
      
      <div className="tracking-since">
        {formatDate(stats.first_event_date)}
      </div>
      
      <div className="stats">
        <div className="stat-grid">
          <div className="stat-card">
            <span className="stat-number">{todayEvents.filter(e => e.event_type === 'pee').length}</span>
            <span className="stat-label">Pee Today</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{todayEvents.filter(e => e.event_type === 'poo').length}</span>
            <span className="stat-label">Poo Today</span>
          </div>
          {showCum && (
            <div className="stat-card">
              <span className="stat-number">{todayEvents.filter(e => e.event_type === 'cum').length}</span>
              <span className="stat-label">Cum Today</span>
            </div>
          )}
          <div className="stat-card">
            <span className="stat-number">
              {toothbrushEvents.filter(e => new Date(e.timestamp).toDateString() === today).length}
            </span>
            <span className="stat-label">Brushing Today</span>
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

        <h3>All Time Averages</h3>
        <div className="stat-grid">
          <div className="stat-card">
            <span className="stat-number">{stats.all_time_averages?.pee || 0}</span>
            <span className="stat-label">Pee/Day</span>
            <span className="stat-average">{stats.total_days || 1} days tracked</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{stats.all_time_averages?.poo || 0}</span>
            <span className="stat-label">Poo/Day</span>
            <span className="stat-average">{stats.total_days || 1} days tracked</span>
          </div>
          {showCum && (
            <div className="stat-card">
              <span className="stat-number">{stats.all_time_averages?.cum || 0}</span>
              <span className="stat-label">Cum/Day</span>
              <span className="stat-average">{stats.total_days || 1} days tracked</span>
            </div>
          )}
          <div className="stat-card">
            <span className="stat-number">{stats.all_time_averages?.toothbrush || 0}</span>
            <span className="stat-label">Brushing/Day</span>
            <span className="stat-average">{stats.total_days || 1} days tracked</span>
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
      const response = await fetch(`/api/import/${importType}`, {
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
