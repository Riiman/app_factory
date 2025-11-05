import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import { api, setAuthToken } from '../services/api';
import { TOKEN_KEY } from '../config/config'; 

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [startup, setStartup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY));

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    delete axios.defaults.headers.common['Authorization'];
    setAuthToken(null);
    setToken(null);
    setUser(null);
    setStartup(null);
  }, []);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const response = await api.get('/me');
      if (response.data.success) {
        setUser(response.data.user);
        setStartup(response.data.startup);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

    useEffect(() => {
    if (token) {
      setAuthToken(token);  // Use setAuthToken from api.js
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, [token, fetchCurrentUser]);

  const login = async (email, password) => {
    try {
      console.log("Running Login in Auth Context")
      const response = await api.post('/login', { email, password });
      console.log('�� Login response received:', response.data);
      if (response.data.success) {
        const { token, user, startup } = response.data;
        console.log('�� Access token from response:', token);
        console.log('�� User from response:', user);
        console.log('�� Startup from response:', startup);
        localStorage.setItem(TOKEN_KEY, token);
        // localStorage.setItem('USER_KEY', JSON.stringify(user));
        setAuthToken(token);
        // axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setToken(token);
        setUser(user);
        setStartup(startup);
        return { success: true, user, startup }; // Return startup object on success
      }
      // This part is unlikely to be hit if backend always returns success: false on error
      return { success: false, error: 'Login failed' };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed',
        code: error.response?.data?.code, // Pass the code back
        reason: error.response?.data?.reason
      };
    }
  };

  const signup = async (userData) => {
    try {
      const response = await api.post('/signup', userData);
      return {
        success: response.data.success,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Signup failed'
      };
    }
  };

  const value = {
    user,
    startup,
    loading,
    token,
    login,
    signup,
    logout,
    isAuthenticated: !!token && !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
