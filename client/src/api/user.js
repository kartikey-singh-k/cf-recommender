import api from './client.js';

export const linkHandle = (cf_handle) =>
  api.post('/api/user/handle', { cf_handle }).then(r => r.data);

export const getProfile = () =>
  api.get('/api/user/profile').then(r => r.data);

export const syncSubmissions = () =>
  api.post('/api/user/sync').then(r => r.data);