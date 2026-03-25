import api from './axiosInstance';

export const getAuditLog = (params) =>
  api.get('/audit', { params }).then(r => r.data);

export const getAuditTables = () =>
  api.get('/audit/tables').then(r => r.data);

export const getRetentionPolicies = () =>
  api.get('/audit/retention').then(r => r.data);

export const saveRetentionPolicies = (policies) =>
  api.put('/audit/retention', policies).then(r => r.data);

export const purgeByRetention = () =>
  api.post('/audit/purge').then(r => r.data);

export const getErrorLog = (params) =>
  api.get('/audit/errors', { params }).then(r => r.data);

export const clearErrorLog = (olderThanDays) =>
  api.delete('/audit/errors', { data: olderThanDays != null ? { olderThanDays } : {} }).then(r => r.data);
