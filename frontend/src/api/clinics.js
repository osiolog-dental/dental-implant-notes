import client from './client';

export const getClinics = () =>
  client.get('/api/clinics').then(r => r.data);

export const createClinic = (data) =>
  client.post('/api/clinics', data).then(r => r.data);

export const updateClinic = (id, data) =>
  client.patch(`/api/clinics/${id}`, data).then(r => r.data);

export const deleteClinic = (id) =>
  client.delete(`/api/clinics/${id}`).then(r => r.data);
