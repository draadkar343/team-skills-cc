import api from './axiosInstance';
export const getResourcingOverview = () => api.get('/resourcing/overview').then(r => r.data);
