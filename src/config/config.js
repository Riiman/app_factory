
const config = {
  development: {
    apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
    appName: process.env.REACT_APP_NAME || 'Turning Ideas App Factory',
    version: process.env.REACT_APP_VERSION || '1.0.0',
    enableAnalytics: process.env.REACT_APP_ENABLE_ANALYTICS === 'true',
    enableDebug: process.env.REACT_APP_ENABLE_DEBUG === 'true',
    maxFileSize: 16 * 1024 * 1024, // 16MB
    allowedFileTypes: ['pdf', 'doc', 'docx', 'txt'],
    tokenKey: 'token',
    userKey: 'user',
  },
  
  production: {
    apiUrl: process.env.REACT_APP_API_URL || 'https://api.turningideas.in/api',
    appName: process.env.REACT_APP_NAME || 'Turning Ideas App Factory',
    version: process.env.REACT_APP_VERSION || '1.0.0',
    enableAnalytics: process.env.REACT_APP_ENABLE_ANALYTICS === 'true',
    enableDebug: false,
    maxFileSize: 16 * 1024 * 1024, // 16MB
    allowedFileTypes: ['pdf', 'doc', 'docx', 'txt'],
    tokenKey: 'token',
    userKey: 'user',
  },
  
  testing: {
    apiUrl: 'http://localhost:5000/api',
    appName: 'Turning Ideas App Factory - Test',
    version: '1.0.0-test',
    enableAnalytics: false,
    enableDebug: true,
    maxFileSize: 16 * 1024 * 1024,
    allowedFileTypes: ['pdf', 'doc', 'docx', 'txt'],
    tokenKey: 'token',
    userKey: 'user',
  }
};

const environment = process.env.NODE_ENV || 'development';

export default config[environment];

// Export individual config values for convenience
export const API_URL = config[environment].apiUrl;
export const APP_NAME = config[environment].appName;
export const APP_VERSION = config[environment].version;
export const ENABLE_ANALYTICS = config[environment].enableAnalytics;
export const ENABLE_DEBUG = config[environment].enableDebug;
export const MAX_FILE_SIZE = config[environment].maxFileSize;
export const ALLOWED_FILE_TYPES = config[environment].allowedFileTypes;
export const TOKEN_KEY = config[environment].tokenKey;
export const USER_KEY = config[environment].userKey;