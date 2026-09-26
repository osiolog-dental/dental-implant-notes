import client from './client';

export const getDashboardSummary = () =>
  client.get('/api/dashboard/summary').then(r => r.data);

export const getAnalyticsOverview = () =>
  client.get('/api/analytics/overview').then(r => r.data);

export const getAnalyticsFinancial = () =>
  client.get('/api/analytics/financial').then(r => r.data);

// Real figures from logged cost lines + payments. period: 'month' | 'year' | 'all'
export const getFinanceSummary = (period) =>
  client.get('/api/analytics/finance-summary', { params: { period } }).then(r => r.data);

export const getDueForSecondStage = () =>
  client.get('/api/implants/due-for-second-stage').then(r => r.data);

export const getDueForImplant = () =>
  client.get('/api/tooth-extractions/due/for-implant').then(r => r.data);

export const getDueForFollowUp = () =>
  client.get('/api/implants/due-for-follow-up').then(r => r.data);

export const getAllImplants = () =>
  client.get('/api/implants/all').then(r => r.data);
