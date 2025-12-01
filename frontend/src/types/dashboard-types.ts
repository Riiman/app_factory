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
  SCOPING = 'SCOPING',
  CONTRACT = 'CONTRACT',
  ADMITTED = 'ADMITTED',
  IDEA = 'IDEA',
  MVP = 'MVP',
  GROWTH = 'GROWTH',
}

export enum ProductStage {
  CONCEPT = 'concept',
  DEVELOPMENT = 'development',
  BETA = 'beta',
  LIVE = 'live',
}

export enum MarketingCampaignStatus {
  PLANNED = 'planned',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  PAUSED = 'paused',
}

export enum MarketingContentStatus {
  PLANNED = 'planned',
  PUBLISHED = 'published',
  CANCELLED = 'cancelled',
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
  BUSINESS = 'business',
  DASHBOARD = 'Dashboard', // UI specific Scope
  WORKSPACE = 'Workspace', // UI specific Scope
  TEAM = 'Team', // UI specific Scope
  SETTINGS = 'Settings', // UI specific Scope
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

export interface User {
  id: number;
  firebase_uid?: string;
  email: string;
  phone_number?: string;
  mobile?: string;
  email_verified: boolean;
  phone_verified: boolean;
  full_name: string;
  is_verified: boolean;
  role: UserRole;
  created_at: string;
  startup_id?: number;
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
  growth_potential: Record<string, any>;
  competitor_analysis: Record<string, any>;
  risk_analysis: Record<string, any>;
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

export interface ProductBusinessDetails {
  product_business_id: number;
  product_id: number;
  pricing_model?: string;
  target_customer?: string;
  revenue_streams?: string;
  distribution_channels?: string;
  cost_structure?: string;
  created_at: string;
  updated_at: string;
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

export interface MarketingOverview {
  marketing_id: number;
  startup_id: number;
  positioning_statement?: string;
}

export interface Investor {
  investor_id: number;
  name: string;
  firm_name?: string;
  type: 'Angel' | 'VC' | 'Fund' | 'Accelerator';
  email?: string;
  website?: string;
  notes?: string;
  created_at?: string;
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
  round_type: 'Pre-Seed' | 'Seed' | 'Series A';
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
  channel?: string;
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

export interface Startup {
  id: number;
  user_id: number;
  submission_id: number;
  name: string;
  slug: string;
  status: StartupStatus;
  current_stage: StartupStage;
  next_milestone: string;
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
  marketing_overview?: MarketingOverview;
  business_overview?: BusinessOverview;
  fundraise_details?: Fundraise;
  scope_document?: ScopeDocument;
  contract?: Contract;
  activity?: ActivityLog[];
  notifications?: DashboardNotification[];
}

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