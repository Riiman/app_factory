
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export enum SubmissionStatus {
  PENDING = 'PENDING',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum StartupStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
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
  CONCEPT = 'CONCEPT',
  DEVELOPMENT = 'DEVELOPMENT',
  BETA = 'BETA',
  LIVE = 'LIVE',
}

export enum MarketingCampaignStatus {
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export enum MarketingContentStatus {
  PLANNED = 'PLANNED',
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export enum ExperimentStatus {
  PLANNED = 'PLANNED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
}

export enum ArtifactType {
  FILE = 'FILE',
  LINK = 'LINK',
  TEXT = 'TEXT',
}

export enum Scope {
  GENERAL = 'GENERAL',
  PRODUCT = 'PRODUCT',
  FUNDRAISING = 'FUNDRAISING',
  MARKETING = 'MARKETING',
  BUSINESS = 'BUSINESS',
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
  metricId: number;
  productId: number;
  metricName: string;
  value: number;
  targetValue?: number;
  unit: string;
  period: string;
  dateRecorded: string;
}

export interface ProductIssue {
  issueId: number;
  productId: number;
  title: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'In Progress' | 'Resolved';
  createdById: number;
  createdAt: string;
  resolvedAt?: string;
}

export interface Feature {
  id: number;
  productId: number;
  name: string;
  description: string;
}

export interface Product {
  id: number;
  startupId: number;
  name: string;
  description: string;
  stage: ProductStage;
  version: string;
  features: Feature[];
  metrics: ProductMetric[];
  issues: ProductIssue[];
}

export interface BusinessMonthlyData {
  recordId: number;
  startupId: number;
  monthStart: string;
  totalRevenue: number;
  totalExpenses: number;
  netBurn: number;
  mrr: number;
  newCustomers: number;
  totalCustomers: number;
  keyHighlights: string;
}

export interface Investor {
  investorId: number;
  name: string;
  firmName?: string;
  type: 'Angel' | 'VC' | 'Fund' | 'Accelerator';
  email?: string;
}

export interface RoundInvestor {
  investor: Investor;
  amountInvested: number;
}

export interface FundingRound {
  roundId: number;
  startupId: number;
  roundType: 'Pre-Seed' | 'Seed' | 'Series A';
  status: 'Planned' | 'In Progress' | 'Closed';
  targetAmount: number;
  amountRaised: number;
  dateOpened?: string;
  dateClosed?: string;
  investors: RoundInvestor[];
}

export interface MarketingContentItem {
  contentId: number;
  title: string;
  contentType: string;
  channel: string;
  publishDate: string;
  status: MarketingContentStatus;
}

export interface MarketingCampaign {
  campaignId: number;
  startupId: number;
  campaignName: string;
  channel: string;
  spend: number;
  clicks: number;
  conversions: number;
  status: MarketingCampaignStatus;
  contentItems: MarketingContentItem[];
}

export interface Task {
  id: number;
  startupId: number;
  scope: Scope;
  name: string;
  dueDate?: string;
  status: TaskStatus;
}

export interface Experiment {
  id: number;
  startupId: number;
  scope: Scope;
  name:string;
  assumption: string;
  status: ExperimentStatus;
}

export interface Artifact {
  id: number;
  startupId: number;
  scope: Scope;
  name: string;
  type: ArtifactType;
  location: string;
}

export interface Founder {
  id: number;
  startupId: number;
  name: string;
  role: string;
  email: string;
  mobile?: string;
}

export interface Startup {
  id: number;
  userId: number;
  submissionId: number;
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
  business_monthly_data: BusinessMonthlyData[];
  funding_rounds: FundingRound[];
  marketing_campaigns: MarketingCampaign[];
  tasks: Task[];
  experiments: Experiment[];
  artifacts: Artifact[];
  scope_document?: ScopeDocument;
  contract?: Contract;
}