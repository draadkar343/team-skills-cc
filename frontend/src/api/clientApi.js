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

// Roadmap
export const getClientRoadmap   = (clientId) => api.get(`/clients/${clientId}/roadmap`).then(r => r.data);
export const addRoadmapItem     = (clientId, data) => api.post(`/clients/${clientId}/roadmap`, data).then(r => r.data);
export const updateRoadmapItem  = (id, data) => api.patch(`/clients/roadmap/${id}`, data).then(r => r.data);
export const deleteRoadmapItem  = (id) => api.delete(`/clients/roadmap/${id}`).then(r => r.data);

// Contracts
export const getClientContracts = (clientId) => api.get(`/clients/${clientId}/contracts`).then(r => r.data);
export const addContract        = (clientId, data) => api.post(`/clients/${clientId}/contracts`, data).then(r => r.data);
export const updateContract     = (id, data) => api.patch(`/clients/contracts/${id}`, data).then(r => r.data);
export const deleteContract     = (id) => api.delete(`/clients/contracts/${id}`).then(r => r.data);

// Change Requests
export const getChangeRequests    = (clientId) => api.get(`/clients/${clientId}/change-requests`).then(r => r.data);
export const addChangeRequest     = (clientId, data) => api.post(`/clients/${clientId}/change-requests`, data).then(r => r.data);
export const updateChangeRequest  = (id, data) => api.patch(`/clients/change-requests/${id}`, data).then(r => r.data);
export const deleteChangeRequest  = (id) => api.delete(`/clients/change-requests/${id}`).then(r => r.data);
