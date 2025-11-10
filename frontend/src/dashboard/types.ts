/**
 * @file types.ts
 * @description This file contains all TypeScript types, interfaces, and enums for the application.
 * These are based on the database schema and serve as the data contract between the frontend and a potential backend.
 */

// ENUMS based on the database schema

/** Represents the roles a user can have within the system. */
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

/** Represents the status of a startup's initial submission. */
export enum SubmissionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/** Represents the overall status of a startup within the platform. */
export enum StartupStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  GRADUATED = 'GRADUATED',
}

/** Represents the current lifecycle stage of a startup. */
export enum StartupStage {
  EVALUATION = 'EVALUATION',
  PRE_SEED = 'PRE_SEED',
  SEED = 'SEED',
  SERIES_A = 'SERIES_A',
}

/** Represents the development stage of a product. */
export enum ProductStage {
  CONCEPT = 'CONCEPT',
  DEVELOPMENT = 'DEVELOPMENT',
  BETA = 'BETA',
  LAUNCHED = 'LAUNCHED',
}

/** Represents the status of a task. */
export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

/** Represents the status of an experiment. */
export enum ExperimentStatus {
  PLANNED = 'PLANNED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
}

/** Represents the type of an artifact (e.g., a file, a link, or raw text). */
export enum ArtifactType {
  FILE = 'FILE',
  LINK = 'LINK',
  TEXT = 'TEXT',
}

/** Represents the status of a marketing campaign. */
export enum MarketingCampaignStatus {
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED',
}

/** Represents the status of a piece of marketing content. */
export enum MarketingContentStatus {
  PLANNED = 'PLANNED',
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

/**
 * Represents the different pillars or scopes within the startup.
 * Also includes UI-specific scopes for navigation purposes.
 */
export enum Scope {
  GENERAL = 'GENERAL',
  PRODUCT = 'PRODUCT',
  BUSINESS = 'BUSINESS',
  FUNDRAISING = 'FUNDRAISING',
  MARKETING = 'MARKETING',
  DASHBOARD = 'Dashboard', // UI specific Scope
  WORKSPACE = 'Workspace', // UI specific Scope
  TEAM = 'Team', // UI specific Scope
  SETTINGS = 'Settings', // UI specific Scope
}

/** A type representing the possible entities that Tasks, Experiments, or Artifacts can be linked to. */
export type LinkedEntityType = 'Product' | 'FundingRound' | 'MarketingCampaign';


// INTERFACES based on database tables

/**
 * @interface User
 * @description Represents the currently authenticated user. Maps to the `users` table.
 */
export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
}

/**
 * @interface Startup
 * @description The central data model for the entire application, representing a single startup.
 * It contains all other nested data models like products, tasks, etc. Maps to the `startups` table.
 * The backend should return this entire object structure when fetching the main startup data.
 */
export interface Startup {
  id: number;
  user_id: number;
  submission_id: number;
  name: string;
  slug: string;
  status: StartupStatus;
  overall_progress: number;
  current_stage: StartupStage;
  next_milestone: string;
  recent_activity?: any; 
  created_at: string;
  updated_at: string;

  // Nested data models
  user: User;
  founders: Founder[];
  products: Product[];
  tasks: Task[];
  experiments: Experiment[];
  artifacts: Artifact[];
  business_overview: BusinessOverview;
  business_monthly_data: BusinessMonthlyData[];
  fundraise_details: FundraiseDetails;
  funding_rounds: FundingRound[];
  investors: Investor[];
  marketing_overview: MarketingOverview;
  marketing_campaigns: MarketingCampaign[];
}

/**
 * @interface Product
 * @description Represents a single product developed by the startup. Maps to the `products` table.
 */
export interface Product {
  id: number;
  startup_id: number;
  name: string;
  description: string;
  stage: ProductStage;
  version: string;
  targeted_launch_date: string;
  actual_launch_date?: string;
  customer_segment: string;
  unique_value_prop: string;
  tech_stack: any; // JSON
  // Nested relational data
  features: Feature[];
  metrics: ProductMetric[];
  issues: ProductIssue[];
  business_details: ProductBusinessDetails;
}

/**
 * @interface Feature
 * @description Represents a specific feature of a product. Maps to the `features` table.
 */
export interface Feature {
  id: number;
  product_id: number;
  name: string;
  description: string;
  acceptance_criteria: string;
}

/**
 * @interface ProductMetric
 * @description Represents a single recorded metric for a product (e.g., MAU, Churn). Maps to the `product_metrics` table.
 */
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

/**
 * @interface ProductIssue
 * @description Represents a reported issue or piece of feedback for a product. Maps to the `product_issues` table.
 */
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

/**
 * @interface BusinessOverview
 * @description Represents the high-level business model and strategy for the startup. Maps to the `business_overview` table.
 */
export interface BusinessOverview {
  business_id: number;
  startup_id: number;
  business_model: string;
  key_partners: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

/**
 * @interface ProductBusinessDetails
 * @description Contains business-specific details for a single product. Maps to the `product_business_details` table.
 */
export interface ProductBusinessDetails {
  product_business_id: number;
  product_id: number;
  pricing_model: string;
  target_customer: string;
  revenue_streams: string;
  distribution_channels: string;
  cost_structure: string;
  created_at: string;
  updated_at: string;
}

/**
 * @interface BusinessMonthlyData
 * @description A record of key business and financial metrics for a specific month. Maps to the `business_monthly_data` table.
 */
export interface BusinessMonthlyData {
  record_id: number;
  startup_id: number;
  month_start: string;
  total_revenue: number;
  total_expenses: number;
  net_burn: number;
  cash_in_bank: number;
  mrr: number;
  churn_rate: number;
  new_customers: number;
  total_customers: number;
  key_highlights: string;
  key_challenges: string;
  next_focus: string;
  created_by: number;
  created_at: string;
}

/**
 * @interface FundraiseDetails
 * @description High-level details about the startup's fundraising status. Maps to the `fundraise_details` table.
 */
export interface FundraiseDetails {
  id: number;
  startup_id: number;
  funding_stage: string;
  amount_raised: number;
  // Nested relational data from `next_funding_goals` table.
  next_funding_goals: NextFundingGoal;
}

/**
 * @interface NextFundingGoal
 * @description Specific goals for the startup's next funding round. Maps to the `next_funding_goals` table.
 */
export interface NextFundingGoal {
  id: number;
  fundraise_id: number;
  target_amount: number;
  target_valuation: number;
  target_close_date: string;
}

/**
 * @interface FundingRound
 * @description Represents a single fundraising round (e.g., Seed, Series A). Maps to the `funding_rounds` table.
 */
export interface FundingRound {
  round_id: number;
  startup_id: number;
  round_type: string;
  status: 'Planned' | 'In Progress' | 'Closed';
  target_amount: number;
  amount_raised: number;
  valuation_pre: number;
  valuation_post: number;
  date_opened: string;
  date_closed?: string;
  lead_investor?: string;
  notes?: string;
  pitch_deck_url?: string;
  created_at: string;
  // Nested relational data from `round_investors` junction table.
  round_investors: RoundInvestor[];
}

/**
 * @interface Investor
 * @description Represents an investor or a firm in the CRM. Maps to the `investors` table.
 */
export interface Investor {
  investor_id: number;
  name: string;
  firm_name?: string;
  type: 'Angel' | 'VC' | 'Fund' | 'Accelerator';
  email?: string;
  website?: string;
  notes?: string;
  created_at: string;
}

/**
 * @interface RoundInvestor
 * @description A junction table entry linking an Investor to a FundingRound. Maps to the `round_investors` table.
 */
export interface RoundInvestor {
  round_id: number;
  investor_id: number;
  amount_invested: number;
  ownership_percent: number;
  committed_on: string;
}

/**
 * @interface MarketingOverview
 * @description High-level marketing information for the startup. Maps to the `marketing_overview` table.
 */
export interface MarketingOverview {
  marketing_id: number;
  startup_id: number;
  positioning_statement: string;
}

/**
 * @interface MarketingCampaign
 * @description Represents a single marketing campaign. Maps to the `marketing_campaigns` table.
 */
export interface MarketingCampaign {
  campaign_id: number;
  startup_id: number;
  scope: string;
  product_id?: number;
  campaign_name: string;
  objective: string;
  channel: string;
  start_date: string;
  end_date?: string;
  spend: number;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  status: MarketingCampaignStatus;
  notes?: string;
  content_mode: boolean;
  created_by: number;
  created_at: string;
  content_calendar?: MarketingContentCalendar; // Optional nested calendar
}

/**
 * @interface MarketingContentCalendar
 * @description A calendar of content items for a content-driven marketing campaign. Maps to the `marketing_content_calendar` table.
 */
export interface MarketingContentCalendar {
  calendar_id: number;
  campaign_id: number;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  owner_id: number;
  created_at: string;
  // Nested relational data from `marketing_content_items` table.
  content_items: MarketingContentItem[];
}

/**
 * @interface MarketingContentItem
 * @description A single piece of content within a content calendar (e.g., a blog post, tweet). Maps to the `marketing_content_items` table.
 */
export interface MarketingContentItem {
  content_id: number;
  calendar_id: number;
  title: string;
  content_type: string;
  content_body: string;
  channel: string;
  publish_date: string;
  status: MarketingContentStatus;
  performance?: any; // JSON
  created_by: number;
  created_at: string;
}

/**
 * @interface Task
 * @description A polymorphic task that can be linked to various other entities or be general. Maps to the `tasks` table.
 */
export interface Task {
  id: number;
  startup_id: number;
  scope: Scope;
  name: string;
  description: string;
  due_date?: string;
  status: TaskStatus;
  linked_to_id?: number;
  linked_to_type?: LinkedEntityType;
  created_at: string;
}

/**
 * @interface Experiment
 * @description A polymorphic experiment that can be linked to various other entities or be general. Maps to the `experiments` table.
 */
export interface Experiment {
  id: number;
  startup_id: number;
  scope: Scope;
  name: string;
  description: string;
  assumption: string;
  validation_method: string;
  result?: string;
  status: ExperimentStatus;
  linked_to_id?: number;
  linked_to_type?: LinkedEntityType;
  created_at: string;
}

/**
 * @interface Artifact
 * @description A polymorphic artifact (file, link, text) that can be linked to various other entities. Maps to the `artifacts` table.
 */
export interface Artifact {
  id: number;
  startup_id: number;
  scope: Scope;
  name: string;
  description: string;
  type: ArtifactType;
  location: string;
  linked_to_id?: number;
  linked_to_type?: LinkedEntityType;
  created_at: string;
}

/**
 * @interface Founder
 * @description Represents a founder or key team member of the startup. Maps to the `founders` table.
 */
export interface Founder {
  id: number;
  startup_id: number;
  name: string;
  role: string;
  email: string;
  phone_number?: string;
  linkedin_link?: string;
}