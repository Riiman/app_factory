
import axios from 'axios';
import { getErrorMessage } from '../utils/helpers';
import { TOKEN_KEY, USER_KEY } from '../config/config';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

console.log('🔧 authService initialized with:');
console.log('  TOKEN_KEY:', TOKEN_KEY);
console.log('  USER_KEY:', USER_KEY);

class AuthService {
  /**
   * Sign up a new user
   */
  async signup(userData) {
    try {
      const response = await axios.post(`${API_URL}/signup`, userData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      const err = new Error(getErrorMessage(error));
      err.code = error.response?.data?.code;
      throw err;
    }
  }

  /**
   * Log in a user
   */
  async login(credentials) {
    try {
      // The path should be '/login', not '/auth/login'
      console.log('🔐 authService.login() called with:', credentials.email);
      const response = await axios.post(
        `${API_URL}/login`, 
        credentials,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✅ Login response received:', response.data);
      const { token, user } = response.data;

      console.log('🔑 Access token from response:', token);
      console.log('👤 User from response:', user);

          // Check if access_token exists
    if (!token) {
      console.error('❌ NO ACCESS_TOKEN IN RESPONSE!');
      throw new Error('No access token received from server');
    }
      
      // Store token and user data
      this.setToken(token);
      this.setUser(user);
      
      return response.data;
    } catch (error) {
      const err = new Error(getErrorMessage(error));
      err.code = error.response?.data?.code;
      throw err;
    }
  }

  /**
   * Log out the current user
   */
  async logout() {
    try {
      await axios.post(`${API_URL}/logout`);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuth();
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token) {
    try {
      const response = await axios.post(`${API_URL}/verify-email/${token}`);
      return response.data;
    } catch (error) {
      const err = new Error(getErrorMessage(error));
      err.code = error.response?.data?.code;
      throw err;
    }
  }

  /**
   * Resend verification email
   */
  async resendVerification(email) {
    try {
      const response = await axios.post(`${API_URL}/resend-verification`, { email }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      const err = new Error(getErrorMessage(error));
      err.code = error.response?.data?.code;
      throw err;
    }
  }

  /**
   * Request password reset
   */
  async forgotPassword(email) {
    try {
      const response = await axios.post(`${API_URL}/forgot-password`, { email });
      return response.data;
    } catch (error) {
      const err = new Error(getErrorMessage(error));
      err.code = error.response?.data?.code;
      throw err;
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token, password) {
    try {
      const response = await axios.post(`${API_URL}/reset-password/${token}`, { password });
      return response.data;
    } catch (error) {
      const err = new Error(getErrorMessage(error));
      err.code = error.response?.data?.code;
      throw err;
    }
  }

  /**
   * Handle API errors
   */
  handleError(error) {
    if (error.response) {
      // Server responded with error
      const message = error.response.data?.error || error.response.data?.message || 'An error occurred';
      return new Error(message);
    } else if (error.request) {
      // Request made but no response
      return new Error('Network error. Please check your connection.');
    } else {
      // Something else happened
      return new Error(error.message || 'An unexpected error occurred');
    }
  }

  /**
   * Set authentication token
   */
  setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  /**
   * Get authentication token
   */
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  /**
   * Set user data
   */
  setUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  /**
   * Get user data
   */
  getUser() {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  /**
   * Clear authentication data
   */
  clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.getToken();
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    const userStr = localStorage.getItem(USER_KEY);
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (error) {
        console.error('Error parsing user data:', error);
        return null;
      }
    }
    return null;
  }
}

const authService = new AuthService();
export default authService;
