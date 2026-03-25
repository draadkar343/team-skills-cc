import api from './axiosInstance';

export const getAuditLog = (params) =>
  api.get('/audit', { params }).then(r => r.data);

export const getAuditTables = () =>
  api.get('/audit/tables').then(r => r.data);
