import api from './client.js';

export const getTodaysQueue = () =>
  api.get('/api/queue/today').then(r => r.data);

export const regenerateQueue = () =>
  api.post('/api/queue/regenerate').then(r => r.data);

export const markSolved = (problemId) =>
  api.post('/api/queue/solved', { problemId }).then(r => r.data);