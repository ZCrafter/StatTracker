// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [activeScreen, setActiveScreen] = useState('events');
  const [showCum, setShowCum] = useState(false);
  const [events, setEvents] = useState([]);
  const [formData, setFormData] = useState({ eventType: 'pee', location: 'home', who: '' });

  const submitEvent = async () => {
    await fetch('http://localhost:5000/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, timestamp: new Date() })
    });
    setFormData({ ...formData, who: '' });
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
      </nav>

      {activeScreen === 'events' && (
        <EventScreen formData={formData} setFormData={setFormData} submitEvent={submitEvent} showCum={showCum} setShowCum={setShowCum} />
      )}
      
      {activeScreen === 'toothbrush' && <ToothbrushScreen />}
      {activeScreen === 'stats' && <StatsScreen showCum={showCum} setShowCum={setShowCum} />}
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
          <label key={loc}>
            <input type="radio" name="location" value={loc} checked={formData.location === loc} 
                   onChange={(e) => setFormData({...formData, location: e.target.value})} />
            {loc.charAt(0).toUpperCase() + loc.slice(1)}
          </label>
        ))}
      </div>

      <input type="text" placeholder="Who" value={formData.who} 
             onChange={(e) => setFormData({...formData, who: e.target.value})} />

      <button className="submit-btn" onClick={submitEvent}>Submit</button>
    </div>
  );
}
