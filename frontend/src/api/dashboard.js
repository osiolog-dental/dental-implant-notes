import client from './client';

export const getDashboardSummary = () =>
  client.get('/api/dashboard/summary').then(r => r.data);
