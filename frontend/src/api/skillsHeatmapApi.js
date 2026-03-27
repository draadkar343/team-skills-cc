import api from './axiosInstance';

export const getSkillsHeatmap = () => api.get('/skills/heatmap').then(r => r.data);
