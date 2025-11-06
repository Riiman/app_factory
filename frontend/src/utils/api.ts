// src/utils/api.ts
import { useNavigate } from 'react-router-dom';

const api = {
  async fetch(url: string, options: RequestInit = {}) {
    // Ensure credentials are included for all API requests
    options.credentials = 'include';

    const response = await fetch(url, options);

    if (response.status === 401) {
      // Unauthorized: clear user data and redirect to login
      localStorage.removeItem('user');
      // Use a hard redirect to ensure the app state is fully reset
      window.location.href = '/login?session_expired=true';
    }

    return response;
  }
};

export default api;
