# StartupOS Dashboard

The StartupOS Dashboard is a comprehensive, single-page web application designed to be the central mission control for an early-stage startup. It provides a structured and integrated environment for founders and team members to manage the four key pillars of their business: Product, Business, Fundraising, and Marketing.

This application is built as a proof-of-concept using React, TypeScript, and Tailwind CSS, and it operates entirely on the frontend with a mock data layer, simulating a full-stack experience.

## Core Features

### 1. Unified Dashboard Overview
The landing page provides a high-level "mission control" view of the entire startup, featuring:
- **Key Performance Indicators (KPIs):** Real-time tracking of MRR, Net Burn, and Total Customers.
- **Business Performance Chart:** A visual representation of financial health over time.
- **Milestone Tracking:** Clear visibility of the next major company goal.
- **Quick Views:** Summaries of upcoming tasks, active experiments, and recent activities.

### 2. Product Management
A dedicated section for managing all aspects of the product development lifecycle.
- **Product Hub:** List and manage multiple products (e.g., SaaS Platform, Mobile App).
- **Detailed Product View:** A tabbed interface for each product, covering:
  - **Features:** A list of all product features and their descriptions.
  - **Metrics:** Track and log key product metrics (e.g., MAU, Churn Rate).
  - **Issues & Feedback:** A centralized log for bugs and user feedback.
  - **Business Details:** Define pricing models, target customers, and more.
- **Global Views:** Aggregated pages for all product metrics and issues across the company.

### 3. Business Intelligence
Tools for tracking financial health and reporting progress.
- **Financial Overview:** A chart-driven page showing trends in revenue, MRR, and burn.
- **Monthly Reporting:** A detailed log of historical monthly reports, allowing founders to track progress and generate investor updates.
- **Business Model Canvas:** A place to define and view the core business model, key partners, and strategy.

### 4. Fundraising Management
An integrated CRM and tracking system for fundraising activities.
- **Fundraising Overview:** A summary of the current funding stage, total capital raised, and goals for the next round.
- **Funding Rounds:** Track the progress of individual funding rounds (e.g., Pre-Seed, Seed) with progress bars and investor lists.
- **Investor CRM:** A simple, table-based CRM to manage all investor contacts.

### 5. Marketing Hub
A centralized place to plan, execute, and monitor marketing initiatives.
- **Marketing Overview:** An aggregate view of marketing KPIs like total spend, clicks, and conversions.
- **Campaign Management:** Create and manage distinct marketing campaigns.
- **Content Calendar:** For content-driven campaigns, a dedicated calendar view to track all content pieces (blog posts, newsletters, etc.) from planning to publication.

### 6. Central Workspace
A cross-functional area for operational items that span multiple pillars.
- **Kanban Task Board:** A board view for all tasks, categorized by status (Pending, In Progress, Completed).
- **Experiment Tracker:** A central repository to log, manage, and view results of business experiments.
- **Artifacts Repository:** A global library for all important files, links, and notes, from pitch decks to ad copy.

## Technical Architecture

The application is architected as a modern, single-page application using a component-based approach.

- **Framework:** React with TypeScript for type safety and scalability.
- **Styling:** Tailwind CSS for a utility-first, responsive design system. Custom brand colors are configured in `index.html`.
- **Charting:** Recharts for creating beautiful and interactive data visualizations.
- **Icons:** Lucide React for a clean and consistent icon set.
- **State Management:** State is managed locally within the root `App.tsx` component using `useState`. This simulates a centralized data store that would typically be handled by a more robust state management library (like Redux or Zustand) or a data-fetching library (like React Query).
- **Data Layer:** All application data is mocked in `data.ts`. The structure of this data conforms to the TypeScript interfaces defined in `types.ts`, which serve as the "data contract" that a real backend API would adhere to.

## File Structure

The project is organized into logical directories and files:

- `index.html`: The main HTML entry point. It includes the Tailwind CSS CDN, configuration, and the root div for the React app.
- `index.tsx`: The main TypeScript entry file that renders the `App` component into the DOM.
- `App.tsx`: The root React component. It acts as the central hub for state management, navigation logic ("routing"), and modal control. All data creation and manipulation handlers are located here.
- `types.ts`: The source of truth for all data structures in the application. It contains TypeScript `enum`s and `interface`s that mirror a potential database schema.
- `data.ts`: Contains the static mock data object (`startupData`) that powers the entire application.
- `components/`: Contains reusable UI components used across multiple pages (e.g., `Card.tsx`, `Sidebar.tsx`, various `Modal` components).
- `pages/`: Contains larger components that represent a full page or a major view within the application (e.g., `DashboardOverview.tsx`, `ProductListPage.tsx`).

This structure separates concerns, making the application easier to navigate, maintain, and scale.

