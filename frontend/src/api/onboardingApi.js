import api from './axiosInstance';

// Employee
export const getMyOnboarding   = ()                       => api.get('/onboarding/me').then(r => r.data);
export const toggleTask        = (taskId)                  => api.patch(`/onboarding/me/tasks/${taskId}/toggle`).then(r => r.data);

// Admin — templates
export const listTemplates     = ()                        => api.get('/onboarding/templates').then(r => r.data);
export const createTemplate    = (data)                    => api.post('/onboarding/templates', data).then(r => r.data);
export const updateTemplate    = (id, data)                => api.patch(`/onboarding/templates/${id}`, data).then(r => r.data);
export const deleteTemplate    = (id)                      => api.delete(`/onboarding/templates/${id}`).then(r => r.data);
export const addTask           = (templateId, data)        => api.post(`/onboarding/templates/${templateId}/tasks`, data).then(r => r.data);
export const updateTask        = (templateId, taskId, data) => api.patch(`/onboarding/templates/${templateId}/tasks/${taskId}`, data).then(r => r.data);
export const deleteTask        = (templateId, taskId)      => api.delete(`/onboarding/templates/${templateId}/tasks/${taskId}`).then(r => r.data);

// Admin — assignments
export const listAssignments   = ()                        => api.get('/onboarding/assignments').then(r => r.data);
export const assign            = (userId, templateId)      => api.post('/onboarding/assignments', { userId, templateId }).then(r => r.data);
export const removeAssignment  = (id)                      => api.delete(`/onboarding/assignments/${id}`).then(r => r.data);
