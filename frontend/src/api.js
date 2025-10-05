// frontend/src/api.js
const API_BASE = ''
  ? 'http://localhost:5000' 
  : '/api'; // Use relative path when served from same domain

export const api = {
  async request(endpoint, options = {}) {
    try {
      const url = `${API_BASE}${endpoint}`;
      console.log(`API Call: ${url}`, options);
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error for ${endpoint}:`, error);
      throw error;
    }
  },

  // Event endpoints
  submitEvent(eventData) {
    return this.request('/api/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  },

  submitToothbrush(toothbrushData) {
    return this.request('/api/toothbrush', {
      method: 'POST',
      body: JSON.stringify(toothbrushData),
    });
  },

  getData() {
    return this.request('/api/data');
  },

  deleteEvent(eventId) {
    return this.request(`/api/events/${eventId}`, {
      method: 'DELETE',
    });
  },

  testDb() {
    return this.request('/test-db');
  }
};
