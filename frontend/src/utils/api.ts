// src/utils/api.ts
import { MarketingCampaign, Founder, Product, ProductBusinessDetails, FundingRound, ProductMetric, BusinessOverview, Fundraise, NextFundingGoal, ActivityLog, DashboardNotification } from '../types/dashboard-types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const getWebSocketUrl = (endpoint: string) => {
  // If API_BASE_URL is a full URL (e.g. http://1.2.3.4/api), parse it
  if (API_BASE_URL.startsWith('http')) {
    const url = new URL(API_BASE_URL);
    const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    // Remove /api if it exists at the end of pathname for the WS base
    const basePath = url.pathname.replace(/\/api\/?$/, '');
    return `${protocol}//${url.host}${basePath}${endpoint}`;
  }

  // If API_BASE_URL is relative (e.g. /api), use window.location
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${endpoint}`;
};

class Api {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  private async fetch(url: string, options: RequestInit = {}) {
    const token = localStorage.getItem('access_token');

    const headers: any = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // If body is FormData, don't set Content-Type (browser will do it)
    if (options.body instanceof FormData) {
      delete headers['Content-Type'];
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
          const errorMessage = errorData.error || errorData.msg || 'An API error occurred';
          const error: any = new Error(errorMessage);
          error.status = response.status;
          error.response = { data: errorData }; // Attach response data for error handling
          throw error;
        } else {
          const errorText = await response.text();
          console.error('Non-JSON error from backend:', errorText);
          const error: any = new Error(`Server returned an error: ${response.status} ${response.statusText}`);
          error.status = response.status;
          throw error;
        }
      }

      return response;
    } catch (error) {
      throw error;
    }
  }

  async get<T = any>(url: string, options: RequestInit = {}): Promise<T> {
    const response = await this.fetch(url, options);
    return response.json();
  }

  async post<T = any>(url: string, body: any, options: RequestInit = {}): Promise<T> {
    const response = await this.fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      ...options,
    });
    return response.json();
  }


  async put<T = any>(url: string, body: any, options: RequestInit = {}): Promise<T> {
    const response = await this.fetch(url, {
      method: 'PUT',
      body: JSON.stringify(body),
      ...options,
    });
    return response.json();
  }

  async delete<T = any>(url: string, options: RequestInit = {}): Promise<T> {
    const response = await this.fetch(url, {
      method: 'DELETE',
      ...options,
    });
    return response.json();
  }

  async request(method: string, url: string, body?: any, options: RequestInit = {}) {
    const fetchOptions: RequestInit = {
      method,
      ...options,
    };
    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }
    const response = await this.fetch(url, fetchOptions);
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

  async submitSubmission(submissionId: number) {
    return this.post(`/submissions/${submissionId}/submit`, {});
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

  getAssetUrl(path: string | null | undefined): string | undefined {
    if (!path) return undefined;
    if (path.startsWith('http')) return path;

    // If API_BASE_URL is a full URL, use its origin for assets
    if (API_BASE_URL.startsWith('http')) {
      try {
        const url = new URL(API_BASE_URL);
        return `${url.origin}${path}`;
      } catch (e) {
        console.warn('Invalid API_BASE_URL, falling back to relative path:', e);
      }
    }

    // Otherwise return relative path; Vite proxy or production server will handle it
    return path;
  }

  async uploadFile(url: string, formData: FormData) {
    const response = await this.fetch(url, {
      method: 'POST',
      body: formData,
    });
    return response.json();
  }

  async uploadLogo(startupId: number, formData: FormData) {
    const response = await this.fetch(`/startups/${startupId}/logo`, {
      method: 'POST',
      body: formData,
      headers: {
        // Let the browser set the Content-Type with boundary for FormData
      },
    });
    return response.json();
  }

  async deleteLogo(startupId: number) {
    return this.delete(`/startups/${startupId}/logo`);
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
    return response.comment;
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

  async getDashboardOverview(startupId: number) {
    const response = await this.fetch(`/startups/${startupId}/dashboard-overview`);
    if (!response.ok) throw new Error('Failed to fetch dashboard overview');
    return (await response.json()).dashboard_overview;
  }

  async getProducts(startupId: number) {
    const response = await this.fetch(`/startups/${startupId}/products`);
    if (!response.ok) throw new Error('Failed to fetch products');
    return (await response.json()).products;
  }

  async getCampaigns(startupId: number) {
    const response = await this.fetch(`/startups/${startupId}/campaigns`);
    if (!response.ok) throw new Error('Failed to fetch campaigns');
    return (await response.json()).campaigns;
  }

  async recalculateCampaignMetrics(startupId: number) {
    const response = await this.post(`/startups/${startupId}/marketing/recalculate-metrics`, {});
    return response;
  }

  async getTasks(startupId: number) {
    const response = await this.fetch(`/startups/${startupId}/tasks`);
    if (!response.ok) throw new Error('Failed to fetch tasks');
    return (await response.json()).tasks;
  }

  async getBusinessMonthlyReports(startupId: number) {
    const response = await this.fetch(`/startups/${startupId}/monthly-reports`);
    if (!response.ok) throw new Error('Failed to fetch monthly reports');
    return (await response.json()).reports;
  }

  async getBusinessOverview(startupId: number) {
    const response = await this.fetch(`/startups/${startupId}/business-overview`);
    if (!response.ok) throw new Error('Failed to fetch business overview');
    return (await response.json()).business_overview;
  }

  async getFundingRounds(startupId: number) {
    const response = await this.fetch(`/startups/${startupId}/funding-rounds`);
    if (!response.ok) throw new Error('Failed to fetch funding rounds');
    return (await response.json()).rounds;
  }

  async getFundraiseDetails(startupId: number) {
    const response = await this.fetch(`/startups/${startupId}/fundraise-details`);
    if (!response.ok) throw new Error('Failed to fetch fundraise details');
    return await response.json();
  }

  async getInvestors(startupId: number) {
    const response = await this.fetch(`/startups/${startupId}/investors`);
    if (!response.ok) throw new Error('Failed to fetch investors');
    return (await response.json()).investors;
  }

  async getGlobalInvestors(
    startupId: number,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      bioKeywords?: string;
      investmentKeywords?: string;
      types?: string;
      sectors?: string;
      stages?: string;
      locations?: string;
      minCheck?: number;
      maxCheck?: number;
      sortBy?: string;
      order?: 'asc' | 'desc';
    } = {}
  ) {
    const params = new URLSearchParams();

    // Pagination
    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());

    // Search
    if (options.search) params.append('search', options.search);
    if (options.bioKeywords) params.append('bio_keywords', options.bioKeywords);
    if (options.investmentKeywords) params.append('investment_keywords', options.investmentKeywords);

    // Filters
    if (options.types) params.append('types', options.types);
    if (options.sectors) params.append('sectors', options.sectors);
    if (options.stages) params.append('stages', options.stages);
    if (options.locations) params.append('locations', options.locations);
    if (options.minCheck) params.append('min_check', options.minCheck.toString());
    if (options.maxCheck) params.append('max_check', options.maxCheck.toString());

    // Sorting
    if (options.sortBy) params.append('sort_by', options.sortBy);
    if (options.order) params.append('order', options.order);

    const response = await this.fetch(`/startups/${startupId}/global-investors?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch global investors');
    const data = await response.json();
    return {
      investors: data.investors,
      pagination: data.pagination
    };
  }

  async getRecommendedInvestors(startupId: number) {
    const response = await this.fetch(`/startups/${startupId}/global-investors/recommended`);
    if (!response.ok) throw new Error('Failed to fetch recommended investors');
    const data = await response.json();
    return data;
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
    const response = await this.put(`/admin/submissions/${submissionId}/status`, { status: newStatus });
    await this.createActivity({
      user_id: 1, // Admin
      startup_id: response.submission.startup_id,
      action: 'updated status for',
      target_type: 'Submission',
      target_id: submissionId,
      details: `Status updated to ${newStatus}`
    });
    await this.createNotification({
      user_id: response.submission.user_id,
      title: 'Submission Status Updated',
      message: `Your submission status has been updated to ${newStatus}.`,
      type: 'info'
    });
    return response;
  }

  async getAllUsers() {
    const data = await this.get('/admin/users');
    return data.users;
  }

  async updateUserRole(userId: number, newRole: string) {
    return this.put(`/admin/users/${userId}/role`, { role: newRole });
  }

  async updateScopeStatus(startupId: number, status: string) {
    const response = await this.put(`/admin/scope/${startupId}/status`, { status });
    await this.createActivity({
      user_id: 1, // Admin
      startup_id: startupId,
      action: 'updated status for',
      target_type: 'Scope',
      target_id: startupId,
      details: `Scope status updated to ${status}`
    });
    return response;
  }

  async addAdminScopeComment(startupId: number, text: string, sectionId: string) {
    return this.post(`/admin/scope/${startupId}/comments`, { text, section_id: sectionId });
  }

  async updateContractStatus(startupId: number, newStatus: string) {
    return this.put(`/admin/contract/${startupId}/status`, { status: newStatus });
  }

  async addContractSignatory(startupId: number, name: string, email: string) {
    return this.post(`/admin/contract/${startupId}/signatories`, { name, email });
  }

  async addContractComment(startupId: number, text: string) {
    return this.post(`/admin/contract/${startupId}/comments`, { text });
  }

  // --- Startup Dashboard Create/Update Endpoints ---

  async createTask(startupId: number, data: any) {
    const response = await this.post(`/startups/${startupId}/tasks`, data);
    return response.task;
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

  async createExperiment(startupId: number, data: any) {
    const response = await this.post(`/startups/${startupId}/experiments`, data);
    return response.experiment;
  }

  async createArtifact(startupId: number, data: {
    name: string;
    type: string;
    location: string;
    scope?: string;
    description?: string;
    linked_to_type?: string;
    linked_to_id?: number;
  }) {
    const response = await this.post(`/startups/${startupId}/artifacts`, data);
    return response.artifact;
  }

  // --- DELETE Methods ---

  async deleteTask(startupId: number, taskId: number) {
    return this.delete(`/startups/${startupId}/tasks/${taskId}`);
  }

  async deleteExperiment(startupId: number, experimentId: number) {
    return this.delete(`/startups/${startupId}/experiments/${experimentId}`);
  }

  async deleteFeature(startupId: number, productId: number, featureId: number) {
    return this.delete(`/startups/${startupId}/products/${productId}/features/${featureId}`);
  }

  async deleteMetric(startupId: number, productId: number, metricId: number) {
    return this.delete(`/startups/${startupId}/products/${productId}/metrics/${metricId}`);
  }

  async deleteIssue(startupId: number, productId: number, issueId: number) {
    return this.delete(`/startups/${startupId}/products/${productId}/issues/${issueId}`);
  }

  // NEW: For FILE uploads with FormData
  async createArtifactWithFile(
    startupId: number,
    formData: FormData,
    onProgress?: (progress: number) => void
  ) {
    const token = localStorage.getItem('access_token');

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            onProgress(percentComplete);
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText);
          resolve(response.artifact);
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('POST', `${this.baseURL}/startups/${startupId}/artifacts`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });
  }

  // NEW: Get download URL for FILE artifacts
  async getArtifactDownloadUrl(startupId: number, artifactId: number) {
    const response = await this.fetch(`/startups/${startupId}/artifacts/${artifactId}/download`);
    if (!response.ok) throw new Error('Failed to get download URL');
    return await response.json();
  }

  // NEW: Delete artifact (soft delete + S3 cleanup)
  async deleteArtifact(startupId: number, artifactId: number) {
    const response = await this.delete(`/startups/${startupId}/artifacts/${artifactId}`);
    return response;
  }

  async createProduct(startupId: number, data: any) {
    const response = await this.post(`/startups/${startupId}/products`, data);
    return response.product;
  }

  async createFeature(startupId: number, productId: number, data: any) {
    const response = await this.post(`/startups/${startupId}/products/${productId}/features`, data);
    return response.feature;
  }

  async createMetric(startupId: number, productId: number, data: any) {
    const response = await this.post(`/startups/${startupId}/products/${productId}/metrics`, data);
    return response.metric;
  }

  async createIssue(startupId: number, productId: number, data: any) {
    const response = await this.post(`/startups/${startupId}/products/${productId}/issues`, data);
    return response.issue;
  }

  async createMonthlyReport(startupId: number, data: any) {
    const response = await this.post(`/startups/${startupId}/monthly-reports`, data);
    return response.report;
  }

  async createFundingRound(startupId: number, data: any) {
    const response = await this.post(`/startups/${startupId}/funding-rounds`, data);
    return response.round;
  }

  async createInvestor(startupId: number, data: any) {
    const response = await this.post(`/startups/${startupId}/investors`, data);
    return response.investor;
  }

  async updateInvestor(startupId: number, investorId: number, data: any) {
    const response = await this.put(`/startups/${startupId}/investors/${investorId}`, data);
    return response.investor;
  }

  async getInvestorInteractions(startupId: number, investorId: number) {
    const response = await this.fetch(`/startups/${startupId}/investors/${investorId}/interactions`);
    if (!response.ok) throw new Error('Failed to fetch interactions');
    return (await response.json()).interactions;
  }

  async logInteraction(startupId: number, investorId: number, data: any) {
    const response = await this.post(`/startups/${startupId}/investors/${investorId}/interactions`, data);
    return response.interaction;
  }

  async createCampaign(startupId: number, data: any) {
    const response = await this.post(`/startups/${startupId}/campaigns`, data);
    return response.campaign;
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

  async updateFeature(startupId: number, productId: number, featureId: number, data: Partial<any>) {
    const response = await this.put(`/startups/${startupId}/products/${productId}/features/${featureId}`, data);
    return response.feature;
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

  async updateContentItem(startupId: number, contentId: number, data: any) {
    const response = await this.put(`/startups/${startupId}/content-items/${contentId}`, data);
    return response.content_item;
  }

  async deleteContentItem(startupId: number, contentId: number) {
    const response = await this.fetch(`/startups/${startupId}/content-items/${contentId}`, {
      method: 'DELETE',
    });
    return response.json();
  }

  async generateContentItem(startupId: number, contentId: number) {
    const response = await this.post(`/startups/${startupId}/content-items/${contentId}/generate`, {});
    return response.content_item;
  }

  async createFounder(startupId: number, data: any) {
    const response = await this.post(`/startups/${startupId}/founders`, data);
    return response.founder;
  }

  async updateStartupSettings(startupId: number, data: any) {
    const response = await this.put(`/startups/${startupId}/settings`, data);
    return response;
  }

  async getMarketingSettings(startupId: number) {
    const response = await this.fetch(`/startups/${startupId}/settings`);
    if (!response.ok) throw new Error('Failed to fetch marketing settings');
    return (await response.json()).settings;
  }

  async updateMarketingSettings(startupId: number, data: any) {
    const response = await this.post(`/startups/${startupId}/settings`, data);
    return response.setting;
  }

  async initiateGetLateAuth(startupId: number, provider: string) {
    const response = await this.get(`/startups/${startupId}/marketing/${provider}/connect`);
    return response.auth_url;
  }

  async listEntities(startupId: number, provider: string, connectToken: string, orgIds?: string, organizations?: string) {
    const response = await this.post(`/startups/${startupId}/marketing/${provider}/list-entities`, {
      connect_token: connectToken,
      orgIds: orgIds,
      organizations: organizations
    });
    return response.data;
  }

  async finalizeConnection(startupId: number, provider: string, connectToken: string, selectedId: string, selectedName?: string, userProfile?: any, profileId?: string, refreshToken?: string) {
    const response = await this.post(`/startups/${startupId}/marketing/${provider}/finalize`, {
      connect_token: connectToken,
      selected_id: selectedId,
      selected_name: selectedName,
      userProfile: userProfile,
      profileId: profileId,
      refreshToken: refreshToken
    });
    return response;
  }

  async initiateLinkedInAuth(startupId: number) {
    // Legacy method - kept for reference or backwards compatibility until fully migrated
    const response = await this.post(`/startups/${startupId}/marketing/linkedin/authorize`, {});
    return response.auth_url;
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

    return response;
  }

  // Other methods...
  // --- Activity and Notifications (Mocked) ---
  async getRecentActivity(startupId?: number) {
    const url = startupId ? `/startups/${startupId}/activity` : '/admin/activity';
    const data = await this.get(url);
    return data.activity;
  }

  async getNotifications() {
    const data = await this.get('/notifications');
    return data.notifications;
  }

  async markNotificationAsRead(id: number) {
    return this.put(`/notifications/${id}/read`, {});
  }

  async createActivity(data: Omit<ActivityLog, 'id' | 'created_at'>) {
    return this.post('/admin/activity', data);
  }

  async createNotification(data: Omit<DashboardNotification, 'id' | 'created_at' | 'read'>) {
    return this.post('/notifications', data);
  }

  async acceptScope(startupId?: number) {
    return this.post('/stages/scope/accept', { startup_id: startupId });
  }

  async updateScopeDocument(startupId: number, content: string) {
    return this.put('/stages/scope', { startup_id: startupId, content });
  }

  async updateContract(startupId: number, data: { documentUrl?: string; status?: string; content?: string }) {
    return this.put('/stages/contract', { startup_id: startupId, ...data });
  }

  async acceptContract(startupId?: number) {
    return this.post('/stages/contract/accept', { startup_id: startupId });
  }

  async addContractSignatoryFounder(name: string, email: string) {
    return this.post('/stages/contract/signatories', { name, email });
  }

  async addContractCommentFounder(text: string) {
    return this.post('/stages/contract/comments', { text });
  }

  async signDocument(contractId: number) {
    return this.post('/stages/contract/sign', { contract_id: contractId });
  }

  async generateAssets(startupId: number, generateProduct: boolean, generateGtm: boolean) {
    return this.post(`/startups/${startupId}/assets/generate`, { generate_product: generateProduct, generate_gtm: generateGtm });
  }

  async createInvestment(startupId: number, roundId: number, investorId: number, amountInvested: number, shares?: number) {
    return this.post(`/startups/${startupId}/funding-rounds/${roundId}/investments`, {
      investor_id: investorId,
      amount_invested: amountInvested,
      shares: shares
    });
  }
  async addTeamMember(startupId: number, data: any) {
    const response = await this.post(`/startups/${startupId}/team`, data);
    return response;
  }

  async getTeamMembers(startupId: number) {
    const response = await this.fetch(`/startups/${startupId}/team`);
    if (!response.ok) throw new Error('Failed to fetch team members');
    return (await response.json()).members;
  }

  async removeTeamMember(startupId: number, userId: number) {
    const response = await this.fetch(`/startups/${startupId}/team/${userId}`, {
      method: 'DELETE',
    });
    return response.json();
  }

  async updateTeamMember(startupId: number, userId: number, data: any) {
    const response = await this.put(`/startups/${startupId}/team/${userId}`, data);
    return response;
  }

  // --- AI Assistant ---
  async askAiAssistant(startupId: number, query: string, history: any[] = []) {
    return this.post('/ai/chat', { startup_id: startupId, query, history });
  }

  // --- Cap Table & Scenarios ---
  async getCapTable(startupId: number) {
    const response = await this.fetch(`/startups/${startupId}/cap-table`);
    if (!response.ok) throw new Error('Failed to fetch cap table');
    return (await response.json()).cap_table;
  }

  async addCapTableEntry(startupId: number, data: any) {
    const response = await this.post(`/startups/${startupId}/cap-table`, data);
    return response.entry;
  }

  async deleteCapTableEntry(startupId: number, entryId: number) {
    return this.fetch(`/startups/${startupId}/cap-table/${entryId}`, {
      method: 'DELETE',
    });
  }

  async calculateDilution(startupId: number, newInvestment: number, preMoneyValuation: number) {
    const response = await this.post(`/startups/${startupId}/scenarios/calculate-dilution`, {
      new_investment: newInvestment,
      pre_money_valuation: preMoneyValuation
    });
    return response.scenario;
  }
}

export default new Api();