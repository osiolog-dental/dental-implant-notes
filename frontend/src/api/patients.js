import client from './client';

export const getPatients = ({ search, page = 1, perPage = 50 } = {}) => {
  const params = { page, per_page: perPage };
  if (search) params.search = search;
  return client.get('/api/patients', { params }).then(r => r.data);
};

export const getPatient = (id) =>
  client.get(`/api/patients/${id}`).then(r => r.data);

export const createPatient = (data) =>
  client.post('/api/patients', data).then(r => r.data);

export const updatePatient = (id, data) =>
  client.patch(`/api/patients/${id}`, data).then(r => r.data);

export const deletePatient = (id) =>
  client.delete(`/api/patients/${id}`).then(r => r.data);
