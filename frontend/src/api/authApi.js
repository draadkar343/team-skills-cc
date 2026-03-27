import api from './axiosInstance';
export const getMe = () => api.get('/auth/me').then(r => r.data);
export const updateProfile = (data) => api.patch('/auth/me/profile', data).then(r => r.data);
export const uploadAvatar = (formData) => api.patch('/auth/me/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
export const changePassword = (data) => api.patch('/auth/change-password', data).then(r => r.data);
export const getPublicHolidays = (year) => api.get(`/auth/me/public-holidays?year=${year}`).then(r => r.data);
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email }).then(r => r.data);
export const resetPassword = (token, newPassword) => api.post('/auth/reset-password', { token, newPassword }).then(r => r.data);
