import api from './axiosInstance';
export const getConfig = () => api.get('/admin/config').then(r => r.data);
export const updateConfig = (data) => api.patch('/admin/config', data).then(r => r.data);
export const uploadLogo = (file) => {
  const form = new FormData();
  form.append('logo', file);
  return api.post('/admin/logo', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
};
export const getStats = () => api.get('/admin/stats').then(r => r.data);
export const listUsers = () => api.get('/users').then(r => r.data);
export const createUser = (data) => api.post('/users', data).then(r => r.data);
export const updateUser = (id, data) => api.patch(`/users/${id}`, data).then(r => r.data);
export const deleteUser = (id) => api.delete(`/users/${id}`).then(r => r.data);
export const resetUserPassword = (id, newPassword) => api.post(`/users/${id}/reset-password`, { newPassword }).then(r => r.data);
