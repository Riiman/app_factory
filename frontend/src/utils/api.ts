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
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.indexOf('application/json') !== -1) {
            const errorData = await response.json();
            console.error('Error from backend:', errorData);
            throw new Error(errorData.msg || 'An API error occurred');
        } else {
            const errorText = await response.text();
            console.error('Non-JSON error from backend:', errorText);
            throw new Error(`Server returned an error: ${response.status} ${response.statusText}`);
        }
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

  async getMarketingOverview(startupId: number) {
    const response = await this.fetch(`/startups/${startupId}/marketing-overview`);
    if (!response.ok) throw new Error('Failed to fetch marketing overview');
    return (await response.json()).marketing_overview;
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

  // --- Startup Dashboard Create/Update Endpoints ---

  async createTask(startupId: number, data: any) {
    return this.post(`/startups/${startupId}/tasks`, data);
  }

  async createExperiment(startupId: number, data: any) {
    return this.post(`/startups/${startupId}/experiments`, data);
  }

  async createArtifact(startupId: number, data: any) {
    return this.post(`/startups/${startupId}/artifacts`, data);
  }

  async createProduct(startupId: number, data: any) {
    return this.post(`/startups/${startupId}/products`, data);
  }

  async createFeature(startupId: number, productId: number, data: any) {
    return this.post(`/startups/${startupId}/products/${productId}/features`, data);
  }

  async createMetric(startupId: number, productId: number, data: any) {
    return this.post(`/startups/${startupId}/products/${productId}/metrics`, data);
  }

  async createIssue(startupId: number, productId: number, data: any) {
    return this.post(`/startups/${startupId}/products/${productId}/issues`, data);
  }

  async createMonthlyReport(startupId: number, data: any) {
    return this.post(`/startups/${startupId}/monthly-reports`, data);
  }

  async createFundingRound(startupId: number, data: any) {
    return this.post(`/startups/${startupId}/funding-rounds`, data);
  }

  async createInvestor(startupId: number, data: any) {
    return this.post(`/startups/${startupId}/investors`, data);
  }

  async createCampaign(startupId: number, data: any) {
    return this.post(`/startups/${startupId}/campaigns`, data);
  }

  async updateCampaign(startupId: number, campaignId: number, data: Partial<MarketingCampaign>) {
    const response = await this.put(`/startups/${startupId}/campaigns/${campaignId}`, data);
    return response.campaign;
  }

  async updateFounder(startupId: number, founderId: number, data: Partial<Founder>) {
    const response = await this.put(`/startups/${startupId}/founders/${founderId}`, data);
    return response.founder; // Assuming backend returns updated founder directly
  }

  async deleteFounder(startupId: number, founderId: number) {
    const response = await this.fetch(`/startups/${startupId}/founders/${founderId}`, {
        method: 'DELETE',
    });
    return response.json(); // Assuming backend returns a success message
  }

  async updateProduct(startupId: number, productId: number, data: Partial<Product>) {
    const response = await this.put(`/startups/${startupId}/products/${productId}`, data);
    return response.product; // Assuming backend returns updated product directly
  }

  async updateProductBusinessDetails(startupId: number, productId: number, data: Partial<ProductBusinessDetails>) {
    const response = await this.put(`/startups/${startupId}/products/${productId}/business-details`, data);
    return response.product_business_details; // Assuming backend returns updated product_business_details directly
  }

  async updateFundingRound(startupId: number, roundId: number, data: Partial<FundingRound>) {
    const response = await this.put(`/startups/${startupId}/funding-rounds/${roundId}`, data);
    return response.round; // Assuming backend returns updated round directly
  }

  async updateMetric(startupId: number, productId: number, metricId: number, data: Partial<ProductMetric>) {
    const response = await this.put(`/startups/${startupId}/products/${productId}/metrics/${metricId}`, data);
    return response.metric; // Assuming backend returns updated metric directly
  }

  async createContentItem(startupId: number, campaignId: number, data: any) {
    return this.post(`/startups/${startupId}/campaigns/${campaignId}/content-items`, data);
  }

  async createFounder(startupId: number, data: any) {
    return this.post(`/startups/${startupId}/founders`, data);
  }

  async updateStartupSettings(startupId: number, data: any) {
    return this.put(`/startups/${startupId}/settings`, data);
  }

  async updateBusinessOverview(startupId: number, data: Partial<BusinessOverview>) {
    const response = await this.put(`/startups/${startupId}/business-overview`, data);
    return response.business_overview; // Assuming backend returns updated business_overview directly
  }

  async updateFundraisingGoals(
    startupId: number, 
    fundraiseData: Partial<Fundraise>, 
    nextFundingGoalData: Partial<NextFundingGoal>
  ) {
    const response = await this.put(`/startups/${startupId}/fundraise-details`, { 
        fundraise: fundraiseData, 
        next_funding_goal: nextFundingGoalData 
    });
    return response; // Assuming backend returns both updated fundraise and next_funding_goal
  }

  // Other methods...
}

const api = new Api();
export default api;