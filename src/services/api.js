
import axios from 'axios';
import { API_URL, TOKEN_KEY } from '../config/config';
import { HTTP_STATUS, ERROR_MESSAGES } from '../config/constants';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      const { status } = error.response;
      
      switch (status) {
        case HTTP_STATUS.UNAUTHORIZED:
          // Clear token and redirect to login
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem('user');
          window.location.href = '/login';
          break;
          
        case HTTP_STATUS.FORBIDDEN:
          console.error(ERROR_MESSAGES.FORBIDDEN);
          break;
          
        case HTTP_STATUS.NOT_FOUND:
          console.error(ERROR_MESSAGES.NOT_FOUND);
          break;
          
        case HTTP_STATUS.INTERNAL_SERVER_ERROR:
          console.error(ERROR_MESSAGES.SERVER_ERROR);
          break;
          
        default:
          console.error('API Error:', error.response.data);
      }
    } else if (error.request) {
      console.error(ERROR_MESSAGES.NETWORK_ERROR);
    } else {
      console.error('Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// API service methods
const apiService = {
  // Authentication
  auth: {
    signup: (data) => api.post('/signup', data),
    login: (data) => api.post('/login', data),
    logout: () => api.post('/logout'),
    verifyEmail: (token) => api.post(`/auth/verify-email/${token}`),
    resendVerification: (email) => api.post('/auth/resend-verification', { email }),
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
    resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  },

  // Dashboard
  dashboard: {
    getStats: () => api.get('/dashboard/stats'),
    getRecentActivity: () => api.get('/dashboard/recent-activity'),
    getNotifications: () => api.get('/dashboard/notifications'),
    getDashboard: () => api.get(`/dashboard`),
  },

  // Submissions
  submissions: {
    submitStage: (data) => api.post('/submissions/submit-stage', data),
    submitFinal: () => api.post('/submissions/submit-final'),
    getSubmission: () => api.get(`/submissions`),
    listSubmissions: () => api.get('/submissions'),
    updateStatus: (id, status) => api.put(`/submissions/${id}/status`, { status }),
    getCurrent: () => api.get('/submissions/current'),
    getSubmissionStatus: () => api.get('/submission-status')
  },

  // Documents
  documents: {
    generate: (submissionId) => api.post('/documents/generate', { submission_id: submissionId }),
    getDocument: (id) => api.get(`/documents/${id}`),
    listDocuments: (params) => api.get('/documents', { params }),
    download: (id) => api.get(`/documents/${id}/download`, { responseType: 'blob' }),
  },

  // User
  user: {
    getProfile: () => api.get('/user/profile'),
    updateProfile: (data) => api.put('/user/profile', data),
    changePassword: (data) => api.post('/user/change-password', data),
  },
};

export default apiService;
export { api };
