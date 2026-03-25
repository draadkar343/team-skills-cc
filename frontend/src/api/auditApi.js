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
