import api from './axiosInstance';

// Clients
export const listClients = () => api.get('/clients').then(r => r.data);
export const createClient = (data) => api.post('/clients', data).then(r => r.data);
export const updateClient = (id, data) => api.patch(`/clients/${id}`, data).then(r => r.data);
export const deleteClient = (id) => api.delete(`/clients/${id}`).then(r => r.data);

// Allocations
export const getClientAllocations = (clientId) => api.get(`/clients/${clientId}/allocations`).then(r => r.data);
export const addAllocation = (clientId, data) => api.post(`/clients/${clientId}/allocations`, data).then(r => r.data);
export const updateAllocation = (id, data) => api.patch(`/clients/allocations/${id}`, data).then(r => r.data);
export const deleteAllocation = (id) => api.delete(`/clients/allocations/${id}`).then(r => r.data);

// Squad overview
export const getSquadOverview = () => api.get('/clients/squad-overview').then(r => r.data);

// Systems
export const getClientSystems  = (clientId) => api.get(`/clients/${clientId}/systems`).then(r => r.data);
export const addClientSystem    = (clientId, data) => api.post(`/clients/${clientId}/systems`, data).then(r => r.data);
export const updateClientSystem = (id, data) => api.patch(`/clients/systems/${id}`, data).then(r => r.data);
export const deleteClientSystem = (id) => api.delete(`/clients/systems/${id}`).then(r => r.data);
