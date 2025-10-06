// frontend/src/api.js

// Use relative URLs - the proxy in package.json will handle routing to backend
const API_BASE = '';

export const api = {
  async request(endpoint, options = {}) {
    try {
      const url = `${API_BASE}${endpoint}`;
      console.log(`🔄 API Call: ${url}`, options);
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API Error: ${response.status} - ${errorText}`);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log(`✅ API Success: ${endpoint}`, data);
      return data;
    } catch (error) {
      console.error(`💥 API Error for ${endpoint}:`, error);
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

  getStats() {
    return this.request('/api/stats');
  },

  testDb() {
    return this.request('/test-db');
  }
};
