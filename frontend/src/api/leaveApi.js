import api from './axiosInstance';

// Leave types
export const getLeaveTypes = (activeOnly = false) =>
  api.get('/leave/types', { params: activeOnly ? { active: 'true' } : {} }).then(r => r.data);
export const createLeaveType = (data) =>
  api.post('/leave/types', data).then(r => r.data);
export const updateLeaveType = (id, data) =>
  api.put(`/leave/types/${id}`, data).then(r => r.data);
export const deleteLeaveType = (id) =>
  api.delete(`/leave/types/${id}`).then(r => r.data);

// Leave requests — own
export const getMyLeave = () =>
  api.get('/leave/my').then(r => r.data);
export const createLeave = (data) =>
  api.post('/leave', data).then(r => r.data);
export const cancelLeave = (id) =>
  api.patch(`/leave/${id}/cancel`).then(r => r.data);

// Manager approval
export const getPendingLeave = () =>
  api.get('/leave/pending').then(r => r.data);
export const approveLeave = (id) =>
  api.patch(`/leave/${id}/approve`).then(r => r.data);
export const rejectLeave = (id, reason) =>
  api.patch(`/leave/${id}/reject`, { reason }).then(r => r.data);

// Calendar
export const getTeamCalendar = (month) =>
  api.get('/leave/team-calendar', { params: { month } }).then(r => r.data);

// Admin
export const getAllLeave = (params) =>
  api.get('/leave/all', { params }).then(r => r.data);
