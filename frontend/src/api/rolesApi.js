import api from './axiosInstance';

export const listRoles           = () => api.get('/roles').then(r => r.data);
export const createRole          = (data) => api.post('/roles', data).then(r => r.data);
export const updateRole          = (name, data) => api.patch(`/roles/${name}`, data).then(r => r.data);
export const deleteRole          = (name) => api.delete(`/roles/${name}`).then(r => r.data);
export const saveRolePermissions = (name, permissions) => api.put(`/roles/${name}/permissions`, { permissions }).then(r => r.data);
export const getMyPermissions    = () => api.get('/auth/my-permissions').then(r => r.data);
