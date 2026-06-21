import api from './client.js';

export const getWeaknessReport = () =>
  api.get('/api/ai/weakness-report').then(r => r.data);

export const getPracticePlan = (goal, weeks) =>
  api.post('/api/ai/practice-plan', { goal, weeks }).then(r => r.data);

export const getHint = (problemId, problemName, problemTags) =>
  api.post('/api/ai/hint', { problemId, problemName, problemTags }).then(r => r.data);