import api from './axiosInstance';

export const getWorkload = () => api.get('/timesheets/workload').then(r => r.data);
