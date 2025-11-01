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

  // Dashboard - Updated with new endpoints
  dashboard: {
    getDashboard: () => api.get('/dashboard'),
    getOverview: () => api.get('/dashboard/overview'),
    getStages: () => api.get('/dashboard/stages'),
    getStage: (stageKey) => api.get(`/dashboard/stage/${stageKey}`),
    updateStage: (stageKey, data) => api.put(`/dashboard/stage/${stageKey}`, data),
    
    // Legacy endpoints (keep for backward compatibility)
    getStats: () => api.get('/dashboard/stats'),
    getRecentActivity: () => api.get('/dashboard/recent-activity'),
    getNotifications: () => api.get('/dashboard/notifications'),
  },

  // Tasks - New
  tasks: {
    getTasks: (stageKey) => api.get(`/dashboard/stage/${stageKey}/tasks`),
    createTask: (stageKey, data) => api.post(`/dashboard/stage/${stageKey}/tasks`, data),
    updateTask: (taskId, data) => api.put(`/dashboard/tasks/${taskId}`, data),
    deleteTask: (taskId) => api.delete(`/dashboard/tasks/${taskId}`),
  },

  // Metrics - New
  metrics: {
    getMetrics: (stageKey) => api.get(`/dashboard/stage/${stageKey}/metrics`),
    upsertMetric: (stageKey, data) => api.post(`/dashboard/stage/${stageKey}/metrics`, data),
  },

  // Artifacts - New
  artifacts: {
    getArtifacts: (stageKey) => api.get(`/dashboard/stage/${stageKey}/artifacts`),
    createArtifact: (stageKey, data) => api.post(`/dashboard/stage/${stageKey}/artifacts`, data),
  },

  // Experiments - New
  experiments: {
    getExperiments: (stageKey) => api.get(`/dashboard/stage/${stageKey}/experiments`),
    createExperiment: (stageKey, data) => api.post(`/dashboard/stage/${stageKey}/experiments`, data),
  },

  // Integrations - New
  integrations: {
    getIntegrations: () => api.get('/dashboard/integrations'),
    connectIntegration: (type, config) => api.post('/dashboard/integrations', { type, config }),
  },

  // Submissions
  submissions: {
    submitStage: (data) => api.post('/submissions/submit-stage', data),
    submitFinal: () => api.post('/submissions/submit-final'),
    getSubmission: () => api.get('/submissions'),
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

  // Platform
  platform: {
    getSubmissions: () => api.get('/platform/submissions'),
    getSubmission: (submissionId) => api.get(`/platform/submissions/${submissionId}`),
    evaluateSubmission: (submissionId, data) => api.post(`/platform/submissions/${submissionId}/evaluate`, data),
    getAllStartupsWithMetrics: () => api.get('/platform/startups-with-metrics'),
  },

  productScope: {
    createScope: (startupId) => api.post(`/platform/startups/${startupId}/scope`),
    addFeature: (scopeId, data) => api.post(`/platform/scopes/${scopeId}/features`, data),
    getScope: () => api.get('/dashboard/scope'),
    addComment: (featureId, data) => api.post(`/dashboard/features/${featureId}/comments`, data),
    approveScope: () => api.post('/dashboard/scope/approve'),
    requestChanges: () => api.post('/dashboard/scope/request-changes'),
  },

  gtmScope: {
    createOrUpdateScope: (startupId, data) => api.post(`/platform/startups/${startupId}/gtm-scope`, data),
    getScope: () => api.get('/dashboard/gtm-scope'),
    approveScope: () => api.post('/dashboard/gtm-scope/approve'),
    requestChanges: () => api.post('/dashboard/gtm-scope/request-changes'),
  },

  uxDesign: {
    createOrUpdateScope: (startupId, data) => api.post(`/platform/startups/${startupId}/ux-design`, data),
    getScope: () => api.get('/dashboard/ux-design'),
    approveScope: (data) => api.post('/dashboard/ux-design/approve', data),
    addComment: (data) => api.post('/dashboard/ux-design/comments', data),
  },

  build: {
    updateFeatureStatus: (featureId, data) => api.put(`/platform/features/${featureId}/status`, data),
    getBuildProgress: () => api.get('/dashboard/build-progress'),
    getBuilds: () => api.get('/dashboard/builds'),
  },

  deployment: {
    createDeployment: (buildId, data) => api.post(`/platform/builds/${buildId}/deployments`, data),
    updateDeployment: (deploymentId, data) => api.put(`/platform/deployments/${deploymentId}`, data),
    getDeployments: () => api.get('/dashboard/deployments'),
    approveRelease: (deploymentId) => api.post(`/dashboard/deployments/${deploymentId}/approve-release`),
    submitFeedback: (deploymentId, data) => api.post(`/dashboard/deployments/${deploymentId}/submit-feedback`, data),
  },

  analytics: {
    getDashboardAnalytics: () => api.get('/dashboard/analytics'),
  },

  monetization: {
    createOrUpdateMonetization: (startupId, data) => api.post(`/platform/startups/${startupId}/monetization`, data),
    createCampaign: (startupId, data) => api.post(`/platform/startups/${startupId}/campaigns`, data),
    getDashboardMonetization: () => api.get('/dashboard/monetization'),
  },

  fundraising: {
    createOrUpdateFundraising: (startupId, data) => api.post(`/platform/startups/${startupId}/fundraising`, data),
    manageCodeHandover: (startupId, data) => api.post(`/platform/startups/${startupId}/code-handover`, data),
    getDashboardFundraising: () => api.get('/dashboard/fundraising'),
    payCommission: () => api.post('/dashboard/fundraising/pay-commission'),
    requestCodeAccess: () => api.post('/dashboard/fundraising/request-code-access'),
  },
};

export default apiService;
export { api };
