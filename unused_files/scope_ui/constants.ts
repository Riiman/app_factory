
import { Role, User, ScopeDocument } from './types';

export const USERS: { [key: string]: User } = {
  CLIENT_USER: {
    id: 1,
    name: 'Alex Chen (Startup Founder)',
    role: Role.USER,
    avatar: 'https://i.pravatar.cc/150?u=alexchen',
  },
  PLATFORM_ADMIN: {
    id: 2,
    name: 'Brenda Lee (Platform Lead)',
    role: Role.ADMIN,
    avatar: 'https://i.pravatar.cc/150?u=brendalee',
  },
};

export const SCOPE_DOCUMENT_DATA: ScopeDocument = {
  title: 'Project Phoenix: Scope of Engagement',
  client: 'InnovateNext Startup',
  provider: 'AppForge Platform',
  date: 'October 26, 2023',
  version: '1.0 Final',
  sections: [
    {
      id: 'overview',
      title: '1. Project Overview & Goals',
      content: [
        'This document outlines the scope of work for the development and launch of the "InnovateNext" platform, a SaaS product for creative professionals.',
        'The primary goal is to build a Minimum Viable Product (MVP) to secure seed funding, followed by a strategic Go-To-Market (GTM) launch.',
        'AppForge Platform will provide end-to-end services from application design and development to GTM strategy formulation and execution support.'
      ],
      comments: [
        {
          id: 1,
          text: 'This looks good. Captures the high-level goals perfectly.',
          author: USERS.CLIENT_USER,
          timestamp: '2 days ago',
        },
        {
          id: 2,
          text: 'Agreed. We are aligned on the vision. We will ensure the MVP is robust enough for investor demos.',
          author: USERS.PLATFORM_ADMIN,
          timestamp: '2 days ago',
        }
      ],
    },
    {
      id: 'features',
      title: '2. Application Features (MVP)',
      content: [
        '**User Authentication:** Secure sign-up, login, and password reset functionality using OAuth 2.0 (Google, GitHub).',
        '**Project Dashboard:** A centralized view for users to manage their creative projects.',
        '**Collaborative Workspace:** Real-time text and asset collaboration using WebSockets.',
        '**Tiered Subscriptions:** Integration with Stripe for monthly and annual subscription plans (Free, Pro, Enterprise).',
      ],
      comments: [
         {
          id: 3,
          text: 'Can we also consider adding Apple login for OAuth? It could be important for our target audience.',
          author: USERS.CLIENT_USER,
          timestamp: '1 day ago',
        },
      ],
    },
    {
      id: 'tech_stack',
      title: '3. Technology Stack',
      content: [
        '**Frontend:** React 18+ with TypeScript, Tailwind CSS for styling, Zustand for state management.',
        '**Backend:** Node.js with Express.js/NestJS, PostgreSQL for the database, Prisma as ORM.',
        '**Real-time:** Socket.IO for WebSocket communication.',
        '**Infrastructure:** Docker for containerization, deployed on AWS (ECS, RDS, S3).',
        '**CI/CD:** GitHub Actions for automated testing and deployment pipelines.',
      ],
      comments: [],
    },
    {
      id: 'gtm',
      title: '4. Go-To-Market (GTM) Strategy',
      content: [
        '**Phase 1 (Pre-Launch):** Content marketing campaign focusing on creative professional blogs, and building a waitlist.',
        '**Phase 2 (Launch):** Product Hunt launch, targeted social media advertising (LinkedIn, Instagram), and influencer outreach.',
        '**Phase 3 (Post-Launch):** Community building on Discord/Slack, SEO optimization, and gathering user feedback for V2 features.',
      ],
      comments: [
         {
          id: 4,
          text: 'We have a preliminary list of influencers we can share with your team to kickstart the outreach.',
          author: USERS.PLATFORM_ADMIN,
          timestamp: '3 hours ago',
        },
      ],
    },
     {
      id: 'deliverables',
      title: '5. Key Deliverables & Timeline',
      content: [
        '**Week 1-2:** UI/UX Wireframing & Prototyping (Figma).',
        '**Week 3-8:** Core Application Development (MVP Features).',
        '**Week 9:** Internal QA & Bug Fixing.',
        '**Week 10:** Deployment to Staging & UAT with Client.',
        '**Week 11:** GTM Strategy Finalization.',
        '**Week 12:** Production Launch.',
      ],
      comments: [],
    }
  ],
};
