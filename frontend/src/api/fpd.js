import client from './client';

export const getFpdByCase = (caseId) =>
  client.get(`/api/cases/${caseId}/fpd`).then(r => r.data);

export const getFpdByPatient = (patientId) =>
  client.get(`/api/patients/${patientId}/fpd`).then(r => r.data);

export const getFpd = (id) =>
  client.get(`/api/fpd/${id}`).then(r => r.data);

export const createFpd = (caseId, data) =>
  client.post(`/api/cases/${caseId}/fpd`, data).then(r => r.data);

export const updateFpd = (id, data) =>
  client.patch(`/api/fpd/${id}`, data).then(r => r.data);

export const deleteFpd = (id) =>
  client.delete(`/api/fpd/${id}`).then(r => r.data);
