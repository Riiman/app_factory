import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [startup, setStartup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('access_token'));

  // Set axios default header
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/me');
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
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post('http://localhost:5000/api/login', {
        email,
        password
      });

      if (response.data.success) {
        const { access_token, user, startup } = response.data;
        localStorage.setItem('access_token', access_token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        setToken(access_token);
        setUser(user);
        setStartup(startup);
        return { success: true };
      }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed'
      };
    }
  };

  const signup = async (userData) => {
    try {
      const response = await axios.post('http://localhost:5000/api/signup', userData);
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

  const logout = () => {
    localStorage.removeItem('access_token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    setStartup(null);
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
