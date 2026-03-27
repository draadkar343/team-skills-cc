import api from './axiosInstance';
export const getResourcingStats = () => api.get('/resourcing/stats').then(r => r.data);
export const getResourcingOverview = () => api.get('/resourcing/overview').then(r => r.data);
