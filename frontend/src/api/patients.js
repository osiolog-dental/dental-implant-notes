import client from './client';

// The backend doesn't return a total count, only a page of results (capped at
// 200 per request). If a specific `page` is passed, fetch just that one page —
// otherwise fetch every page and return the combined list, since no caller in
// this app implements pagination UI; they all expect "the whole list".
export const getPatients = async ({ search, page, perPage = 200 } = {}) => {
  const fetchPage = (pageNum) => {
    const params = { page: pageNum, per_page: perPage };
    if (search) params.search = search;
    return client.get('/api/patients', { params }).then(r => r.data);
  };

  if (page) return fetchPage(page);

  let all = [];
  let currentPage = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const batch = await fetchPage(currentPage);
    all = all.concat(batch);
    if (batch.length < perPage) break;
    currentPage += 1;
  }
  return all;
};

export const getPatient = (id) =>
  client.get(`/api/patients/${id}`).then(r => r.data);

export const createPatient = (data) =>
  client.post('/api/patients', data).then(r => r.data);

export const updatePatient = (id, data) =>
  client.patch(`/api/patients/${id}`, data).then(r => r.data);

export const deletePatient = (id) =>
  client.delete(`/api/patients/${id}`).then(r => r.data);
