import api from './axiosInstance';

// Job Roles
export const getJobRoles = () => api.get('/job-roles').then(r => r.data);
export const createJobRole = (data) => api.post('/job-roles', data).then(r => r.data);
export const updateJobRole = (id, data) => api.patch(`/job-roles/${id}`, data).then(r => r.data);
export const deleteJobRole = (id) => api.delete(`/job-roles/${id}`).then(r => r.data);

// Main Skills
export const getMainSkills = (jobRoleId) =>
  api.get('/job-roles/main-skills', { params: jobRoleId ? { jobRoleId } : undefined }).then(r => r.data);
export const createMainSkill = (data) => api.post('/job-roles/main-skills', data).then(r => r.data);
export const updateMainSkill = (id, data) => api.patch(`/job-roles/main-skills/${id}`, data).then(r => r.data);
export const deleteMainSkill = (id) => api.delete(`/job-roles/main-skills/${id}`).then(r => r.data);
