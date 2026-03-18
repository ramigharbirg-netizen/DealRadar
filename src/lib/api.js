import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Create axios instance
const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Opportunities APIs
export const opportunitiesAPI = {
  getAll: (params) => api.get('/opportunities', { params }),
  getOne: (id, params) => api.get(`/opportunities/${id}`, { params }),
  create: (data) => api.post('/opportunities', data),
  delete: (id) => api.delete(`/opportunities/${id}`),
  trust: (id, action) => api.post(`/opportunities/${id}/trust`, { action }),
};

// Comments APIs
export const commentsAPI = {
  get: (opportunityId) => api.get(`/opportunities/${opportunityId}/comments`),
  create: (opportunityId, content) => api.post(`/opportunities/${opportunityId}/comments`, { content }),
};

// Favorites APIs
export const favoritesAPI = {
  getAll: () => api.get('/favorites'),
  add: (opportunityId) => api.post(`/favorites/${opportunityId}`),
  remove: (opportunityId) => api.delete(`/favorites/${opportunityId}`),
};

// Categories API
export const categoriesAPI = {
  getAll: () => api.get('/categories'),
};

// User APIs
export const userAPI = {
  getStats: (userId) => api.get(`/users/${userId}/stats`),
};

// Bounty APIs
export const bountiesAPI = {
  getAll: (params) => api.get('/bounties', { params }),
  getOne: (id, params) => api.get(`/bounties/${id}`, { params }),
  create: (data) => api.post('/bounties', data),
  cancel: (id) => api.delete(`/bounties/${id}`),
  submit: (bountyId, data) => api.post(`/bounties/${bountyId}/submit`, data),
  getSubmissions: (bountyId) => api.get(`/bounties/${bountyId}/submissions`),
  approveSubmission: (bountyId, submissionId) => 
    api.put(`/bounties/${bountyId}/submissions/${submissionId}/approve`),
  rejectSubmission: (bountyId, submissionId) => 
    api.put(`/bounties/${bountyId}/submissions/${submissionId}/reject`),
  getMyBounties: () => api.get('/my-bounties'),
  getMySubmissions: () => api.get('/my-submissions'),
};

// Notifications APIs
export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
};

// Seed API
export const seedAPI = {
  seed: () => api.post('/seed'),
};

// Upload API
export const uploadAPI = {
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default api;
