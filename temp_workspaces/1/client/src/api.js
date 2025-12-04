import axios from 'axios';
import { toast } from 'react-toastify';

const api = axios.create({
  baseURL: '/'
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    // Optionally show success notifications for certain responses
    if (response.config.method !== 'get' && response.data && response.data.message) {
      toast.success(response.data.message);
    }
    return response;
  },
  (error) => {
    if (error.response && error.response.data && error.response.data.error) {
      toast.error(error.response.data.error);
    } else if (error.message) {
      toast.error(error.message);
    } else {
      toast.error('An unknown error occurred');
    }
    return Promise.reject(error);
  }
);

export default api;
