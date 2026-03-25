import api from './axiosInstance';

const toFormData = (data, file) => {
  const fd = new FormData();
  Object.entries(data).forEach(([k, v]) => { if (v !== null && v !== undefined && v !== '') fd.append(k, v); });
  if (file) fd.append('certificate', file);
  return fd;
};

export const getMyCerts = () => api.get('/certs/mine').then(r => r.data);
export const addCert = (data, file) => api.post('/certs/mine', toFormData(data, file)).then(r => r.data);
export const updateCert = (id, data, file) => api.patch(`/certs/mine/${id}`, toFormData(data, file)).then(r => r.data);
export const deleteCert = (id) => api.delete(`/certs/mine/${id}`).then(r => r.data);
export const submitCert = (id) => api.post(`/certs/mine/${id}/submit`).then(r => r.data);
export const getPendingCerts = () => api.get('/certs/pending').then(r => r.data);
export const approveCert = (id) => api.post(`/certs/${id}/approve`).then(r => r.data);
export const rejectCert = (id, reason) => api.post(`/certs/${id}/reject`, { reason }).then(r => r.data);
export const getAllCerts = () => api.get('/certs/all').then(r => r.data);
