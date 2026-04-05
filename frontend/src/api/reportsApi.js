import api from './axiosInstance';

export const getSkillsReport     = ()           => api.get('/reports/skills').then(r => r.data);
export const getTimesheetReport  = (from, to)   => api.get('/reports/timesheets', { params: { from, to } }).then(r => r.data);
export const getCertReport       = ()           => api.get('/reports/certs').then(r => r.data);
export const getLeaveReport      = (from, to)   => api.get('/reports/leave', { params: { from, to } }).then(r => r.data);
export const getAllocationReport  = ()           => api.get('/reports/allocation').then(r => r.data);
export const getTalentReport     = ()           => api.get('/reports/talent').then(r => r.data);
export const getKudosReport      = (from, to)   => api.get('/reports/kudos', { params: { from, to } }).then(r => r.data);
