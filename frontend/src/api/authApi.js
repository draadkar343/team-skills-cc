import api from './axiosInstance';
export const getMe = () => api.get('/auth/me').then(r => r.data);
export const updateProfile = (data) => api.patch('/auth/me/profile', data).then(r => r.data);
export const changePassword = (data) => api.patch('/auth/change-password', data).then(r => r.data);
