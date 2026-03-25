import api from './axiosInstance';
export const getNewsFeed = () => api.get('/news/feed').then(r => r.data);
export const getAllNews = () => api.get('/news').then(r => r.data);
export const createNews = (data) => api.post('/news', data).then(r => r.data);
export const updateNews = (id, data) => api.patch(`/news/${id}`, data).then(r => r.data);
export const deleteNews = (id) => api.delete(`/news/${id}`).then(r => r.data);
