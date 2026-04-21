import axios from 'axios';
const API_BASE = process.env.REACT_APP_API_URL || '/api';
const api = axios.create({ baseURL: API_BASE, timeout: 120000, headers: { 'Content-Type': 'application/json' } });
api.interceptors.response.use(r => r.data, err => { const msg = err.response?.data?.error || err.message || 'Error'; return Promise.reject(new Error(msg)); });
export const chatAPI = {
  newSession: () => api.post('/chat/new'),
  sendMessage: (message, sessionId) => api.post('/chat', { message, sessionId }),
  getHistory: (sessionId) => api.get(`/chat/${sessionId}/history`),
  clearSession: (sessionId) => api.delete(`/chat/${sessionId}`),
};
export const queryAPI = {
  run: (query, context) => api.post('/query', { query, context }),
  understand: (q) => api.get('/query/understand', { params: { q } }),
};
export const trialsAPI = {
  search: (q, location, limit = 5) => api.get('/trials', { params: { q, location, limit } }),
};
export default api;
