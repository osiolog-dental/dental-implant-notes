import client from './client';

export const getDashboardSummary = () =>
  client.get('/api/dashboard/summary').then(r => r.data);

export const getAnalyticsOverview = () =>
  client.get('/api/analytics/overview').then(r => r.data);

export const getAnalyticsFinancial = () =>
  client.get('/api/analytics/financial').then(r => r.data);

export const getDueForSecondStage = () =>
  client.get('/api/implants/due-for-second-stage').then(r => r.data);

export const getAllImplants = () =>
  client.get('/api/implants/all').then(r => r.data);
