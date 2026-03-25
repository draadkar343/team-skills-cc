import api from './axiosInstance';
export const getMySquad = () => api.get('/squads/my-squad').then(r => r.data); // returns array
export const getMySquadInfo = () => api.get('/squads/my-squad-info').then(r => r.data); // employee: their squad
export const listSquads = () => api.get('/squads').then(r => r.data);
export const listManagers = () => api.get('/squads/managers').then(r => r.data);
export const createSquad = (data) => api.post('/squads', data).then(r => r.data);
export const getSquad = (id) => api.get(`/squads/${id}`).then(r => r.data);
export const updateSquad = (id, data) => api.patch(`/squads/${id}`, data).then(r => r.data);
export const deleteSquad = (id) => api.delete(`/squads/${id}`).then(r => r.data);
export const addMember = (squadId, userId) => api.post(`/squads/${squadId}/members`, { userId }).then(r => r.data);
export const removeMember = (squadId, userId) => api.delete(`/squads/${squadId}/members/${userId}`).then(r => r.data);
export const getUnassigned = () => api.get('/squads/unassigned').then(r => r.data);
