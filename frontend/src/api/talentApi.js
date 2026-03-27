import api from './axiosInstance';

export const listCandidates = () => api.get('/talent').then(r => r.data);
export const getCandidate = (id) => api.get(`/talent/${id}`).then(r => r.data);
export const createCandidate = (data) => api.post('/talent', data).then(r => r.data);
export const updateCandidate = (id, data) => api.patch(`/talent/${id}`, data).then(r => r.data);
export const changeStage = (id, stage, note) => api.post(`/talent/${id}/stage`, { stage, note }).then(r => r.data);
export const uploadCV = (id, file) => {
  const formData = new FormData();
  formData.append('cv', file);
  return api.post(`/talent/${id}/cv`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
};
export const deleteCV = (id) => api.delete(`/talent/${id}/cv`).then(r => r.data);
export const deleteCandidate = (id) => api.delete(`/talent/${id}`).then(r => r.data);
