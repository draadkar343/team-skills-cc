import api from './axiosInstance';
export const getPublicConfig = () => api.get('/admin/public-config').then(r => r.data);
export const getConfig = () => api.get('/admin/config').then(r => r.data);
export const updateConfig = (data) => api.patch('/admin/config', data).then(r => r.data);
export const uploadLogo = (file) => {
  const form = new FormData();
  form.append('logo', file);
  return api.post('/admin/logo', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
};
export const uploadLoginBg = (file) => {
  const form = new FormData();
  form.append('login_bg', file);
  return api.post('/admin/login-bg', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
};
export const removeLoginBg = () => api.delete('/admin/login-bg').then(r => r.data);
export const getStats = () => api.get('/admin/stats').then(r => r.data);
export const uploadResumeTemplate = (file) => {
  const form = new FormData();
  form.append('resume_template', file);
  return api.post('/admin/resume-template', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
};
export const deleteResumeTemplate = () => api.delete('/admin/resume-template').then(r => r.data);
export const generateResume = () => api.get('/admin/resume-template/generate', { responseType: 'blob' }).then(r => r.data);
export const generateBulkResumes = (payload) => api.post('/admin/resume-template/generate-bulk', payload, { responseType: 'blob' }).then(r => r.data);
export const listUsers = () => api.get('/users').then(r => r.data);
export const getUserDirectory = () => api.get('/users/directory').then(r => r.data);
export const createUser = (data) => api.post('/users', data).then(r => r.data);
export const updateUser = (id, data) => api.patch(`/users/${id}`, data).then(r => r.data);
export const deleteUser = (id) => api.delete(`/users/${id}`).then(r => r.data);
export const permanentlyDeleteUser = (id) => api.delete(`/users/${id}/permanent`).then(r => r.data);
export const resetUserPassword = (id, newPassword) => api.post(`/users/${id}/reset-password`, { newPassword }).then(r => r.data);
export const bulkImportUsers = (file) => {
  const form = new FormData();
  form.append('file', file);
  return api.post('/users/bulk-import', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
};
