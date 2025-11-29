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

  // --- Startup Data ---
  async getStartupData(startupId: number) {
    const response = await this.fetch(`/startups/${startupId}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch startup data');
    }
    const data = await response.json();
    return data.startup;
  }

  // --- Pre-Admission Stage Endpoints ---
  async getEvaluationTasks() {
    const response = await this.fetch('/stages/evaluation/tasks');
    if (!response.ok) throw new Error('Failed to fetch evaluation tasks');
    return (await response.json()).tasks;
  }

  async getScopeDocument() {
    const response = await this.fetch('/stages/scope');
    if (!response.ok) throw new Error('Failed to fetch scope document');
    return (await response.json()).scope_document;
  }

  async addScopeComment(sectionId: string, text: string) {
    const response = await this.post('/stages/scope/comments', { section_id: sectionId, text });
    if (!response.ok) throw new Error('Failed to add comment');
    return (await response.json()).comment;
  }

  async getContractDetails() {
    const response = await this.fetch('/stages/contract');
    if (!response.ok) throw new Error('Failed to fetch contract details');
    return (await response.json()).contract;
  }
  
  // --- Admin Endpoints ---

  async getAllSubmissions() {
    const data = await this.get('/admin/submissions');
    return data.submissions;
  }

  async getAllStartups() {
    const data = await this.get('/admin/startups');
    return data.startups;
  }

  async getStartupDetail(startupId: number) {
    return this.get(`/admin/startups/${startupId}`);
  }

  async updateStartupStage(startupId: number, newStage: string) {
    return this.put(`/admin/startups/${startupId}/stage`, { current_stage: newStage });
  }

  async updateSubmissionStatus(submissionId: number, newStatus: string) {
    return this.put(`/admin/submissions/${submissionId}/status`, { status: newStatus });
  }

  async getAllUsers() {
    const data = await this.get('/admin/users');
    return data.users;
  }

  async updateUserRole(userId: number, newRole: string) {
    return this.put(`/admin/users/${userId}/role`, { role: newRole });
  }

  async updateScopeDocument(startupId: number, data: { productScope: string; gtmScope: string }) {
    return this.put(`/admin/startups/${startupId}/scope`, data);
  }

  async addAdminScopeComment(startupId: number, text: string) {
    return this.post(`/admin/startups/${startupId}/scope/comments`, { text });
  }

  async updateScopeStatus(startupId: number, status: string) {
    return this.put(`/admin/scope/${startupId}/status`, { status });
  }

  async updateContract(startupId: number, data: { documentUrl: string; status: string }) {
    return this.put(`/admin/startups/${startupId}/contract`, data);
  }

  async updateContractStatus(startupId: number, newStatus: string) {
    return this.put(`/admin/contract/${startupId}/status`, { status: newStatus });
  }

  // Other methods...
}

const api = new Api();
export default api;