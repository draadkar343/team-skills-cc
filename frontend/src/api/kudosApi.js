import api from './axiosInstance';
export const listKudos = () => api.get('/kudos').then(r => r.data);
export const getMyKudos = () => api.get('/kudos/mine').then(r => r.data);
export const getUserKudos = (id) => api.get(`/kudos/user/${id}`).then(r => r.data);
export const sendKudos = (data) => api.post('/kudos', data).then(r => r.data);
export const deleteKudos = (id) => api.delete(`/kudos/${id}`).then(r => r.data);
