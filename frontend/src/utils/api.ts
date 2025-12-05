// src/utils/api.ts
import { MarketingCampaign, Founder, Product, ProductBusinessDetails, FundingRound, ProductMetric, BusinessOverview, Fundraise, NextFundingGoal, ActivityLog, DashboardNotification } from '../types/dashboard-types';

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
          const errorMessage = errorData.error || errorData.msg || 'An API error occurred';
          const error: any = new Error(errorMessage);
          error.status = response.status;
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
    await this.createActivity({
      user_id: 1, // Admin or Founder
      startup_id: startupId,
      action: 'created',
      target_type: 'Task',
      target_id: response.task.id,
      details: data.name
    });
    return response;
  }

  async createExperiment(startupId: number, data: any) {
    const response = await this.post(`/startups/${startupId}/experiments`, data);
    await this.createActivity({
      user_id: 1, // Admin or Founder
      startup_id: startupId,
      action: 'created',
      target_type: 'Experiment',
      target_id: response.experiment.id,
      details: data.name
    });
    return response;
  }

  async createArtifact(startupId: number, data: any) {
    const response = await this.post(`/startups/${startupId}/artifacts`, data);
    await this.createActivity({
      user_id: 1, // Admin or Founder
      startup_id: startupId,
      action: 'created',
      target_type: 'Artifact',
      target_id: response.artifact.id,
      details: data.name
    });
    return response;
  }

  async createProduct(startupId: number, data: any) {
    const response = await this.post(`/startups/${startupId}/products`, data);
    await this.createActivity({
      user_id: 2, // Founder
      startup_id: startupId,
      action: 'created',
      target_type: 'Product',
      target_id: response.product.id,
      details: data.name
    });
    return response;
  }

  async createFeature(startupId: number, productId: number, data: any) {
    const response = await this.post(`/startups/${startupId}/products/${productId}/features`, data);
    await this.createActivity({
      user_id: 2, // Founder
      startup_id: startupId,
      action: 'added',
      target_type: 'Feature',
      target_id: response.feature.id,
      details: data.name
    });
    return response;
  }

  async createMetric(startupId: number, productId: number, data: any) {
    const response = await this.post(`/startups/${startupId}/products/${productId}/metrics`, data);
    await this.createActivity({
      user_id: 2, // Founder
      startup_id: startupId,
      action: 'added',
      target_type: 'Metric',
      target_id: response.metric.id,
      details: data.name
    });
    return response;
  }

  async createIssue(startupId: number, productId: number, data: any) {
    const response = await this.post(`/startups/${startupId}/products/${productId}/issues`, data);
    await this.createActivity({
      user_id: 2, // Founder
      startup_id: startupId,
      action: 'reported',
      target_type: 'Issue',
      target_id: response.issue.id,
      details: data.title
    });
    return response;
  }

  async createMonthlyReport(startupId: number, data: any) {
    const response = await this.post(`/startups/${startupId}/monthly-reports`, data);
    await this.createActivity({
      user_id: 2, // Founder
      startup_id: startupId,
      action: 'submitted',
      target_type: 'Report',
      target_id: response.report.id,
      details: `Report for ${data.month}`
    });
    await this.createNotification({
      user_id: 1, // Admin
      title: 'Monthly Report Submitted',
      message: `Startup has submitted a monthly report for ${data.month}.`,
      type: 'info'
    });
    return response;
  }

  async createFundingRound(startupId: number, data: any) {
    const response = await this.post(`/startups/${startupId}/funding-rounds`, data);
    await this.createActivity({
      user_id: 2, // Founder
      startup_id: startupId,
      action: 'added',
      target_type: 'Funding',
      target_id: response.round.id,
      details: `${data.round_type} Round`
    });
    return response;
  }

  async createInvestor(startupId: number, data: any) {
    const response = await this.post(`/startups/${startupId}/investors`, data);
    await this.createActivity({
      user_id: 2, // Founder
      startup_id: startupId,
      action: 'added',
      target_type: 'Investor',
      target_id: response.investor.id,
      details: data.name
    });
    return response;
  }

  async createCampaign(startupId: number, data: any) {
    const response = await this.post(`/startups/${startupId}/campaigns`, data);
    await this.createActivity({
      user_id: 2, // Founder
      startup_id: startupId,
      action: 'created',
      target_type: 'Campaign',
      target_id: response.campaign.id,
      details: data.campaign_name
    });
    return response;
  }

  async updateCampaign(startupId: number, campaignId: number, data: Partial<MarketingCampaign>) {
    const response = await this.put(`/startups/${startupId}/campaigns/${campaignId}`, data);
    await this.createActivity({
      user_id: 2, // Founder
      startup_id: startupId,
      action: 'updated',
      target_type: 'Campaign',
      target_id: campaignId,
      details: `Campaign updated`
    });
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

  async createFounder(startupId: number, data: any) {
    const response = await this.post(`/startups/${startupId}/founders`, data);
    await this.createActivity({
      user_id: 2, // Founder
      startup_id: startupId,
      action: 'added',
      target_type: 'Founder',
      target_id: response.founder.id,
      details: `${data.first_name} ${data.last_name}`
    });
    return response;
  }

  async updateStartupSettings(startupId: number, data: any) {
    const response = await this.put(`/startups/${startupId}/settings`, data);
    await this.createActivity({
      user_id: 2, // Founder
      startup_id: startupId,
      action: 'updated',
      target_type: 'Settings',
      target_id: startupId,
      details: 'Startup settings updated'
    });
    return response;
  }

  async updateBusinessOverview(startupId: number, data: Partial<BusinessOverview>) {
    const response = await this.put(`/startups/${startupId}/business-overview`, data);
    await this.createActivity({
      user_id: 2, // Founder
      startup_id: startupId,
      action: 'updated',
      target_type: 'Overview',
      target_id: startupId,
      details: 'Business overview updated'
    });
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
    await this.createActivity({
      user_id: 2, // Founder
      startup_id: startupId,
      action: 'updated',
      target_type: 'Fundraising',
      target_id: startupId,
      details: 'Fundraising goals updated'
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
}

export default new Api();