
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

export interface Contract {
    id: number;
    startupId: number;
    documentUrl: string;
    status: ContractStatus;
    sentAt?: string;
    signedAt?: string;
}

export interface Comment {
  id: number;
  author: 'Admin' | 'Founder';
  text: string;
  createdAt: string;
}

export interface ScopeOfEngagement {
  id: number;
  startupId: number;
  productScope: string;
  gtmScope: string;
  status: ScopeStatus;
  comments: Comment[];
}

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
  mobile?: string;
}

export interface Submission {
  id: number;
  userId: number;
  startupName: string;
  problemStatement: string;
  productServiceIdea: string;
  status: SubmissionStatus;
  submittedAt: string;
}

export interface Evaluation {
  id: number;
  submissionId: number;
  problemAnalysis: Record<string, any>;
  solutionAnalysis: Record<string, any>;
  marketAnalysis: Record<string, any>;
  growthAnalysis: Record<string, any>;
  competitorAnalysis: Record<string, any>;
  risksAnalysis: Record<string, any>;
  overallScore: number;
  finalDecision: string;
  overallSummary: string;
  createdAt: string;
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
  currentStage: StartupStage;
  nextMilestone: string;
  createdAt: string;
  updatedAt: string;
  submission: Submission;
  evaluation: Evaluation;
  founders: Founder[];
  products: Product[];
  monthlyData: BusinessMonthlyData[];
  fundingRounds: FundingRound[];
  marketingCampaigns: MarketingCampaign[];
  tasks: Task[];
  experiments: Experiment[];
  artifacts: Artifact[];
  scopeOfEngagement?: ScopeOfEngagement;
  contract?: Contract;
}