export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export enum SubmissionStatus {
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
}

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
}

export interface ScopeDocument {
  id: number;
  startup_id: number;
  title: string;
  version: string;
  status: ScopeStatus;
  content: string;
  comments: Comment[];
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  createdAt: string;
  mobile?: string;
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

export interface Feature {
  id: number;
  product_id: number;
  name: string;
  description: string;
}

export interface Product {
  id: number;
  startup_id: number;
  name: string;
  description: string;
  stage: ProductStage;
  version: string;
  features: Feature[];
  product_metrics: ProductMetric[];
  product_issues: ProductIssue[];
}

export interface BusinessMonthlyData {
  record_id: number;
  startup_id: number;
  month_start: string;
  total_revenue: number;
  total_expenses: number;
  net_burn: number;
  mrr: number;
  new_customers: number;
  total_customers: number;
  key_highlights: string;
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
  ownership_percent?: number; // Added missing field
  committed_on?: string; // Added missing field
}

export interface FundingRound {
  round_id: number;
  startup_id: number;
  round_type: 'Pre-Seed' | 'Seed' | 'Series A';
  status: 'Planned' | 'In Progress' | 'Closed';
  target_amount: number;
  amount_raised: number;
  valuation_pre?: number;
  lead_investor?: string;
  date_opened?: string;
  date_closed?: string;
  investors: RoundInvestor[];
}

export interface MarketingContentItem {
  content_id: number;
  title: string;
  content_type: string;
  channel: string;
  publish_date: string;
  status: MarketingContentStatus;
}

export interface MarketingContentCalendar {
  calendar_id: number;
  campaign_id: number;
  title: string;
  description?: string;
  owner_id: number;
  start_date?: string;
  end_date?: string;
  content_items: MarketingContentItem[];
}

export interface MarketingCampaign {
  campaign_id: number;
  startup_id: number;
  campaign_name: string;
  channel: string;
  spend?: number; // Made optional as it might not always be present
  clicks?: number; // Made optional
  conversions?: number; // Made optional
  status: MarketingCampaignStatus;
  content_mode: boolean; // Added content_mode to the type
  content_calendars?: MarketingContentCalendar[]; // Changed from content_items to content_calendars
}

export interface Task {
  id: number;
  startup_id: number;
  scope: Scope;
  name: string;
  due_date?: string;
  status: TaskStatus;
}

export interface Experiment {
  id: number;
  startup_id: number;
  scope: Scope;
  name:string;
  assumption: string;
  status: ExperimentStatus;
}

export interface Artifact {
  id: number;
  startup_id: number;
  scope: Scope;
  name: string;
  type: ArtifactType;
  location: string;
}

export interface Founder {
  id: number;
  startup_id: number;
  name: string;
  role: string;
  email: string;
  phone_number?: string;
  linkedin_link?: string;
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
  submission: Submission;
  founders: Founder[];
  products: Product[];
  monthly_data: BusinessMonthlyData[];
  funding_rounds: FundingRound[];
  marketing_campaigns: MarketingCampaign[];
  tasks: Task[];
  experiments: Experiment[];
  artifacts: Artifact[];
  scope_document?: ScopeDocument;
  contract?: Contract;
}