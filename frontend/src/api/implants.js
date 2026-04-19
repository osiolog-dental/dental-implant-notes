import client from './client';

export const getImplantsByCase = (caseId) =>
  client.get(`/api/cases/${caseId}/implants`).then(r => r.data);

export const getImplantsByPatient = (patientId) =>
  client.get(`/api/patients/${patientId}/implants`).then(r => r.data);

export const getImplant = (id) =>
  client.get(`/api/implants/${id}`).then(r => r.data);

export const createImplant = (caseId, data) =>
  client.post(`/api/cases/${caseId}/implants`, data).then(r => r.data);

export const updateImplant = (id, data) =>
  client.patch(`/api/implants/${id}`, data).then(r => r.data);

export const deleteImplant = (id) =>
  client.delete(`/api/implants/${id}`).then(r => r.data);
