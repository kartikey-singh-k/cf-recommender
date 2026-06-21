import api from './client.js';

export const getFriends = () =>
  api.get('/api/friends').then(r => r.data);

export const addFriend = (cf_handle) =>
  api.post('/api/friends', { cf_handle }).then(r => r.data);

export const removeFriend = (friendId) =>
  api.delete(`/api/friends/${friendId}`).then(r => r.data);

export const compareWithFriend = (friendId) =>
  api.get(`/api/friends/compare/${friendId}`).then(r => r.data);