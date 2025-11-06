// src/utils/api.ts

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

class Api {
  private async fetch(url: string, options: RequestInit = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    const response = await fetch(`${API_BASE_URL}${url}`, { ...options, headers });
    if (response.status === 401) {
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new Error('Session expired');
    }
    return response;
  }

  private async post(url: string, body: any, options: RequestInit = {}) {
    return this.fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      ...options,
    });
  }

  private async put(url: string, body: any, options: RequestInit = {}) {
    return this.fetch(url, {
        method: 'PUT',
        body: JSON.stringify(body),
        ...options,
    });
  }

  // --- Auth ---
  async login(credentials: any) {
    const response = await this.post('/auth/login', credentials);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Login failed');
    }
    return response.json();
  }

  async signup(userInfo: any) {
    const response = await this.post('/auth/signup', userInfo);
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Signup failed');
    }
    return response.json();
  }

  async logout() {
    await this.post('/auth/logout', {});
    localStorage.removeItem('user');
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

  // --- Lazy Loading Endpoints ---
  async getTasks(startupId: number) {
    const response = await this.fetch(`/startups/${startupId}/tasks`);
    if (!response.ok) throw new Error('Failed to fetch tasks');
    return (await response.json()).tasks;
  }
  async getExperiments(startupId: number) {
    const response = await this.fetch(`/startups/${startupId}/experiments`);
    if (!response.ok) throw new Error('Failed to fetch experiments');
    return (await response.json()).experiments;
  }
  async getArtifacts(startupId: number) {
    const response = await this.fetch(`/startups/${startupId}/artifacts`);
    if (!response.ok) throw new Error('Failed to fetch artifacts');
    return (await response.json()).artifacts;
  }
  async getProducts(startupId: number) {
    const response = await this.fetch(`/startups/${startupId}/products`);
    if (!response.ok) throw new Error('Failed to fetch products');
    return (await response.json()).products;
  }
  async getMonthlyReports(startupId: number) {
    const response = await this.fetch(`/startups/${startupId}/monthly-reports`);
    if (!response.ok) throw new Error('Failed to fetch monthly reports');
    return (await response.json()).reports;
  }
  async getFundingRounds(startupId: number) {
    const response = await this.fetch(`/startups/${startupId}/funding-rounds`);
    if (!response.ok) throw new Error('Failed to fetch funding rounds');
    return (await response.json()).rounds;
  }
  async getInvestors(startupId: number) {
    const response = await this.fetch(`/startups/${startupId}/investors`);
    if (!response.ok) throw new Error('Failed to fetch investors');
    return (await response.json()).investors;
  }
  async getCampaigns(startupId: number) {
    const response = await this.fetch(`/startups/${startupId}/campaigns`);
    if (!response.ok) throw new Error('Failed to fetch campaigns');
    return (await response.json()).campaigns;
  }
  async getFounders(startupId: number) {
    const response = await this.fetch(`/startups/${startupId}/founders`);
    if (!response.ok) throw new Error('Failed to fetch founders');
    return (await response.json()).founders;
  }

  // --- Create/Update Endpoints ---
  async createTask(startupId: number, data: any) {
    const response = await this.post(`/startups/${startupId}/tasks`, data);
    if (!response.ok) throw new Error('Failed to create task');
    return (await response.json()).task;
  }
  async createExperiment(startupId: number, data: any) {
    const response = await this.post(`/startups/${startupId}/experiments`, data);
    if (!response.ok) throw new Error('Failed to create experiment');
    return (await response.json()).experiment;
  }
  async createArtifact(startupId: number, data: any) {
    const response = await this.post(`/startups/${startupId}/artifacts`, data);
    if (!response.ok) throw new Error('Failed to create artifact');
    return (await response.json()).artifact;
  }
  async createProduct(startupId: number, data: any) {
    const response = await this.post(`/startups/${startupId}/products`, data);
    if (!response.ok) throw new Error('Failed to create product');
    return (await response.json()).product;
  }
  async createFeature(startupId: number, data: any) {
    const response = await this.post(`/startups/${startupId}/products/features`, data);
    if (!response.ok) throw new Error('Failed to create feature');
    return (await response.json()).feature;
  }
  async createMetric(startupId: number, productId: number, data: any) {
    const response = await this.post(`/startups/${startupId}/products/${productId}/metrics`, data);
    if (!response.ok) throw new Error('Failed to create metric');
    return (await response.json()).metric;
  }
  async createIssue(startupId: number, productId: number, data: any) {
    const response = await this.post(`/startups/${startupId}/products/${productId}/issues`, data);
    if (!response.ok) throw new Error('Failed to create issue');
    return (await response.json()).issue;
  }
  async createMonthlyReport(startupId: number, data: any) {
    const response = await this.post(`/startups/${startupId}/monthly-reports`, data);
    if (!response.ok) throw new Error('Failed to create monthly report');
    return (await response.json()).report;
  }
  async createFundingRound(startupId: number, data: any) {
    const response = await this.post(`/startups/${startupId}/funding-rounds`, data);
    if (!response.ok) throw new Error('Failed to create funding round');
    return (await response.json()).round;
  }
  async createInvestor(startupId: number, data: any) {
    const response = await this.post(`/startups/${startupId}/investors`, data);
    if (!response.ok) throw new Error('Failed to create investor');
    return (await response.json()).investor;
  }
  async createCampaign(startupId: number, data: any) {
    const response = await this.post(`/startups/${startupId}/campaigns`, data);
    if (!response.ok) throw new Error('Failed to create campaign');
    return (await response.json()).campaign;
  }
  async createContentItem(startupId: number, campaignId: number, data: any) {
    const response = await this.post(`/startups/${startupId}/campaigns/${campaignId}/content`, data);
    if (!response.ok) throw new Error('Failed to create content item');
    return (await response.json()).item;
  }
  async createFounder(startupId: number, data: any) {
    const response = await this.post(`/startups/${startupId}/founders`, data);
    if (!response.ok) throw new Error('Failed to create founder');
    return (await response.json()).founder;
  }
  async updateStartupSettings(startupId: number, data: any) {
    const response = await this.put(`/startups/${startupId}/settings`, data);
    if (!response.ok) throw new Error('Failed to update settings');
    return (await response.json()).startup;
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
}

const api = new Api();
export default api;