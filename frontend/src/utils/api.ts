// src/utils/api.ts

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

class Api {
  private async fetch(url: string, options: RequestInit = {}) {
    const token = localStorage.getItem('access_token');
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const fullUrl = `${API_BASE_URL}${url}`;

    try {
      const response = await fetch(fullUrl, { ...options, headers });
      
      if (response.status === 401) {
        localStorage.removeItem('user');
        localStorage.removeItem('access_token');
        window.location.href = '/login';
        throw new Error('Session expired');
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error from backend:', errorData);
        throw new Error(errorData.msg || 'An API error occurred');
      }

      return response;
    } catch (error) {
      throw error;
    }
  }

  async get(url: string, options: RequestInit = {}) {
    const response = await this.fetch(url, options);
    return response.json();
  }
  
  async post(url: string, body: any, options: RequestInit = {}) {
    const response = await this.fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      ...options,
    });
    return response.json();
  }

  async put(url: string, body: any, options: RequestInit = {}) {
    const response = await this.fetch(url, {
      method: 'PUT',
      body: JSON.stringify(body),
      ...options,
    });
    return response.json();
  }

  // --- Auth ---
  async login(credentials: any) {
    return this.post('/auth/login', credentials);
  }

  async signup(userInfo: any) {
    return this.post('/auth/signup', userInfo);
  }

  async logout() {
    await this.post('/auth/logout', {});
    localStorage.removeItem('user');
  }

  // --- Chat ---
  async chat(message: string) {
    return this.post('/submissions/chat', { message });
  }

  // --- Submissions ---
  async updateSubmission(submissionId: number, data: any) {
    return this.put(`/submissions/${submissionId}`, data);
  }

  // Other methods...
}

const api = new Api();
export default api;