export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export enum SubmissionStatus {
  DRAFT = 'DRAFT',
  FINALIZE_SUBMISSION = 'FINALIZE_SUBMISSION',
  PENDING = 'PENDING',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum StartupStatus {
  INACTIVE = 'inactive',
  ACTIVE = 'active',
  INCUBATING = 'incubating',
  GRADUATED = 'graduated',
  ARCHIVED = 'archived',
}

export enum StartupStage {
  EVALUATION = 'EVALUATION',
  ADMITTED = 'ADMITTED',
  IDEA = 'IDEA',
  MVP = 'MVP',
  GROWTH = 'GROWTH',
}

export enum InvestorStage {
  PROSPECT = 'PROSPECT',
  CONTACTED = 'CONTACTED',
  MEETING = 'MEETING',
  DUE_DILIGENCE = 'DUE_DILIGENCE',
  TERM_SHEET = 'TERM_SHEET',
  COMMITTED = 'COMMITTED',
  PASSED = 'PASSED',
  PORTFOLIO = 'PORTFOLIO',
}

export enum ProductStage {
  CONCEPT = 'concept',
  DEVELOPMENT = 'development',
  BETA = 'beta',
  LIVE = 'live',
}

export enum MarketingCampaignStatus {
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED',
}

export enum MarketingContentStatus {
  PLANNED = 'PLANNED',
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CANCELLED = 'CANCELLED',
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export enum ExperimentStatus {
  PLANNED = 'planned',
  RUNNING = 'running',
  COMPLETED = 'completed',
}

export enum ArtifactType {
  FILE = 'file',
  LINK = 'link',
  TEXT = 'text',
}

export enum Scope {
  GENERAL = 'general',
  PRODUCT = 'product',
  FUNDRAISING = 'fundraise',
  MARKETING = 'marketing',
  ACCOUNTING = 'accounting',
  BUSINESS = 'business',
  DASHBOARD = 'Dashboard', // UI specific Scope
  WORKSPACE = 'Workspace', // UI specific Scope
  TEAM = 'Team', // UI specific Scope
  SETTINGS = 'Settings', // UI specific Scope
  USER_SETTINGS = 'USER_SETTINGS',
  EMAIL = 'EMAIL',
  CHAT = 'Chat',
  CRM = 'crm',
}

export enum ScopeStatus {
  DRAFT = 'DRAFT',
  PROPOSED = 'PROPOSED',
  IN_DISCUSSION = 'IN_DISCUSSION',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export enum ContractStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  SIGNED = 'SIGNED',
  ACCEPTED = 'ACCEPTED',
}

export type LinkedEntityType = 'Product' | 'FundingRound' | 'MarketingCampaign';

export interface ContractComment {
  id: number;
  contract_id: number;
  user_id: number;
  author_name: string;
  text: string;
  created_at: string;
}

export interface ContractSignatory {
  id: number;
  contract_id: number;
  user_id?: number; // Optional, if it's an external signatory
  email: string;
  name: string;
  status: 'Not Signed' | 'Signed';
  signed_at?: string;
}

export interface Contract {
  id: number;
  startup_id: number;
  title: string;
  content?: string; // New field for generated contract text
  document_url?: string; // Made optional as content will be primary
  status: ContractStatus;
  founder_accepted?: boolean;
  admin_accepted?: boolean;
  sent_at?: string;
  signed_at?: string;
  signatories: ContractSignatory[];
  comments: ContractComment[]; // New field for contract comments
}

export interface Comment {
  id: number;
  author: 'Admin' | 'Founder';
  text: string;
  createdAt: string;
  section_id?: string;
}

export interface ScopeSection {
  id: string;
  title: string;
  content: string[];
  comments: Comment[];
}

export interface ScopeDocument {
  id: number;
  startup_id: number;
  title: string;
  version: string;
  status: ScopeStatus;
  content: string;
  founder_accepted?: boolean;
  admin_accepted?: boolean;
  comments: Comment[];
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: number;
  name: string;
  slug?: string;
  invite_code: string;
  logo_url?: string;
  created_at: string;
}

export interface User {
  id: number;
  firebase_uid: string;
  email: string;
  phone_number?: string;
  mobile?: string;
  email_verified: boolean;
  phone_verified: boolean;
  full_name: string;
  is_verified: boolean;
  role: UserRole | string; // Allow string for compatibility
  created_at: string;
  token?: string;
  organization_id?: number;
  organization?: Organization;
  startup_id?: number | null;
  scopes?: string[];
}

export interface Submission {
  id: number;
  user_id: number;
  user: User;
  startup_name: string;
  founders_and_inspiration: string;
  problem_statement: string;
  who_experiences_problem: string;
  product_service_idea: string;
  how_solves_problem: string;
  intended_users_customers: string;
  main_competitors_alternatives: string;
  how_stands_out: string;
  startup_type: string;
  status: SubmissionStatus;
  submitted_at: string;
  raw_chat_data?: Record<string, any>;
  evaluation?: Evaluation;
}

export interface Evaluation {
  id: number;
  submission_id: number;
  problem_analysis: Record<string, any>;
  solution_analysis: Record<string, any>;
  market_analysis: Record<string, any>;
  growth_analysis: Record<string, any>;
  competitor_analysis: Record<string, any>;
  risks_analysis: Record<string, any>;
  overall_score: number;
  final_decision: string;
  overall_summary: string;
  created_at: string;
}

export interface ProductMetric {
  metric_id: number;
  product_id: number;
  metric_name: string;
  value: number;
  target_value?: number;
  unit: string;
  period: string;
  date_recorded: string;
  created_at: string;
}

export interface ProductIssue {
  issue_id: number;
  product_id: number;
  title: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'In Progress' | 'Resolved';
  created_by: number;
  created_at: string;
  resolved_at?: string;
}

export enum FeatureStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export interface Feature {
  id: number;
  product_id: number;
  name: string;
  description: string;
  acceptance_criteria?: string;
  status: FeatureStatus;
}


export type BusinessModelType = 'SUBSCRIPTION' | 'TRANSACTIONAL' | 'SERVICE' | 'MARKETPLACE' | 'ADVERTISING' | 'HYBRID';

export interface ProductBusinessDetails {
  product_business_id: number;
  product_id: number;
  model_type: BusinessModelType;
  model_config?: any; // JSON structure for model-specifics
  revenue_account_id?: number;
  revenue_account_name?: string;
  cost_account_id?: number;
  cost_account_name?: string;
  pricing_model?: string;
  target_customer?: string;
  revenue_streams?: string;
  distribution_channels?: string;
  cost_structure?: string;
  created_at: string;
  updated_at: string;
}


export enum BusinessModelStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
}

export interface BusinessModel {
  id: number;
  startup_id: number;
  name: string;
  description?: string;
  model_type: BusinessModelType;
  model_config?: any;
  revenue_account_id?: number;
  revenue_account_name?: string;
  cost_account_id?: number;

  cost_account_name?: string;
  status: BusinessModelStatus;

  // Proforma
  target_arpu?: number;
  target_cac?: number;
  target_margin?: number;

  created_at: string;
  updated_at: string;

  // Analytics fields (calculated from transactions)
  actual_revenue?: number;
  actual_cost?: number;
  actual_quantity?: number;
  actual_arpu?: number;
  actual_margin?: number;
  transaction_count?: number;
}

export interface Product {
  id: number;
  startup_id: number;
  name: string;
  description: string;
  stage: ProductStage;
  version: string;
  targeted_launch_date?: string;
  actual_launch_date?: string;
  customer_segment?: string;
  unique_value_prop?: string;
  tech_stack?: string[];
  features: Feature[];
  product_metrics: ProductMetric[];
  product_issues: ProductIssue[];
  business_details?: ProductBusinessDetails;
  marketing_campaigns: MarketingCampaign[];
}

export interface BusinessOverview {
  business_id: number;
  startup_id: number;
  business_model?: string;
  key_partners?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface BusinessMonthlyData {
  record_id: number;
  startup_id: number;
  month_start: string;
  total_revenue: number;
  total_expenses: number;
  net_burn: number;
  cash_in_bank?: number;
  mrr: number;
  churn_rate?: number;
  new_customers: number;
  total_customers: number;
  key_highlights: string;
  key_challenges?: string;
  next_focus?: string;
  created_by: number;
  created_at: string;
}

export interface BrandDetails {
  tone_of_voice: string;
  brand_archetype: string;
  target_audience: string[];
  key_messaging_pillars: string[];
}

export interface MarketingOverview {
  marketing_id: number;
  startup_id: number;
  positioning_statement?: string;
  brand_details?: BrandDetails;
}

export interface GlobalInvestor {
  id: number;
  name: string;
  firm_name?: string;
  title?: string;
  types?: string[];
  focus_sectors?: string[];
  focus_stages?: string[];
  min_check_size?: number;
  max_check_size?: number;
  sweet_spot?: number;
  locations?: string[];
  website?: string;
  logo_url?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  bio?: string;
  recent_investments?: string;
  meta_data?: {
    profile_sweet_spot?: string;
    profile_range?: string;
    [key: string]: any;
  };
  created_at?: string;
}

export interface Investor {
  investor_id: number;
  startup_id?: number;
  global_investor_id?: number;
  name: string;
  firm_name?: string;
  type: 'Angel' | 'VC' | 'Fund' | 'Accelerator' | string;
  email?: string;
  website?: string;
  notes?: string;
  stage?: InvestorStage;
  check_size_interest?: number;
  total_invested?: number;
  next_action_date?: string;
  next_action_type?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MarketingSettings {
  setting_id: number;
  startup_id: number;
  provider: string; // 'linkedin', 'twitter', 'instagram', 'facebook', 'email_sendgrid', 'email_mailgun'
  is_active: boolean;
  credentials?: Record<string, string>;
  updated_at: string;
}

export interface RoundInvestor {
  investor: Investor;
  amount_invested: number;
  ownership_percent?: number;
  committed_on?: string;
}

export interface FundingRound {
  round_id: number;
  startup_id: number;
  round_type: string;
  status: 'Planned' | 'In Progress' | 'Closed';
  target_amount: number;
  amount_raised: number;
  valuation_pre?: number;
  valuation_post?: number;
  lead_investor?: string;
  date_opened?: string;
  date_closed?: string;
  pitch_deck_url?: string;
  notes?: string;
  created_at?: string;
  investors: RoundInvestor[];
}

export interface MarketingContentItem {
  content_id: number;
  calendar_id: number;
  title: string;
  content_type?: string;
  content_body?: string;
  content_brief?: string;
  channel?: string;
  media_type?: string;
  image_url?: string;
  image_prompt?: string;
  publish_date: string;
  status: MarketingContentStatus;
  performance?: Record<string, any>;
  created_by: number;
  created_at: string;
}

export interface MarketingContentCalendar {
  calendar_id: number;
  campaign_id: number;
  title: string;
  description?: string;
  owner_id: number;
  start_date?: string;
  end_date?: string;
  created_at: string;
  content_items: MarketingContentItem[];
}

export interface MarketingCampaign {
  campaign_id: number;
  startup_id: number;
  scope: string;
  product_id?: number;
  campaign_name: string;
  objective?: string;
  channel?: string;
  start_date?: string;
  end_date?: string;
  spend?: number;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  status: MarketingCampaignStatus;
  notes?: string;
  content_mode: boolean;
  created_by: number;
  created_at: string;
  content_calendars: MarketingContentCalendar[];
}

export interface Task {
  id: number;
  startup_id: number;
  scope: Scope;
  name: string;
  description?: string;
  due_date?: string;
  status: TaskStatus;
  linked_to_id?: number;
  linked_to_type?: string;
  assigned_to?: number;
  assignee?: {
    id: number;
    name: string;
    email: string;
  };
  created_at: string;
}

export interface Experiment {
  id: number;
  startup_id: number;
  scope: Scope;
  name: string;
  description?: string;
  assumption: string;
  validation_method?: string;
  result?: string;
  status: ExperimentStatus;
  linked_to_id?: number;
  linked_to_type?: string;
  created_at: string;
}

export enum StorageBackend {
  LOCAL = 'local',
  S3 = 's3',
  EXTERNAL = 'external',
  INLINE = 'inline',
}

export interface Artifact {
  id: number;
  startup_id: number;
  scope: Scope;
  name: string;
  description?: string;
  type: ArtifactType;
  location: string;
  linked_to_id?: number;
  linked_to_type?: string;
  created_at: string;

  // S3 and file-specific fields (only populated for FILE type)
  storage_backend?: StorageBackend;
  file_size?: number;
  mime_type?: string;
  original_filename?: string;
  s3_bucket?: string;
  s3_key?: string;
  s3_region?: string;
  uploaded_by?: number;
  is_deleted?: boolean;
  file_metadata?: Record<string, any>;
}

export interface Founder {
  id: number;
  startup_id: number;
  name: string;
  role: string;
  email: string;
  phone_number?: string;
  mobile?: string;
  linkedin_link?: string;
}

export interface NextFundingGoal {
  id: number;
  fundraise_id: number;
  target_amount?: number;
  target_valuation?: number;
  target_close_date?: string;
}

export interface Fundraise {
  id: number;
  startup_id: number;
  funding_stage?: string;
  amount_raised?: number;
  next_funding_goal?: NextFundingGoal;
}

export interface TeamMember {
  id: number;
  startup_id: number;
  user_id: number;
  user_email?: string;
  user_name?: string;
  role: string;
  linkedin?: string;
  scopes?: string[];
  created_at?: string;
}

export interface Startup {
  id: number;
  user_id: number;
  submission_id: number;
  name: string;
  slug: string;
  status: StartupStatus;
  current_stage: StartupStage;
  next_milestone: string;
  is_generating_product?: boolean;
  is_generating_gtm?: boolean;
  is_analyzing_submission?: boolean;
  is_generating_scope?: boolean;
  is_generating_contract?: boolean;
  accounting_initialized?: boolean;
  has_product?: boolean;
  has_gtm?: boolean;
  logo_url?: string;
  created_at: string;
  updated_at: string;
  user: User;
  submission: Submission;
  founders: Founder[];
  investors: Investor[];
  products: Product[];
  monthly_data: BusinessMonthlyData[];
  funding_rounds: FundingRound[];
  marketing_campaigns: MarketingCampaign[];
  tasks: Task[];
  experiments: Experiment[];
  artifacts: Artifact[];
  team_members?: TeamMember[];
  marketing_overview?: MarketingOverview;
  business_overview?: BusinessOverview;
  fundraise_details?: Fundraise;
  scope_document?: ScopeDocument;
  contract?: Contract;
  activity?: ActivityLog[];
  notifications?: DashboardNotification[];
  overall_progress?: number;
}

export type FundraiseDetails = Fundraise;

export interface ActivityLog {
  id: number;
  user_id: number;
  startup_id: number;
  action: string;
  target_type: string;
  target_id: number;
  details: string;
  created_at: string;
}

export interface DashboardNotification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  created_at: string;
}

export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export interface Account {
  id: number;
  startup_id: number;
  name: string;
  type: AccountType;
  subtype?: string;
  balance: number;
  created_at: string;
}


export interface JournalLine {
  id: number;
  journal_entry_id: number;
  account_id: number;
  account_name: string;
  debit: number;
  credit: number;
  description?: string;
  business_model_id?: number;
  business_model_name?: string;
}

export interface JournalEntry {
  id: number;
  startup_id: number;
  date: string;
  description?: string;
  reference?: string;
  lines: JournalLine[];
  created_at: string;
}

export interface CapTableEntry {
  id: number;
  stakeholder_name: string;
  stakeholder_type: string;
  shares: number;
  investment_amount: number;
  ownership_percentage?: number;
}

// ============================================================================
// ADMIN ANALYTICS TYPES
// New types for admin dashboard analytics
// ============================================================================

export interface PortfolioMetrics {
  total_revenue: number;
  total_burn: number;
  total_cash: number;
  average_runway: number;
  total_customers: number;
  total_mrr: number;
  total_pipeline_value: number;
  total_startups: number;
  healthy_startups: number;
  warning_startups: number;
  critical_startups: number;
  startup_summaries: StartupSummary[];
}

export interface StartupSummary {
  startup_id: number;
  startup_name: string;
  health_status: 'healthy' | 'warning' | 'critical';
  revenue: number;
  burn_rate: number;
  runway_months: number;
  customer_count: number;
  mrr: number;
  alerts: Alert[];
}

export interface StartupRanking {
  rank: number;
  startup_id: number;
  startup_name: string;
  metric_value: number;
  health_status: 'healthy' | 'warning' | 'critical';
}

export interface Alert {
  type: 'critical' | 'warning' | 'info';
  module: string;
  message: string;
  priority: number;
  startup_id?: number;
  startup_name?: string;
}