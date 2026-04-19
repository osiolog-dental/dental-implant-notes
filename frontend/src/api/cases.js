import client from './client';

export const getCases = ({ patientId, search, page = 1, perPage = 50 } = {}) => {
  const params = { page, per_page: perPage };
  if (patientId) params.patient_id = patientId;
  if (search) params.search = search;
  return client.get('/api/cases', { params }).then(r => r.data);
};

export const getCase = (id) =>
  client.get(`/api/cases/${id}`).then(r => r.data);

export const createCase = (data) =>
  client.post('/api/cases', data).then(r => r.data);

export const updateCase = (id, data) =>
  client.patch(`/api/cases/${id}`, data).then(r => r.data);

export const deleteCase = (id) =>
  client.delete(`/api/cases/${id}`).then(r => r.data);
