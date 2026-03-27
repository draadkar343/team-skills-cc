import api from './axiosInstance';

export const getNotifications = () => api.get('/notifications').then(r => r.data);
export const markRead = (id) => api.post(`/notifications/${id}/read`).then(r => r.data);
export const markAllRead = () => api.post('/notifications/read-all').then(r => r.data);
