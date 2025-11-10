/**
 * @file data.ts
 * @description This file contains mock data for the entire application.
 * In a production environment, this static `startupData` object would be replaced by
 * API calls to a live backend to fetch and update data dynamically.
 * It is structured according to the interfaces defined in `types.ts`.
 */

import { Startup, StartupStatus, StartupStage, User, UserRole, Founder, Product, ProductStage, Feature, ProductMetric, ProductIssue, ProductBusinessDetails, Task, TaskStatus, Scope, Experiment, ExperimentStatus, Artifact, ArtifactType, BusinessOverview, BusinessMonthlyData, FundraiseDetails, NextFundingGoal, FundingRound, RoundInvestor, Investor, MarketingOverview, MarketingCampaign, MarketingCampaignStatus, MarketingContentStatus, LinkedEntityType } from './types';

export const startupData: Startup = {
  id: 1,
  user_id: 1,
  submission_id: 1,
  name: "StartupOS",
  slug: "startupos",
  status: StartupStatus.ACTIVE,
  overall_progress: 75,
  current_stage: StartupStage.SEED,
  next_milestone: "Reach $20k MRR",
  created_at: "2023-01-15T09:00:00Z",
  updated_at: "2024-07-28T10:00:00Z",

  user: {
    id: 1,
    full_name: 'Alex Johnson',
    email: 'alex.j@startupos.com',
    role: UserRole.USER,
  },

  founders: [
    { id: 1, startup_id: 1, name: 'Alex Johnson', role: 'CEO & Co-Founder', email: 'alex.j@startupos.com', linkedin_link: 'https://linkedin.com/in/alexj' },
    { id: 2, startup_id: 1, name: 'Maria Garcia', role: 'CTO & Co-Founder', email: 'maria.g@startupos.com', linkedin_link: 'https://linkedin.com/in/mariag' },
  ],

  products: [
    {
      id: 1,
      startup_id: 1,
      name: 'SaaS Platform',
      description: 'A multi-tenant SaaS platform for project management.',
      stage: ProductStage.LAUNCHED,
      version: '1.2.0',
      targeted_launch_date: '2023-09-01',
      actual_launch_date: '2023-10-01',
      customer_segment: 'Small to medium-sized tech companies',
      unique_value_prop: 'The only project management tool with integrated fundraising CRM.',
      tech_stack: { frontend: 'React', backend: 'Node.js', database: 'PostgreSQL' },
      features: [
        { id: 1, product_id: 1, name: 'User Authentication', description: 'Secure login with email and social providers.', acceptance_criteria: 'User can sign up, log in, log out.' },
        { id: 2, product_id: 1, name: 'Task Management Board', description: 'Kanban-style board for tasks.', acceptance_criteria: 'User can create tasks, drag/drop between columns.' },
      ],
      metrics: [
        { metric_id: 1, product_id: 1, metric_name: 'Monthly Active Users', value: 1250, unit: 'users', period: 'monthly', date_recorded: '2024-07-01', created_at: '2024-07-01T00:00:00Z' },
        { metric_id: 2, product_id: 1, metric_name: 'User Churn Rate', value: 2.5, unit: '%', period: 'monthly', date_recorded: '2024-07-01', created_at: '2024-07-01T00:00:00Z' },
      ],
      issues: [
        { issue_id: 1, product_id: 1, title: 'Page load time slow on dashboard', description: 'The main dashboard takes >3s to load.', severity: 'High', status: 'In Progress', created_by: 2, created_at: '2024-07-25T14:00:00Z' },
      ],
      business_details: {
        product_business_id: 1, product_id: 1, pricing_model: 'Subscription-based tiers (Free, Pro, Enterprise)', target_customer: 'SMBs', revenue_streams: 'Monthly/Annual Subscriptions', distribution_channels: 'Direct Sales, Content Marketing', cost_structure: 'Server hosting, salaries', created_at: '2023-05-01T00:00:00Z', updated_at: '2024-06-01T00:00:00Z'
      }
    },
    {
      id: 2,
      startup_id: 1,
      name: 'Mobile App',
      description: 'Companion mobile app for iOS and Android.',
      stage: ProductStage.BETA,
      version: '0.8.5',
      targeted_launch_date: '2024-09-01',
      customer_segment: 'Existing users of the SaaS platform',
      unique_value_prop: 'Manage your projects on the go.',
      tech_stack: { mobile: 'React Native' },
      features: [], metrics: [], issues: [],
      business_details: {
        product_business_id: 2, product_id: 2, pricing_model: 'Free for all paying SaaS customers', target_customer: 'Users on the move', revenue_streams: 'N/A (Value-add)', distribution_channels: 'App Store, Play Store', cost_structure: 'Development costs', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z'
      }
    },
  ],

  tasks: [
    { id: 1, startup_id: 1, scope: Scope.PRODUCT, name: 'Develop login feature', description: 'Implement email/password login.', status: TaskStatus.IN_PROGRESS, due_date: '2024-08-15', linked_to_id: 1, linked_to_type: 'Product', created_at: '2024-07-10T00:00:00Z' },
    { id: 2, startup_id: 1, scope: Scope.FUNDRAISING, name: 'Finalize pitch deck', description: 'Update stats for Seed round.', status: TaskStatus.COMPLETED, due_date: '2024-07-20', linked_to_id: 1, linked_to_type: 'FundingRound', created_at: '2024-07-01T00:00:00Z' },
    { id: 3, startup_id: 1, scope: Scope.MARKETING, name: 'Launch social media campaign', description: 'Target audience on LinkedIn and Twitter.', status: TaskStatus.PENDING, due_date: '2024-08-01', linked_to_id: 1, linked_to_type: 'MarketingCampaign', created_at: '2024-07-15T00:00:00Z' },
    { id: 4, startup_id: 1, scope: Scope.GENERAL, name: 'Onboard new engineer', description: 'Setup dev environment and walkthrough codebase.', status: TaskStatus.PENDING, due_date: '2024-07-30', created_at: '2024-07-20T00:00:00Z' },
    { id: 5, startup_id: 1, scope: Scope.MARKETING, name: 'Write Blog Post for Launch', description: 'Draft and edit blog post announcing new features.', status: TaskStatus.IN_PROGRESS, due_date: '2024-08-10', linked_to_id: 3, linked_to_type: 'MarketingCampaign', created_at: '2024-08-02T00:00:00Z' },
  ],

  experiments: [
    { id: 1, startup_id: 1, scope: Scope.MARKETING, name: 'A/B Test Landing Page CTA', description: 'Test two versions of the Call To Action button on the main landing page.', assumption: 'A red button will convert 15% better than a blue button.', validation_method: 'Google Optimize', status: ExperimentStatus.RUNNING, linked_to_id: 1, linked_to_type: 'MarketingCampaign', created_at: '2024-07-18T00:00:00Z' },
    { id: 2, startup_id: 1, scope: Scope.PRODUCT, name: 'Test new pricing model', description: 'Offer a 14-day free trial to a segment of new users.', assumption: 'A tiered pricing will increase MRR by 20%.', validation_method: 'Analyze conversion rates and MRR for the test cohort after 30 days.', status: ExperimentStatus.PLANNED, linked_to_id: 1, linked_to_type: 'Product', created_at: '2024-07-22T00:00:00Z' },
  ],

  artifacts: [
    { id: 1, startup_id: 1, scope: Scope.FUNDRAISING, name: 'Seed Pitch Deck v3', description: 'Final version for the current seed round.', type: ArtifactType.FILE, location: '/path/to/deck.pdf', linked_to_id: 1, linked_to_type: 'FundingRound', created_at: '2024-07-19T00:00:00Z' },
    { id: 2, startup_id: 1, scope: Scope.FUNDRAISING, name: 'Q3 Financial Model', description: 'Excel sheet with financial projections.', type: ArtifactType.FILE, location: '/path/to/model.xlsx', linked_to_id: 1, linked_to_type: 'FundingRound', created_at: '2024-07-19T00:00:00Z' },
    { id: 3, startup_id: 1, scope: Scope.PRODUCT, name: 'Mobile App Wireframes', description: 'Figma link to the latest wireframes.', type: ArtifactType.LINK, location: 'https://www.figma.com/file/xyz', linked_to_id: 2, linked_to_type: 'Product', created_at: '2024-06-15T00:00:00Z' },
    { id: 4, startup_id: 1, scope: Scope.MARKETING, name: 'Final Ad Copy', description: 'Approved ad copy for Q3 Social Push', type: ArtifactType.TEXT, location: 'Grow your startup with StartupOS...', linked_to_id: 1, linked_to_type: 'MarketingCampaign', created_at: '2024-07-20T00:00:00Z' },
  ],

  business_overview: {
    business_id: 1, startup_id: 1, business_model: 'B2B SaaS', key_partners: 'Stripe, AWS', notes: 'Focus on product-led growth.', created_at: '2023-02-01T00:00:00Z', updated_at: '2024-05-20T00:00:00Z'
  },

  business_monthly_data: [
    { record_id: 1, startup_id: 1, month_start: '2024-04-01', total_revenue: 8250, total_expenses: 23250, net_burn: -15000, cash_in_bank: 180000, mrr: 8000, churn_rate: 3.1, new_customers: 20, total_customers: 80, key_highlights: 'Landed first enterprise client.', key_challenges: 'High CAC.', next_focus: 'Content marketing.', created_by: 1, created_at: '2024-05-02T00:00:00Z' },
    { record_id: 2, startup_id: 1, month_start: '2024-05-01', total_revenue: 10500, total_expenses: 24500, net_burn: -14000, cash_in_bank: 166000, mrr: 10000, churn_rate: 2.8, new_customers: 22, total_customers: 102, key_highlights: 'Successful feature launch.', key_challenges: 'Hiring.', next_focus: 'Mobile app beta.', created_by: 1, created_at: '2024-06-03T00:00:00Z' },
    { record_id: 3, startup_id: 1, month_start: '2024-06-01', total_revenue: 13000, total_expenses: 25000, net_burn: -12000, cash_in_bank: 154000, mrr: 12500, churn_rate: 2.5, new_customers: 23, total_customers: 125, key_highlights: 'Crossed 100 customer mark.', key_challenges: 'Scaling infrastructure.', next_focus: 'Seed round prep.', created_by: 1, created_at: '2024-07-01T00:00:00Z' },
    { record_id: 4, startup_id: 1, month_start: '2024-07-01', total_revenue: 16000, total_expenses: 27000, net_burn: -11000, cash_in_bank: 143000, mrr: 15000, churn_rate: 2.2, new_customers: 25, total_customers: 150, key_highlights: 'Positive feedback from early investors.', key_challenges: 'Balancing new features vs. tech debt.', next_focus: 'Close seed round.', created_by: 1, created_at: '2024-08-01T00:00:00Z' },
  ],

  fundraise_details: {
    id: 1, startup_id: 1, funding_stage: 'Seed', amount_raised: 250000,
    next_funding_goals: {
      id: 1, fundraise_id: 1, target_amount: 1000000, target_valuation: 8000000, target_close_date: '2024-09-30'
    }
  },

  funding_rounds: [
    { round_id: 1, startup_id: 1, round_type: 'Seed', status: 'In Progress', target_amount: 1000000, amount_raised: 250000, valuation_pre: 7000000, valuation_post: 8000000, date_opened: '2024-07-01', lead_investor: 'VC Ventures', pitch_deck_url: 'https://docsend.com/view/xyz', created_at: '2024-06-20T00:00:00Z', round_investors: [
      { round_id: 1, investor_id: 1, amount_invested: 250000, ownership_percent: 3.1, committed_on: '2024-07-15' }
    ]},
    { round_id: 2, startup_id: 1, round_type: 'Pre-Seed', status: 'Closed', target_amount: 250000, amount_raised: 250000, valuation_pre: 1750000, valuation_post: 2000000, date_opened: '2023-07-01', date_closed: '2023-08-15', created_at: '2023-06-15T00:00:00Z', round_investors: [
      { round_id: 2, investor_id: 2, amount_invested: 50000, ownership_percent: 2.5, committed_on: '2023-07-20' }
    ]},
  ],

  investors: [
    { investor_id: 1, name: 'Jane Doe', firm_name: 'VC Ventures', type: 'VC', email: 'jane.doe@vcventures.com', created_at: '2024-06-10T00:00:00Z' },
    { investor_id: 2, name: 'John Smith', firm_name: 'Angel Investors Group', type: 'Angel', email: 'john.s@angelgroup.com', created_at: '2023-07-05T00:00:00Z' },
  ],

  marketing_overview: {
    marketing_id: 1, startup_id: 1, positioning_statement: 'The intelligent operating system for early-stage startups.'
  },
  
  marketing_campaigns: [
    { campaign_id: 1, startup_id: 1, scope: 'overall', campaign_name: 'Q3 Social Media Push', objective: 'Increase brand awareness and generate leads.', channel: 'LinkedIn, Twitter', start_date: '2024-07-01', spend: 2500, clicks: 12050, conversions: 450, status: MarketingCampaignStatus.ACTIVE, content_mode: false, created_by: 1, created_at: '2024-06-25T00:00:00Z' },
    { campaign_id: 2, startup_id: 1, scope: 'product', product_id: 1, campaign_name: 'Google Ads - Core Keywords', objective: 'Drive sign-ups for the SaaS platform.', channel: 'Google Ads', start_date: '2024-05-01', end_date: '2024-06-30', spend: 5000, clicks: 8800, conversions: 210, status: MarketingCampaignStatus.COMPLETED, content_mode: false, created_by: 1, created_at: '2024-04-28T00:00:00Z' },
    { 
      campaign_id: 3, 
      startup_id: 1, 
      scope: 'overall', 
      campaign_name: 'August 2024 Content Marketing Initiative', 
      objective: 'Establish thought leadership in the startup ecosystem.', 
      channel: 'Blog, Newsletter', 
      start_date: '2024-08-01', 
      end_date: '2024-08-31',
      spend: 1500, 
      status: MarketingCampaignStatus.PLANNED, 
      content_mode: true, 
      created_by: 1, 
      created_at: '2024-07-20T00:00:00Z',
      content_calendar: {
        calendar_id: 1,
        campaign_id: 3,
        title: 'August Content Plan',
        description: 'Focus on fundraising and product management topics.',
        start_date: '2024-08-01',
        end_date: '2024-08-31',
        owner_id: 1,
        created_at: '2024-07-20T00:00:00Z',
        content_items: [
          { content_id: 1, calendar_id: 1, title: 'How to Build Your First Pitch Deck', content_type: 'Blog Post', content_body: '...', channel: 'Blog', publish_date: '2024-08-05', status: MarketingContentStatus.DRAFT, created_by: 1, created_at: '2024-07-21T00:00:00Z' },
          { content_id: 2, calendar_id: 1, title: 'Top 5 Metrics for Pre-Seed Startups', content_type: 'Blog Post', content_body: '...', channel: 'Blog', publish_date: '2024-08-12', status: MarketingContentStatus.PLANNED, created_by: 1, created_at: '2024-07-21T00:00:00Z' },
          { content_id: 3, calendar_id: 1, title: 'Weekly Roundup Newsletter - August 16', content_type: 'Newsletter', content_body: '...', channel: 'Email', publish_date: '2024-08-16', status: MarketingContentStatus.PLANNED, created_by: 1, created_at: '2024-07-21T00:00:00Z' },
        ]
      }
    },
  ],
};