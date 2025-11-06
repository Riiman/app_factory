
import { Startup, User, Submission, Evaluation, UserRole, SubmissionStatus, StartupStatus, StartupStage, ProductStage, MarketingCampaignStatus, MarketingContentStatus, TaskStatus, ExperimentStatus, ArtifactType, Scope } from './types';

export const mockUsers: User[] = [
  { id: 101, email: 'alice@innovate.ai', fullName: 'Alice Johnson', role: UserRole.USER, createdAt: '2022-11-20T10:00:00Z', mobile: '555-0101' },
  { id: 102, email: 'carlos@greeneats.app', fullName: 'Carlos Rodriguez', role: UserRole.USER, createdAt: '2023-06-15T11:00:00Z' },
  { id: 103, email: 'sara@connectsphere.io', fullName: 'Sara Khan', role: UserRole.USER, createdAt: '2024-05-01T09:00:00Z', mobile: '555-0103' },
  { id: 104, email: 'mike@devtools.tech', fullName: 'Mike Chen', role: UserRole.USER, createdAt: '2024-06-10T14:00:00Z', mobile: '555-0104' },
];

export const mockSubmissions: Submission[] = [
    // Approved submissions already linked to startups
    {
      id: 1001,
      userId: 101,
      startupName: 'Innovate AI',
      problemStatement: 'Businesses struggle to analyze large datasets efficiently.',
      productServiceIdea: 'An AI-powered platform for automated data analysis and insights.',
      status: SubmissionStatus.APPROVED,
      submittedAt: '2022-12-01T10:00:00Z',
    },
    {
      id: 1002,
      userId: 102,
      startupName: 'GreenEats',
      problemStatement: 'High food waste from restaurants and consumers wanting sustainable options.',
      productServiceIdea: 'A mobile app connecting users with restaurants selling surplus food at a discount.',
      status: SubmissionStatus.APPROVED,
      submittedAt: '2023-07-01T12:00:00Z',
    },
    // New pending submissions
    {
      id: 1003,
      userId: 103,
      startupName: 'ConnectSphere',
      problemStatement: 'Remote teams feel disconnected and struggle with building strong social bonds.',
      productServiceIdea: 'A virtual reality social platform for remote team-building activities and casual interactions.',
      status: SubmissionStatus.PENDING,
      submittedAt: '2024-07-15T09:30:00Z',
    },
    {
      id: 1004,
      userId: 104,
      startupName: 'DevTools Pro',
      problemStatement: 'Developers waste time switching between multiple disjointed tools for coding, debugging, and deployment.',
      productServiceIdea: 'An integrated development environment (IDE) that unifies the entire development lifecycle with AI-powered assistance.',
      status: SubmissionStatus.PENDING,
      submittedAt: '2024-07-18T16:45:00Z',
    },
];

export const mockEvaluations: Evaluation[] = [
    // Evaluations for approved submissions
    {
      id: 2001,
      submissionId: 1001,
      problemAnalysis: { "Clarity": "High", "Magnitude": "Large", "Validation": "Strong market signals" },
      solutionAnalysis: { "Innovation": "High", "Feasibility": "Medium", "Scalability": "High" },
      marketAnalysis: { "Size (TAM)": "$20B", "Growth Rate": "15% YoY", "Accessibility": "Good" },
      growthAnalysis: { "Strategy": "PLG", "Channels": "Content, Direct Sales" },
      competitorAnalysis: { "Key Players": "Palantir, DataRobot", "Differentiation": "Ease of use" },
      risksAnalysis: { "Technical": "Model accuracy", "Market": "Incumbent adoption" },
      overallScore: 8.5,
      finalDecision: 'Approved',
      overallSummary: 'Strong team, clear vision, and a large addressable market. High potential for growth.',
      createdAt: '2022-12-15T11:00:00Z',
    },
    {
      id: 2002,
      submissionId: 1002,
      problemAnalysis: { "Clarity": "Excellent", "Urgency": "Medium", "Target Group": "Urban millennials" },
      solutionAnalysis: { "Simplicity": "High", "Network Effects": "Strong", "Monetization": "Commission-based" },
      marketAnalysis: { "Size (TAM)": "$5B (surplus food market)", "Competition": "Fragmented" },
      growthAnalysis: { "Strategy": "City-by-city rollout", "CAC": "Low (viral potential)" },
      competitorAnalysis: { "Direct": "Too Good To Go", "Indirect": "Grocery delivery apps" },
      risksAnalysis: { "Logistics": "High", "Regulatory": "Medium" },
      overallScore: 7.8,
      finalDecision: 'Approved',
      overallSummary: 'Excellent social impact angle with a viable business model. Execution will be key.',
      createdAt: '2023-07-15T13:00:00Z',
    },
    // Evaluations for new pending submissions
    {
      id: 2003,
      submissionId: 1003,
      problemAnalysis: { "Pain Point": "Isolation in remote work", "Frequency": "Daily", "Monetizable": "Yes (B2B)" },
      solutionAnalysis: { "Novelty": "High (VR approach)", "Technical Challenge": "High", "User Experience": "Critical" },
      marketAnalysis: { "Target": "Tech companies", "Market Size": "Growing rapidly" },
      growthAnalysis: { "Initial Traction": "Freemium model", "Long-term": "Enterprise subscriptions" },
      competitorAnalysis: { "Key Players": "Gather, Teamflow", "Differentiation": "Immersive 3D environment" },
      risksAnalysis: { "Adoption": "Requires VR hardware", "Churn": "Potential novelty wear-off" },
      overallScore: 8.1,
      finalDecision: 'Pending',
      overallSummary: 'Innovative use of VR technology to solve a pressing issue for remote work. Market timing is crucial, but the potential is significant. Technical feasibility needs further validation.',
      createdAt: '2024-07-16T10:00:00Z',
    },
    {
      id: 2004,
      submissionId: 1004,
      problemAnalysis: { "Problem": "Developer tool fragmentation", "Impact": "Reduced productivity" },
      solutionAnalysis: { "Value Prop": "All-in-one platform", "AI Integration": "Key feature" },
      marketAnalysis: { "Market": "Extremely crowded", "Target Niche": "AI/ML developers" },
      growthAnalysis: { "Go-to-Market": "Open-source core, pro features", "Community": "Essential for success" },
      competitorAnalysis: { "Giants": "Microsoft (VS Code), JetBrains", "Startups": "Cursor, Replit" },
      risksAnalysis: { "Competition": "Very High", "Execution": "Massive scope" },
      overallScore: 7.2,
      finalDecision: 'Pending',
      overallSummary: 'Highly competitive market, but the idea of a truly unified, AI-native IDE is compelling. The key challenge will be differentiating from established players like VS Code and JetBrains.',
      createdAt: '2024-07-19T11:20:00Z',
    },
];


export const mockStartups: Startup[] = [
  {
    id: 1,
    userId: 101,
    submissionId: 1001,
    name: 'Innovate AI',
    slug: 'innovate-ai',
    status: StartupStatus.ACTIVE,
    currentStage: StartupStage.GROWTH,
    nextMilestone: 'Reach $50k MRR',
    createdAt: '2023-01-15T09:00:00Z',
    updatedAt: '2024-07-20T14:30:00Z',
    submission: mockSubmissions.find(s => s.id === 1001)!,
    evaluation: mockEvaluations.find(e => e.submissionId === 1001)!,
    founders: [
        { id: 1, startupId: 1, name: 'Alice Johnson', role: 'CEO', email: 'alice@innovate.ai', mobile: '555-0101' },
        { id: 2, startupId: 1, name: 'Bob Williams', role: 'CTO', email: 'bob@innovate.ai', mobile: '555-0102' },
    ],
    products: [
      {
        id: 1,
        startupId: 1,
        name: 'InsightEngine SaaS',
        description: 'Automated data analytics platform for enterprise customers.',
        stage: ProductStage.LIVE,
        version: '2.1.0',
        features: [
          { id: 1, productId: 1, name: 'Real-time Dashboard', description: 'Visualize data streams as they happen.'},
          { id: 2, productId: 1, name: 'Predictive Analytics', description: 'Forecast future trends based on historical data.'},
        ],
        metrics: [
          { metricId: 1, productId: 1, metricName: 'MAU', value: 12500, unit: 'users', period: 'monthly', dateRecorded: '2024-06-30' },
          { metricId: 2, productId: 1, metricName: 'Churn Rate', value: 2.5, unit: '%', period: 'monthly', dateRecorded: '2024-06-30' },
        ],
        issues: [
            { issueId: 1, productId: 1, title: 'Dashboard slow to load with large datasets', description: 'Users report >10s load times for datasets over 1GB.', severity: 'High', status: 'In Progress', createdById: 101, createdAt: '2024-07-10T10:00:00Z' }
        ],
      },
    ],
    monthlyData: [
      { recordId: 1, startupId: 1, monthStart: '2024-04-01', totalRevenue: 25000, totalExpenses: 15000, netBurn: -10000, mrr: 24000, newCustomers: 5, totalCustomers: 85, keyHighlights: 'Launched new predictive analytics module.' },
      { recordId: 2, startupId: 1, monthStart: '2024-05-01', totalRevenue: 32000, totalExpenses: 16000, netBurn: -16000, mrr: 30000, newCustomers: 8, totalCustomers: 93, keyHighlights: 'Signed first enterprise client.' },
      { recordId: 3, startupId: 1, monthStart: '2024-06-01', totalRevenue: 40000, totalExpenses: 18000, netBurn: -22000, mrr: 38000, newCustomers: 12, totalCustomers: 105, keyHighlights: 'Reached $1M ARR milestone.' },
    ],
    fundingRounds: [
      {
        roundId: 1, startupId: 1, roundType: 'Seed', status: 'Closed', targetAmount: 500000, amountRaised: 750000, dateClosed: '2023-05-20',
        investors: [
            { investor: { investorId: 1, name: 'Jane Doe', type: 'Angel' }, amountInvested: 100000 },
            { investor: { investorId: 2, name: 'Tech Ventures', firmName: 'Tech Ventures LLC', type: 'VC' }, amountInvested: 650000 }
        ]
      },
    ],
    marketingCampaigns: [
        { campaignId: 1, startupId: 1, campaignName: 'Q3 Content Push', channel: 'Content Marketing', spend: 5000, clicks: 1200, conversions: 80, status: MarketingCampaignStatus.ACTIVE, contentItems: [
            { contentId: 1, title: 'The Future of AI in Business', contentType: 'Blog Post', channel: 'Company Blog', publishDate: '2024-07-15', status: MarketingContentStatus.PUBLISHED }
        ]}
    ],
    tasks: [
        { id: 1, startupId: 1, scope: Scope.PRODUCT, name: 'Finalize V3 feature spec', status: TaskStatus.IN_PROGRESS, dueDate: '2024-08-01' },
    ],
    experiments: [
        { id: 1, startupId: 1, scope: Scope.MARKETING, name: 'Test new ad copy on LinkedIn', assumption: 'A more direct CTA will increase CTR by 15%', status: ExperimentStatus.RUNNING }
    ],
    artifacts: [
        { id: 1, startupId: 1, scope: Scope.FUNDRAISING, name: 'Series A Pitch Deck', type: ArtifactType.LINK, location: 'https://deck.example.com/series-a' }
    ],
  },
  {
    id: 2,
    userId: 102,
    submissionId: 1002,
    name: 'GreenEats',
    slug: 'greeneats',
    status: StartupStatus.ACTIVE,
    currentStage: StartupStage.MVP,
    nextMilestone: 'Secure 10 restaurant partners',
    createdAt: '2023-08-10T11:00:00Z',
    updatedAt: '2024-07-18T10:00:00Z',
    submission: mockSubmissions.find(s => s.id === 1002)!,
    evaluation: mockEvaluations.find(e => e.submissionId === 1002)!,
    founders: [
        { id: 3, startupId: 2, name: 'Carlos Rodriguez', role: 'CEO', email: 'carlos@greeneats.app' },
    ],
    products: [
      {
        id: 2,
        startupId: 2,
        name: 'GreenEats Mobile App',
        description: 'Connecting users to restaurants with surplus food.',
        stage: ProductStage.BETA,
        version: '0.8.0',
        features: [
           { id: 3, productId: 2, name: 'Map View', description: 'Find nearby partner restaurants.'},
           { id: 4, productId: 2, name: 'In-app Payments', description: 'Securely purchase food bags.'},
        ],
        metrics: [
          { metricId: 3, productId: 2, metricName: 'Downloads', value: 5000, unit: 'users', period: 'total', dateRecorded: '2024-06-30' },
        ],
        issues: [],
      },
    ],
    monthlyData: [
      { recordId: 4, startupId: 2, monthStart: '2024-05-01', totalRevenue: 1200, totalExpenses: 8000, netBurn: 6800, mrr: 0, newCustomers: 800, totalCustomers: 1500, keyHighlights: 'Launched beta in first city.' },
      { recordId: 5, startupId: 2, monthStart: '2024-06-01', totalRevenue: 2500, totalExpenses: 8500, netBurn: 6000, mrr: 0, newCustomers: 1200, totalCustomers: 2700, keyHighlights: 'Onboarded 5 new restaurants.' },
    ],
    fundingRounds: [
      {
        roundId: 2, startupId: 2, roundType: 'Pre-Seed', status: 'In Progress', targetAmount: 250000, amountRaised: 100000, dateOpened: '2024-06-01',
        investors: [
            { investor: { investorId: 3, name: 'Impact Angels', type: 'Angel' }, amountInvested: 100000 },
        ]
      },
    ],
    marketingCampaigns: [],
    tasks: [
        { id: 2, startupId: 2, scope: Scope.BUSINESS, name: 'Finalize partnership agreements', status: TaskStatus.COMPLETED },
    ],
    experiments: [],
    artifacts: [
        { id: 2, startupId: 2, scope: Scope.FUNDRAISING, name: 'Pre-Seed Investor One-Pager', type: ArtifactType.FILE, location: '/docs/one-pager.pdf' }
    ],
  },
];