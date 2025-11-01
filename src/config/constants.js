
// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    SIGNUP: '/auth/signup',
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    VERIFY_EMAIL: '/auth/verify-email',
    RESEND_VERIFICATION: '/auth/resend-verification',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    REFRESH_TOKEN: '/auth/refresh',
  },
  
  // Dashboard
  DASHBOARD: {
    STATS: '/dashboard/stats',
    RECENT_ACTIVITY: '/dashboard/recent-activity',
    NOTIFICATIONS: '/dashboard/notifications',
    GET: '/dashboard',
    OVERVIEW: '/dashboard/overview',
    STAGES: '/dashboard/stages',
    STAGE: (key) => `/dashboard/stage/${key}`
  },
  
  // Submissions
  SUBMISSIONS: {
    SUBMIT_STAGE: '/submissions/submit-stage',
    SUBMIT_FINAL: '/submissions/submit-final',
    GET_SUBMISSION: '/submissions/:id',
    LIST_SUBMISSIONS: '/submissions',
    UPDATE_STATUS: '/submissions/:id/status',
  },
  
  // Documents
  DOCUMENTS: {
    GENERATE: '/documents/generate',
    GET_DOCUMENT: '/documents/:id',
    LIST_DOCUMENTS: '/documents',
    DOWNLOAD: '/documents/:id/download',
  },
  
  // User
  USER: {
    PROFILE: '/user/profile',
    UPDATE_PROFILE: '/user/profile',
    CHANGE_PASSWORD: '/user/change-password',
  },
  TASKS: {
    GET: (stageKey) => `/dashboard/stage/${stageKey}/tasks`,
    CREATE: (stageKey) => `/dashboard/stage/${stageKey}/tasks`,
    UPDATE: (id) => `/dashboard/tasks/${id}`,
    DELETE: (id) => `/dashboard/tasks/${id}`
  },
  METRICS: {
    GET: (stageKey) => `/dashboard/stage/${stageKey}/metrics`,
    UPSERT: (stageKey) => `/dashboard/stage/${stageKey}/metrics`
  },
  ARTIFACTS: {
    GET: (stageKey) => `/dashboard/stage/${stageKey}/artifacts`,
    CREATE: (stageKey) => `/dashboard/stage/${stageKey}/artifacts`
  }
};

// Startup Status
export const STARTUP_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
};

export const STARTUP_STATUS_LABELS = {
  [STARTUP_STATUS.NOT_STARTED]: 'Not Started',
  [STARTUP_STATUS.IN_PROGRESS]: 'In Progress',
  [STARTUP_STATUS.SUBMITTED]: 'Submitted',
  [STARTUP_STATUS.UNDER_REVIEW]: 'Under Review',
  [STARTUP_STATUS.ACCEPTED]: 'Accepted',
  [STARTUP_STATUS.REJECTED]: 'Rejected',
};

export const STARTUP_STATUS_COLORS = {
  [STARTUP_STATUS.NOT_STARTED]: '#718096',
  [STARTUP_STATUS.IN_PROGRESS]: '#3182ce',
  [STARTUP_STATUS.SUBMITTED]: '#805ad5',
  [STARTUP_STATUS.UNDER_REVIEW]: '#d69e2e',
  [STARTUP_STATUS.ACCEPTED]: '#38a169',
  [STARTUP_STATUS.REJECTED]: '#e53e3e',
};

// Document Types
export const DOCUMENT_TYPES = {
  PRODUCT_SCOPE: 'product_scope',
  GTM_STRATEGY: 'gtm_strategy',
  FINANCIAL_PROJECTIONS: 'financial_projections',
  TECHNICAL_ARCHITECTURE: 'technical_architecture',
};

export const DOCUMENT_TYPE_LABELS = {
  [DOCUMENT_TYPES.PRODUCT_SCOPE]: 'Product Scope',
  [DOCUMENT_TYPES.GTM_STRATEGY]: 'Go-To-Market Strategy',
  [DOCUMENT_TYPES.FINANCIAL_PROJECTIONS]: 'Financial Projections',
  [DOCUMENT_TYPES.TECHNICAL_ARCHITECTURE]: 'Technical Architecture',
};

// Evaluation Stages
export const EVALUATION_STAGES = {
  BASIC_INFO: 1,
  PROBLEM_SOLUTION: 2,
  PRODUCT_TECH: 3,
  MARKET_COMPETITION: 4,
  BUSINESS_MODEL: 5,
  TEAM_TRACTION: 6,
};

export const TOTAL_STAGES = 6;

export const STAGE_NAMES = {
  1: 'Basic Information',
  2: 'Problem & Solution',
  3: 'Product & Technology',
  4: 'Market & Competition',
  5: 'Business Model',
  6: 'Team & Traction',
};

// Form Validation
export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
  URL_REGEX: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
  PASSWORD_MIN_LENGTH: 8,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 5000,
};

// Local Storage Keys
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  THEME: 'theme',
  LANGUAGE: 'language',
  FORM_DRAFT: 'form_draft',
};

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized. Please login again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  SERVER_ERROR: 'Something went wrong. Please try again later.',
  SESSION_EXPIRED: 'Your session has expired. Please login again.',
  FILE_TOO_LARGE: 'File size exceeds the maximum limit.',
  INVALID_FILE_TYPE: 'Invalid file type. Please upload a supported file.',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login successful!',
  SIGNUP_SUCCESS: 'Account created successfully! Please verify your email.',
  PROFILE_UPDATED: 'Profile updated successfully!',
  PASSWORD_CHANGED: 'Password changed successfully!',
  EMAIL_SENT: 'Email sent successfully!',
  STAGE_SAVED: 'Stage saved successfully!',
  SUBMISSION_COMPLETE: 'Application submitted successfully!',
  DOCUMENT_GENERATED: 'Document generated successfully!',
};

// Notification Types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM DD, YYYY',
  DISPLAY_WITH_TIME: 'MMM DD, YYYY hh:mm A',
  API: 'YYYY-MM-DD',
  API_WITH_TIME: 'YYYY-MM-DDTHH:mm:ss',
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PER_PAGE: 10,
  PER_PAGE_OPTIONS: [10, 25, 50, 100],
};

// Theme
export const THEME = {
  LIGHT: 'light',
  DARK: 'dark',
};

// Debounce Delays (in milliseconds)
export const DEBOUNCE_DELAYS = {
  SEARCH: 300,
  AUTO_SAVE: 1000,
  RESIZE: 150,
};

// File Upload
export const FILE_UPLOAD = {
  MAX_SIZE: 16 * 1024 * 1024, // 16MB
  ALLOWED_TYPES: ['pdf', 'doc', 'docx', 'txt', 'png', 'jpg', 'jpeg'],
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/png',
    'image/jpeg',
  ],
};

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  VERIFY_EMAIL: '/verify-email',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  DASHBOARD: '/dashboard',
  EVALUATION_FORM: '/evaluation-form',
  PROFILE: '/profile',
  DOCUMENTS: '/documents',
  SUBMISSIONS: '/submissions',
  SETTINGS: '/settings',
};

export const STAGE_KEYS = [
  'founder_specifications',
  'product_scope',
  'gtm_scope',
  'product_ux',
  'product_code',
  'test_deploy',
  'share_monitor',
  'monetize_gtm',
  'fundraise'
];

export const STATUS_COLORS = {
  completed: '#10b981',
  in_progress: '#f59e0b',
  blocked: '#ef4444',
  in_review: '#3b82f6',
  not_started: '#9ca3af',
  skipped: '#6b7280'
};

export const PRIORITY_COLORS = {
  p0: '#ef4444',
  p1: '#f59e0b',
  p2: '#3b82f6',
  p3: '#6b7280'
};
