import api from './client.js';

export const getOverview = () =>
  api.get('/api/analytics/overview').then(r => r.data);

export const getTagStats = () =>
  api.get('/api/analytics/tags').then(r => r.data);

export const getComfortZone = () =>
  api.get('/api/analytics/comfort-zone').then(r => r.data);

export const getStreak = () =>
  api.get('/api/analytics/streak').then(r => r.data);