import api from './axiosInstance';

// API Keys
export const listApiKeys = () => api.get('/integrations/api-keys').then(r => r.data);
export const createApiKey = (data) => api.post('/integrations/api-keys', data).then(r => r.data);
export const revokeApiKey = (id) => api.patch(`/integrations/api-keys/${id}/revoke`).then(r => r.data);
export const deleteApiKey = (id) => api.delete(`/integrations/api-keys/${id}`).then(r => r.data);

// External integrations
export const listIntegrations = () => api.get('/integrations/external').then(r => r.data);
export const getIntegration = (id) => api.get(`/integrations/external/${id}`).then(r => r.data);
export const createIntegration = (data) => api.post('/integrations/external', data).then(r => r.data);
export const updateIntegration = (id, data) => api.patch(`/integrations/external/${id}`, data).then(r => r.data);
export const deleteIntegration = (id) => api.delete(`/integrations/external/${id}`).then(r => r.data);
export const testIntegration = (id) => api.post(`/integrations/external/${id}/test`).then(r => r.data);

// Webhooks
export const listWebhooks = () => api.get('/integrations/webhooks').then(r => r.data);
export const createWebhook = (data) => api.post('/integrations/webhooks', data).then(r => r.data);
export const updateWebhook = (id, data) => api.patch(`/integrations/webhooks/${id}`, data).then(r => r.data);
export const deleteWebhook = (id) => api.delete(`/integrations/webhooks/${id}`).then(r => r.data);
export const getWebhookDeliveries = (id) => api.get(`/integrations/webhooks/${id}/deliveries`).then(r => r.data);
