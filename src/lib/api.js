import axios from 'axios';

const rawApiUrl = process.env.REACT_APP_BACKEND_URL;

if (!rawApiUrl) {
  console.error('REACT_APP_BACKEND_URL is missing');
}

const API_URL = rawApiUrl ? rawApiUrl.replace(/\/+$/, '') : '';

const api = axios.create({
  baseURL: API_URL ? `${API_URL}/api` : '',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (!config.baseURL) {
      console.error('API baseURL is empty. Check REACT_APP_BACKEND_URL.');
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API RESPONSE ERROR:', {
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
      url: error?.config?.url,
      baseURL: error?.config?.baseURL,
      method: error?.config?.method,
    });

    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

export const opportunitiesAPI = {
  getAll: (params) => api.get('/opportunities', { params }),
  getOne: (id, params) => api.get(`/opportunities/${id}`, { params }),
  create: (data) => api.post('/opportunities', data),
  delete: (id) => api.delete(`/opportunities/${id}`),
  trust: (id, action) => api.post(`/opportunities/${id}/trust`, { action }),
};

export const commentsAPI = {
  get: (opportunityId) => api.get(`/opportunities/${opportunityId}/comments`),
  create: (opportunityId, content) =>
    api.post(`/opportunities/${opportunityId}/comments`, { content }),
};

export const favoritesAPI = {
  getAll: () => api.get('/favorites'),
  add: (opportunityId) => api.post(`/favorites/${opportunityId}`),
  remove: (opportunityId) => api.delete(`/favorites/${opportunityId}`),
};

export const categoriesAPI = {
  getAll: () => api.get('/categories'),
};

export const userAPI = {
  getStats: (userId) => api.get(`/users/${userId}/stats`),
};

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

export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
};

export const seedAPI = {
  seed: () => api.post('/seed'),
};

export const uploadAPI = {
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);

    return api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export default api;